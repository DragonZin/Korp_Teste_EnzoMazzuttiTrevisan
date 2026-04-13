using ApiInvoice.Enums;

namespace ApiInvoice.Contracts;

public record InvoiceItemResponse(
    Guid Id,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    decimal UnitPrice,
    int Quantity,
    decimal TotalPrice
);

public record InvoiceResponse(
    Guid Id,
    int Number,
    InvoiceStatus Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyCollection<InvoiceItemResponse> Items
);
