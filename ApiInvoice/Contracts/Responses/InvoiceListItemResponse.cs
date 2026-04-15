using ApiInvoice.Enums;

namespace ApiInvoice.Contracts;

public record InvoiceListItemResponse(
    Guid Id,
    int Number,
    InvoiceStatus Status,
    decimal TotalAmount,
    string CustomerName,
    string CustomerDocument,
    DateTime CreatedAt,
    DateTime? ClosedAt,
    int ItemsCount
);