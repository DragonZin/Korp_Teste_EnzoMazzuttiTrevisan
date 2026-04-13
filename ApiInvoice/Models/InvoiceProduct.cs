namespace ApiInvoice.Models;

public class InvoiceProduct
{
    public Guid Id { get; set; }

    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public Guid ProductId { get; set; }

    // snapshot do produto no momento da compra
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }

    public int Quantity { get; set; }
    public decimal TotalPrice => Quantity * UnitPrice;
}