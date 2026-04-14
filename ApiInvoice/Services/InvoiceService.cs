using ApiInvoice.Enums;
using ApiInvoice.Contracts;
using ApiInvoice.Data;
using ApiInvoice.Exceptions;
using ApiInvoice.Interfaces;
using ApiInvoice.Models;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;

namespace ApiInvoice.Services;

public class InvoiceService : IInvoiceService
{
    private const int MaxPageSize = 100;
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory? _httpClientFactory;

    public InvoiceService(AppDbContext context, IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
    }

    public InvoiceService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResponse<InvoiceResponse>> GetInvoicesAsync(int page, int pageSize, int? number, InvoiceStatus? status)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize < 1 ? 10 : Math.Min(pageSize, MaxPageSize);

        var query = _context.Invoices
            .AsNoTracking()
            .Include(i => i.Products)
            .AsQueryable();

        if (number.HasValue)
        {
            query = query.Where(i => i.Number == number.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(i => i.Status == status.Value);
        }

        var totalProducts = await query.CountAsync();
        var totalPages = totalProducts == 0 ? 0 : (int)Math.Ceiling(totalProducts / (double)normalizedPageSize);

        var invoices = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToListAsync();

        return new PagedResponse<InvoiceResponse>(
            invoices.Select(MapResponse).ToList(),
            normalizedPage,
            normalizedPageSize,
            totalProducts,
            totalPages);
    }

    public async Task<InvoiceResponse> GetInvoiceByIdAsync(Guid id)
    {
        var invoice = await _context.Invoices
            .AsNoTracking()
            .Include(i => i.Products)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        return MapResponse(invoice);
    }
    public async Task<InvoiceResponse> CreateInvoiceAsync(CreateInvoiceRequest request)
    {
        ValidateCreateRequest(request);

        var nextInvoiceNumber = await GetNextInvoiceNumberAsync();

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            Number = nextInvoiceNumber,
            TotalAmount = 0,
            Status = InvoiceStatus.Open,
            CustomerName = request.CustomerName.Trim(),
            CustomerDocument = request.CustomerDocument.Trim(),
            Products = []
        };

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        return await GetInvoiceByIdAsync(invoice.Id);
    }

    public async Task<InvoiceResponse> UpdateInvoiceAsync(Guid id, UpdateInvoiceRequest request)
    {
        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        EnsureInvoiceIsOpen(invoice);
        ValidateUpdateRequest(request);

        if (request.CustomerName is not null)
        {
            invoice.CustomerName = request.CustomerName.Trim();
        }

        if (request.CustomerDocument is not null)
        {
            invoice.CustomerDocument = request.CustomerDocument.Trim();
        }

        await _context.SaveChangesAsync();
        return await GetInvoiceByIdAsync(invoice.Id);
    }

    public async Task<InvoiceResponse> ManageInvoiceItemsAsync(Guid id, ManageInvoiceItemsRequest request)
    {
        ValidateManageItemsRequest(request);
        const int maxAttempts = 2;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Products)
                .FirstOrDefaultAsync(i => i.Id == id)
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
                return await GetInvoiceByIdAsync(invoice.Id);
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                _context.ChangeTracker.Clear();
            }
        }

        throw new ValidationException("A nota fiscal foi alterada por outro processo. Atualize os dados e tente novamente.");
    }

    public async Task<InvoiceResponse> CloseInvoiceAsync(Guid id)
    {
        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        if (invoice.Status == InvoiceStatus.Closed)
        {
            throw new ValidationException("Nota fiscal já está fechada.");
        }

        invoice.Status = InvoiceStatus.Closed;
        invoice.ClosedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetInvoiceByIdAsync(invoice.Id);
    }

    public async Task DeleteInvoiceAsync(Guid id)
    {
        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");
        
        EnsureInvoiceIsOpen(invoice);

        _context.Invoices.Remove(invoice);
        await _context.SaveChangesAsync();
    }
    private async Task<Dictionary<Guid, ProductApiResponse>> GetProductsByIdsAsync(IReadOnlyCollection<Guid> productIds)
    {
        if (productIds.Count == 0)
        {
            return new Dictionary<Guid, ProductApiResponse>();
        }

        if (_httpClientFactory is null)
        {
            throw new InvalidOperationException("IHttpClientFactory não configurado para consultar produtos.");
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

    private static InvoiceResponse MapResponse(Invoice invoice)
    {
        return new InvoiceResponse(
            invoice.Id,
            invoice.Number,
            invoice.Status,
            invoice.TotalAmount,
            invoice.CustomerName,
            invoice.CustomerDocument,
            invoice.CreatedAt,
            invoice.ClosedAt,
            invoice.Products.Select(i => new InvoiceItemResponse(
                i.Id,
                i.ProductId,
                i.ProductCode,
                i.ProductName,
                i.UnitPrice,
                i.Quantity,
                i.TotalPrice
            )).ToList());
    }

    private static InvoiceProduct ToEntity(CreateInvoiceItemRequest item)
    {
        ValidateItem(item);

        return new InvoiceProduct
        {
            Id = Guid.NewGuid(),
            ProductId = item.ProductId,
            ProductCode = item.ProductCode.Trim(),
            ProductName = item.ProductName.Trim(),
            UnitPrice = item.UnitPrice,
            Quantity = item.Quantity
        };
    }

    private async Task<int> GetNextInvoiceNumberAsync()
    {
        const int firstInvoiceNumber = 1000;

        var currentMaxNumber = await _context.Invoices
            .AsNoTracking()
            .MaxAsync(i => (int?)i.Number);

        return currentMaxNumber.HasValue
            ? currentMaxNumber.Value + 1
            : firstInvoiceNumber;
    }

    private static void ValidateRequest(int number, IReadOnlyCollection<CreateInvoiceItemRequest> Products)
    {
        if (number <= 0)
        {
            throw new ValidationException("Número da nota fiscal deve ser maior que zero.");
        }

        if (Products.Count == 0)
        {
            throw new ValidationException("Informe ao menos um item na nota fiscal.");
        }

        foreach (var item in Products)
        {
            ValidateItem(item);
        }
    }

    private static void ValidateItem(CreateInvoiceItemRequest item)
    {
        if (item.ProductId == Guid.Empty)
        {
            throw new ValidationException("ProductId é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(item.ProductCode) || item.ProductCode.Trim().Length > 50)
        {
            throw new ValidationException("ProductCode é obrigatório e deve ter no máximo 50 caracteres.");
        }

        if (string.IsNullOrWhiteSpace(item.ProductName) || item.ProductName.Trim().Length > 255)
        {
            throw new ValidationException("ProductName é obrigatório e deve ter no máximo 255 caracteres.");
        }

        if (item.UnitPrice < 0)
        {
            throw new ValidationException("UnitPrice não pode ser negativo.");
        }

        if (item.Quantity <= 0)
        {
            throw new ValidationException("Quantity deve ser maior que zero.");
        }
    }

    private static void ValidateCreateRequest(CreateInvoiceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CustomerName) || request.CustomerName.Trim().Length > 255)
        {
            throw new ValidationException("CustomerName é obrigatório e deve ter no máximo 255 caracteres.");
        }

        if (string.IsNullOrWhiteSpace(request.CustomerDocument) || request.CustomerDocument.Trim().Length > 50)
        {
            throw new ValidationException("CustomerDocument é obrigatório e deve ter no máximo 50 caracteres.");
        }
    }

    private static void ValidateUpdateRequest(UpdateInvoiceRequest request)
    {
        var hasName = request.CustomerName is not null;
        var hasDocument = request.CustomerDocument is not null;

        if (!hasName && !hasDocument)
        {
            throw new ValidationException("Informe CustomerName e/ou CustomerDocument para atualização.");
        }

        if (hasName)
        {
            if (string.IsNullOrWhiteSpace(request.CustomerName) || request.CustomerName.Trim().Length > 255)
            {
                throw new ValidationException("CustomerName deve ter no máximo 255 caracteres.");
            }
        }

        if (hasDocument)
        {
            if (string.IsNullOrWhiteSpace(request.CustomerDocument) || request.CustomerDocument.Trim().Length > 50)
            {
                throw new ValidationException("CustomerDocument deve ter no máximo 50 caracteres.");
            }
        }
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