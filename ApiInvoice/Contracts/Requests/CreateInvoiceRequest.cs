using ApiInvoice.Enums;

namespace ApiInvoice.Contracts;

public class CreateInvoiceRequest
{
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Open;

    public IReadOnlyCollection<CreateInvoiceItemRequest> Items { get; set; } = Array.Empty<CreateInvoiceItemRequest>();
}

public class CreateInvoiceItemRequest
{
    public Guid ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}