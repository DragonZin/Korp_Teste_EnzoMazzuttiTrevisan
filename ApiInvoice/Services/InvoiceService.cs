using ApiInvoice.Enums;
using ApiInvoice.Contracts;
using ApiInvoice.Data;
using ApiInvoice.Exceptions;
using ApiInvoice.Interfaces;
using ApiInvoice.Models;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace ApiInvoice.Services;

public class InvoiceService : IInvoiceService
{
    private const int MaxPageSize = 100;
    private const string IdempotencyHeader = "Idempotency-Key";
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<InvoiceService> _logger;

    public InvoiceService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<InvoiceService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<PagedResponse<InvoiceResponse>> GetInvoicesAsync(int page, int pageSize, InvoiceStatus? status)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize < 1 ? 10 : Math.Min(pageSize, MaxPageSize);

        var query = _context.Invoices
            .AsNoTracking()
            .Include(i => i.Products)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(i => i.Status == status.Value);
        }

        var totalItems = await query.CountAsync();
        var totalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)normalizedPageSize);

        var invoices = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToListAsync();

        return new PagedResponse<InvoiceResponse>(
            invoices.Select(InvoiceMapper.ToResponse).ToList(),
            normalizedPage,
            normalizedPageSize,
            totalItems,
            totalPages);
    }

    public async Task<InvoiceResponse> GetInvoiceByIdAsync(Guid id)
    {
        var invoice = await _context.Invoices
            .AsNoTracking()
            .Include(i => i.Products)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        return InvoiceMapper.ToResponse(invoice);
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

    public async Task<InvoiceResponse> CloseInvoiceAsync(Guid id)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var invoice = await _context.Invoices
            .Include(i => i.Products)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        if (invoice.Status == InvoiceStatus.Closed)
        {
            throw new ValidationException("Nota fiscal já está fechada.");
        }

        if (invoice.Products.Count > 0)
        {
            var productIds = invoice.Products.Select(i => i.ProductId).Distinct().ToList();
            var productsById = await GetProductsByIdsAsync(productIds);
            var totalQuantitiesByProduct = invoice.Products
                .GroupBy(i => i.ProductId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));
            
            var appliedAdjustments = new List<(Guid ProductId, int StockDelta, int ReservedStockDelta)>();

            foreach (var productEntry in totalQuantitiesByProduct)
            {
                if (!productsById.TryGetValue(productEntry.Key, out var product))
                {
                    throw new NotFoundException($"Produto {productEntry.Key} não encontrado.");
                }

                if (product.IsDeleted)
                {
                    throw new ValidationException("Produto excluído não pode ser movimentado.");
                }

                if (product.ReservedStock < productEntry.Value || product.Stock + (-productEntry.Value) < 0)
                {
                    throw new ValidationException($"reserva/estoque insuficiente para o produto {productEntry.Key}.");
                }
            }

            try
            {
                foreach (var productEntry in totalQuantitiesByProduct)
                {
                    var stockDelta = -productEntry.Value;
                    var reservedStockDelta = -productEntry.Value;

                    await AdjustProductInventoryAsync(
                        productEntry.Key,
                        stockDelta: stockDelta,
                        reservedStockDelta: reservedStockDelta,
                        idempotencyKey: BuildInventoryAdjustmentIdempotencyKey(
                            id,
                            productEntry.Key,
                            stockDelta,
                            reservedStockDelta));

                    appliedAdjustments.Add((productEntry.Key, stockDelta, reservedStockDelta));
                }
            }
            catch (Exception)
            {
                var compensationFailures = await CompensateInventoryAdjustmentsAsync(id, appliedAdjustments);

                if (compensationFailures.Count > 0)
                {
                    throw new ValidationException(
                        $"Falha crítica ao compensar ajustes de estoque da nota {id}. " +
                        "Estado parcial inconsistente detectado; realize intervenção/reprocessamento antes de novas operações.");
                }

                throw new ValidationException("Não foi possível concluir o fechamento da nota fiscal. As baixas de estoque aplicadas foram compensadas.");
            }
        }

        invoice.TotalAmount = invoice.Products.Sum(p => p.TotalPrice);
        invoice.Status = InvoiceStatus.Closed;
        invoice.ClosedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return await GetInvoiceByIdAsync(id);
    }

    public async Task DeleteInvoiceAsync(Guid id)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var invoice = await _context.Invoices
            .Include(i => i.Products)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        EnsureInvoiceIsOpen(invoice);

        var totalQuantitiesByProduct = invoice.Products
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

        var appliedAdjustments = new List<(Guid ProductId, int StockDelta, int ReservedStockDelta)>();

        try
        {
            foreach (var productEntry in totalQuantitiesByProduct)
            {
                var stockDelta = 0;
                var reservedStockDelta = -productEntry.Value;

                await AdjustProductInventoryAsync(
                    productEntry.Key,
                    stockDelta: stockDelta,
                    reservedStockDelta: reservedStockDelta,
                    idempotencyKey: BuildDeleteInventoryAdjustmentIdempotencyKey(
                        id,
                        productEntry.Key,
                        stockDelta,
                        reservedStockDelta));

                appliedAdjustments.Add((productEntry.Key, stockDelta, reservedStockDelta));
            }

            _context.Invoices.Remove(invoice);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            var compensationFailures = await CompensateInventoryAdjustmentsAsync(id, appliedAdjustments);

            if (compensationFailures.Count > 0)
            {
                throw new ValidationException(
                    $"Falha crítica ao compensar ajustes de estoque da nota {id}. " +
                    "Estado parcial inconsistente detectado; realize intervenção/reprocessamento antes de novas operações.");
            }

            throw new ValidationException("Não foi possível excluir a nota fiscal. As reservas de estoque aplicadas foram compensadas.");
        }
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

    private async Task AdjustProductInventoryAsync(
        Guid productId,
        int stockDelta = 0,
        int reservedStockDelta = 0,
        string? idempotencyKey = null)
    {
        var client = _httpClientFactory.CreateClient("ProductApi");
        var payload = JsonContent.Create(new
        {
            StockDelta = stockDelta,
            ReservedStockDelta = reservedStockDelta
        });
        using var request = new HttpRequestMessage(HttpMethod.Put, $"api/products/internal/{productId}/inventory")
        {
            Content = payload
        };

        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            request.Headers.TryAddWithoutValidation(IdempotencyHeader, idempotencyKey);
        }

        var response = await client.SendAsync(request);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            throw new NotFoundException($"Produto {productId} não encontrado.");
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new ValidationException($"Não foi possível atualizar o estoque do produto {productId}.");
        }
    }
    
    private async Task<List<(Guid ProductId, int StockDelta, int ReservedStockDelta)>> CompensateInventoryAdjustmentsAsync(
        Guid invoiceId,
        List<(Guid ProductId, int StockDelta, int ReservedStockDelta)> appliedAdjustments)
    {
        var failedCompensations = new List<(Guid ProductId, int StockDelta, int ReservedStockDelta)>();

        for (var i = appliedAdjustments.Count - 1; i >= 0; i--)
        {
            var appliedAdjustment = appliedAdjustments[i];
            var compensationStockDelta = -appliedAdjustment.StockDelta;
            var compensationReservedStockDelta = -appliedAdjustment.ReservedStockDelta;

            try
            {
                await AdjustProductInventoryAsync(
                    appliedAdjustment.ProductId,
                    stockDelta: compensationStockDelta,
                    reservedStockDelta: compensationReservedStockDelta,
                    idempotencyKey: BuildInventoryCompensationIdempotencyKey(
                        appliedAdjustment.ProductId,
                        compensationStockDelta,
                        compensationReservedStockDelta,
                        i));
            }
            catch (Exception ex)
            {
                failedCompensations.Add((appliedAdjustment.ProductId, compensationStockDelta, compensationReservedStockDelta));
                _logger.LogError(
                    ex,
                    "Falha na compensação de estoque. InvoiceId={InvoiceId}, ProductId={ProductId}, StockDelta={StockDelta}, ReservedStockDelta={ReservedStockDelta}, CompensationIndex={CompensationIndex}.",
                    invoiceId,
                    appliedAdjustment.ProductId,
                    compensationStockDelta,
                    compensationReservedStockDelta,
                    i);
            }
        }

        return failedCompensations;
    }

    private static string BuildInventoryAdjustmentIdempotencyKey(
        Guid invoiceId,
        Guid productId,
        int stockDelta,
        int reservedStockDelta)
        => $"invoice-close:{invoiceId}:product:{productId}:stock:{stockDelta}:reserved:{reservedStockDelta}";

    private static string BuildInventoryCompensationIdempotencyKey(
        Guid productId,
        int stockDelta,
        int reservedStockDelta,
        int index)
        => $"invoice-close-compensation:product:{productId}:stock:{stockDelta}:reserved:{reservedStockDelta}:idx:{index}";

     private static string BuildDeleteInventoryAdjustmentIdempotencyKey(
        Guid invoiceId,
        Guid productId,
        int stockDelta,
        int reservedStockDelta)
        => $"invoice-delete:{invoiceId}:product:{productId}:stock:{stockDelta}:reserved:{reservedStockDelta}";
        
    private static string BuildInventoryAdjustmentIdempotencyKey(Guid invoiceId, Guid productId, int stockDelta)
        => $"invoice-close:{invoiceId}:product:{productId}:stock:{stockDelta}";

    private static string BuildInventoryCompensationIdempotencyKey(Guid productId, int stockDelta, int index)
        => $"invoice-close-compensation:product:{productId}:stock:{stockDelta}:idx:{index}";

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

        if (hasName && (string.IsNullOrWhiteSpace(request.CustomerName) || request.CustomerName.Trim().Length > 255))
        {
            throw new ValidationException("CustomerName deve ter no máximo 255 caracteres.");
        }

        if (hasDocument && (string.IsNullOrWhiteSpace(request.CustomerDocument) || request.CustomerDocument.Trim().Length > 50))
        {
            throw new ValidationException("CustomerDocument deve ter no máximo 50 caracteres.");
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
        int ReservedStock,
        bool IsDeleted,
        [property: JsonPropertyName("AvailableStock")] int? AvailableStock = null,
        [property: JsonPropertyName("AvailableQuantity")] int? AvailableQuantity = null
    )
    {
        public int? ResolvedAvailableStock => AvailableStock ?? AvailableQuantity;
    }
}