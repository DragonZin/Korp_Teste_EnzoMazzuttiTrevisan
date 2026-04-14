using ApiInvoice.Enums;

using ApiInvoice.Contracts;
using ApiInvoice.Data;
using ApiInvoice.Exceptions;
using ApiInvoice.Interfaces;
using ApiInvoice.Models;
using Microsoft.EntityFrameworkCore;

namespace ApiInvoice.Services;

public class InvoiceService : IInvoiceService
{
    private const int MaxPageSize = 100;
    private readonly AppDbContext _context;

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

    public async Task DeleteInvoiceAsync(Guid id)
    {
        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        _context.Invoices.Remove(invoice);
        await _context.SaveChangesAsync();
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
}