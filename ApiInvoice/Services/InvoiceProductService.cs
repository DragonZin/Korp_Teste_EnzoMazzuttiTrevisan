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
        const int maxAttempts = 2;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Products)
                .FirstOrDefaultAsync(i => i.Id == invoiceId)
                ?? throw new NotFoundException("Nota fiscal não encontrada.");

            EnsureInvoiceIsOpen(invoice);

            var requestByProductId = request.Products.ToDictionary(p => p.ProductId);
            var idsToLoad = requestByProductId.Keys
                .Where(productId => invoice.Products.All(i => i.ProductId != productId) && requestByProductId[productId].Quantity > 0)
                .ToList();

            var productsById = await GetProductsByIdsAsync(idsToLoad);

            foreach (var itemRequest in request.Products)
            {
                var existingItem = invoice.Products.FirstOrDefault(p => p.ProductId == itemRequest.ProductId);

                if (itemRequest.Quantity == 0)
                {
                    if (existingItem is null)
                    {
                        throw new NotFoundException($"Item com produto {itemRequest.ProductId} não encontrado na nota fiscal.");
                    }

                    invoice.Products.Remove(existingItem);
                    continue;
                }

                if (existingItem is not null)
                {
                    existingItem.Quantity = itemRequest.Quantity;
                    continue;
                }

                if (!productsById.TryGetValue(itemRequest.ProductId, out var product))
                {
                    throw new NotFoundException($"Produto {itemRequest.ProductId} não encontrado.");
                }

                invoice.Products.Add(new InvoiceProduct
                {
                    Id = Guid.NewGuid(),
                    ProductId = itemRequest.ProductId,
                    ProductCode = product.Code,
                    ProductName = product.Name,
                    UnitPrice = product.Price,
                    Quantity = itemRequest.Quantity
                });
            }

            RecalculateInvoiceTotal(invoice);

            try
            {
                await _context.SaveChangesAsync();
                return await _invoiceService.GetInvoiceByIdAsync(invoice.Id);
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                _context.ChangeTracker.Clear();
            }
        }

        throw new ValidationException("A nota fiscal foi alterada por outro processo. Atualize os dados e tente novamente.");
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
        string Code,
        string Name,
        int Stock,
        decimal Price
    );
}