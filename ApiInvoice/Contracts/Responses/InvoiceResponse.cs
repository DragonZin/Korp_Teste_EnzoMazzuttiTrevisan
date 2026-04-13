using ApiInvoice.Enums;

namespace ApiInvoice.Contracts;

public record InvoiceResponse(
    Guid Id,
    int Number,
    InvoiceStatus Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyCollection<InvoiceItemResponse> Items
);
