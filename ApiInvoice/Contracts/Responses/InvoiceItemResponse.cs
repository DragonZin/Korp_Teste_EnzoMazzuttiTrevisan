namespace ApiInvoice.Contracts;

public record InvoiceItemResponse(
    Guid Id,
    Guid ProductId,
    decimal UnitPrice,
    int Quantity,
    decimal TotalPrice
);