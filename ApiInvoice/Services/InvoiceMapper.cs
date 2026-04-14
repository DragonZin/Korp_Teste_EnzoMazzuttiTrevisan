using ApiInvoice.Contracts;
using ApiInvoice.Models;

namespace ApiInvoice.Services;

internal static class InvoiceMapper
{
    public static InvoiceResponse ToResponse(Invoice invoice)
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
}