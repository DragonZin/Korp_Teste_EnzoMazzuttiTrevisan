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

    public async Task<InvoiceResponse> UpsertInvoiceItemsAsync(Guid invoiceId, ManageInvoiceItemsRequest request)
    {
        ValidateManageItemsRequest(request);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == invoiceId)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        EnsureInvoiceIsOpen(invoice);

        var existingItems = await _context.InvoiceProducts
            .Where(p => p.InvoiceId == invoiceId)
            .ToListAsync();

        var existingItemsByProductId = existingItems.ToDictionary(p => p.ProductId);
        var requestByProductId = request.Products.ToDictionary(p => p.ProductId);
        var missingProductIds = requestByProductId.Keys
            .Where(productId => !existingItemsByProductId.ContainsKey(productId))
            .ToList();

        var productsById = await GetProductsByIdsAsync(missingProductIds);

        foreach (var itemRequest in request.Products)
        {
            if (existingItemsByProductId.TryGetValue(itemRequest.ProductId, out var existingItem))
            {
                existingItem.Quantity = itemRequest.Quantity;
                continue;
            }

            if (!productsById.TryGetValue(itemRequest.ProductId, out var product))
            {
                throw new NotFoundException($"Produto {itemRequest.ProductId} não encontrado.");
            }

            var newItem = new InvoiceProduct
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoiceId,
                ProductId = itemRequest.ProductId,
                UnitPrice = product.Price,
                Quantity = itemRequest.Quantity
            };

            _context.InvoiceProducts.Add(newItem);
            existingItems.Add(newItem);
            existingItemsByProductId[itemRequest.ProductId] = newItem;
        }

        invoice.TotalAmount = existingItems.Sum(p => p.TotalPrice);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return await _invoiceService.GetInvoiceByIdAsync(invoiceId);
    }

    public async Task RemoveInvoiceItemAsync(Guid invoiceId, Guid productId)
    {
        if (productId == Guid.Empty)
        {
            throw new ValidationException("ProductId é obrigatório.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == invoiceId)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        EnsureInvoiceIsOpen(invoice);

        var existingItems = await _context.InvoiceProducts
            .Where(p => p.InvoiceId == invoiceId)
            .ToListAsync();

        var itemToRemove = existingItems.FirstOrDefault(p => p.ProductId == productId)
            ?? throw new NotFoundException($"Item com produto {productId} não encontrado na nota fiscal.");

        _context.InvoiceProducts.Remove(itemToRemove);
        existingItems.Remove(itemToRemove);

        invoice.TotalAmount = existingItems.Sum(p => p.TotalPrice);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
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