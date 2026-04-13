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