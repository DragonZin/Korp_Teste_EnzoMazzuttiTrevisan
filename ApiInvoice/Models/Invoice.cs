namespace ApiInvoice.Models;

public class Invoice
{
    public Guid Id { get; set; }
    public int Number { get; set; }
    public decimal TotalAmount { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.OPEN;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; }

    public ICollection<InvoiceProduct> Items { get; set; } = new List<InvoiceProduct>();
}