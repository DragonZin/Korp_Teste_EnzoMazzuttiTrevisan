using ApiInvoice.Enums;

namespace ApiInvoice.Contracts;

public record InvoiceResponse(
    Guid Id,
    int Number,
    InvoiceStatus Status,
    decimal TotalAmount,
    string CustomerName,
    string CustomerDocument,
    DateTime CreatedAt,
    DateTime? ClosedAt,
    IReadOnlyCollection<InvoiceItemResponse> Products
);
