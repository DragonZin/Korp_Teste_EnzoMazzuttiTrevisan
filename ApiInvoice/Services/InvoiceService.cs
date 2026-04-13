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
            .Include(i => i.Items)
            .AsQueryable();

        if (number.HasValue)
        {
            query = query.Where(i => i.Number == number.Value);
        }

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
            invoices.Select(MapResponse).ToList(),
            normalizedPage,
            normalizedPageSize,
            totalItems,
            totalPages);
    }

    public async Task<InvoiceResponse> GetInvoiceByIdAsync(Guid id)
    {
        var invoice = await _context.Invoices
            .AsNoTracking()
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        return MapResponse(invoice);
    }

    public async Task<InvoiceResponse> CreateInvoiceAsync(CreateInvoiceRequest request)
    {
        ValidateRequest(request.Number, request.Items);

        var numberAlreadyExists = await _context.Invoices.AnyAsync(i => i.Number == request.Number);

        if (numberAlreadyExists)
        {
            throw new ValidationException("Já existe uma nota fiscal com esse número.");
        }

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            Number = request.Number,
            Status = request.Status,
            Items = request.Items.Select(ToEntity).ToList()
        };

        invoice.TotalAmount = invoice.Items.Sum(i => i.TotalPrice);

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        return await GetInvoiceByIdAsync(invoice.Id);
    }

    public async Task<InvoiceResponse> UpdateInvoiceAsync(Guid id, UpdateInvoiceRequest request)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new NotFoundException("Nota fiscal não encontrada.");

        ValidateUpdateRequest(request);

        if (request.Number.HasValue)
        {
            var numberAlreadyExists = await _context.Invoices
                .AnyAsync(i => i.Id != id && i.Number == request.Number.Value);

            if (numberAlreadyExists)
            {
                throw new ValidationException("Já existe uma nota fiscal com esse número.");
            }

            invoice.Number = request.Number.Value;
        }

        if (request.Items is not null)
        {
            invoice.Items.Clear();

            foreach (var item in request.Items)
            {
                invoice.Items.Add(ToEntity(item));
            }
        }

        invoice.TotalAmount = invoice.Items.Sum(i => i.TotalPrice);

        await _context.SaveChangesAsync();

        return MapResponse(invoice);
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
            invoice.CreatedAt,
            invoice.UpdatedAt,
            invoice.Items.Select(i => new InvoiceItemResponse(
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

    private static void ValidateRequest(int number, IReadOnlyCollection<CreateInvoiceItemRequest> items)
    {
        if (number <= 0)
        {
            throw new ValidationException("Número da nota fiscal deve ser maior que zero.");
        }

        if (items.Count == 0)
        {
            throw new ValidationException("Informe ao menos um item na nota fiscal.");
        }

        foreach (var item in items)
        {
            ValidateItem(item);
        }
    }

    private static void ValidateUpdateRequest(UpdateInvoiceRequest request)
    {
        var hasAnyFieldToUpdate =
            request.Number.HasValue ||
            request.Items is not null;

        if (!hasAnyFieldToUpdate)
        {
            throw new ValidationException("Informe ao menos um campo para atualização.");
        }

        if (request.Number.HasValue && request.Number.Value <= 0)
        {
            throw new ValidationException("Número da nota fiscal deve ser maior que zero.");
        }

        if (request.Items is not null)
        {
            if (request.Items.Count == 0)
            {
                throw new ValidationException("Informe ao menos um item na nota fiscal.");
            }

            foreach (var item in request.Items)
            {
                ValidateItem(item);
            }
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
}