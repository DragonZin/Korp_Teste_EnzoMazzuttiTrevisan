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
}