using ApiInvoice.Contracts;
using ApiInvoice.Data;
using ApiInvoice.Enums;
using ApiInvoice.Exceptions;
using ApiInvoice.Interfaces;
using ApiInvoice.Models;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;

namespace ApiInvoice.Services;

public class InvoiceProductService : IInvoiceProductService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IInvoiceService _invoiceService;

    public InvoiceProductService(AppDbContext context, IHttpClientFactory httpClientFactory, IInvoiceService invoiceService)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _invoiceService = invoiceService;
    }

    public async Task<InvoiceResponse> ManageInvoiceItemsAsync(Guid invoiceId, ManageInvoiceItemsRequest request)
    {
        ValidateManageItemsRequest(request);

        var invoice = await _context.Invoices
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == invoiceId)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        EnsureInvoiceIsOpen(invoice);

        var requestByProductId = request.Products.ToDictionary(p => p.ProductId);
        var existingItems = await _context.InvoiceProducts
            .AsNoTracking()
            .Where(p => p.InvoiceId == invoiceId)
            .ToDictionaryAsync(p => p.ProductId);

        var idsToLoad = requestByProductId.Keys
            .Where(productId => !existingItems.ContainsKey(productId) && requestByProductId[productId].Quantity > 0)
            .ToList();

        var productsById = await GetProductsByIdsAsync(idsToLoad);
        var newItems = new List<InvoiceProduct>();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        foreach (var itemRequest in request.Products)
        {
            var existsInInvoice = existingItems.TryGetValue(itemRequest.ProductId, out _);

            if (itemRequest.Quantity == 0)
            {
                if (!existsInInvoice)
                {
                    throw new NotFoundException($"Item com produto {itemRequest.ProductId} não encontrado na nota fiscal.");
                }

                await _context.InvoiceProducts
                    .Where(p => p.InvoiceId == invoiceId && p.ProductId == itemRequest.ProductId)
                    .ExecuteDeleteAsync();

                existingItems.Remove(itemRequest.ProductId);
                continue;
            }

            if (existsInInvoice)
            {
                await _context.InvoiceProducts
                    .Where(p => p.InvoiceId == invoiceId && p.ProductId == itemRequest.ProductId)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(p => p.Quantity, itemRequest.Quantity));

                continue;
            }

            if (!productsById.TryGetValue(itemRequest.ProductId, out var product))
            {
                throw new NotFoundException($"Produto {itemRequest.ProductId} não encontrado.");
            }

            newItems.Add(new InvoiceProduct
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoiceId,
                ProductId = itemRequest.ProductId,
                UnitPrice = product.Price,
                Quantity = itemRequest.Quantity
            });
        }

        if (newItems.Count > 0)
        {
            _context.InvoiceProducts.AddRange(newItems);
            await _context.SaveChangesAsync();
        }

        var updatedTotal = await _context.InvoiceProducts
            .Where(p => p.InvoiceId == invoiceId)
            .Select(p => p.Quantity * p.UnitPrice)
            .DefaultIfEmpty(0m)
            .SumAsync();

        await _context.Invoices
            .Where(i => i.Id == invoiceId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(i => i.TotalAmount, updatedTotal)
                .SetProperty(i => i.UpdatedAt, DateTime.UtcNow));

        await transaction.CommitAsync();

        return await _invoiceService.GetInvoiceByIdAsync(invoiceId);
    }

    private async Task<Dictionary<Guid, ProductApiResponse>> GetProductsByIdsAsync(IReadOnlyCollection<Guid> productIds)
    {
        if (productIds.Count == 0)
        {
            return new Dictionary<Guid, ProductApiResponse>();
        }

        var client = _httpClientFactory.CreateClient("ProductApi");
        var response = await client.PostAsJsonAsync("api/products/batch", new { Ids = productIds });

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            throw new NotFoundException("Um ou mais produtos não foram encontrados.");
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new ValidationException("Não foi possível consultar os produtos na API de produtos.");
        }

        var products = await response.Content.ReadFromJsonAsync<List<ProductApiResponse>>()
            ?? throw new ValidationException("Resposta inválida da API de produtos.");

        return products.ToDictionary(p => p.Id);
    }

    private static void RecalculateInvoiceTotal(Invoice invoice)
    {
        invoice.TotalAmount = invoice.Products.Sum(p => p.TotalPrice);
    }

    private static void ValidateManageItemsRequest(ManageInvoiceItemsRequest request)
    {
        if (request is null)
        {
            throw new ValidationException("O corpo da requisição é obrigatório.");
        }

        if (request.Products is null || request.Products.Count == 0)
        {
            throw new ValidationException("Informe ao menos um produto para gerenciar na nota fiscal.");
        }

        if (request.Products.GroupBy(p => p.ProductId).Any(g => g.Count() > 1))
        {
            throw new ValidationException("Não é permitido repetir o mesmo ProductId na mesma requisição.");
        }

        foreach (var item in request.Products)
        {
            if (item.ProductId == Guid.Empty)
            {
                throw new ValidationException("ProductId é obrigatório.");
            }

            if (item.Quantity < 0)
            {
                throw new ValidationException("Quantity não pode ser negativo.");
            }
        }
    }

    private static void EnsureInvoiceIsOpen(Invoice invoice)
    {
        if (invoice.Status == InvoiceStatus.Closed)
        {
            throw new ValidationException("Nota fiscal fechada não pode ser alterada.");
        }
    }

    private sealed record ProductApiResponse(
        Guid Id,
        int Stock,
        decimal Price
    );
}