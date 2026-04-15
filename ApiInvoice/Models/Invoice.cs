using ApiInvoice.Enums;

namespace ApiInvoice.Models;

public class Invoice
{
    public Guid Id { get; set; }
    public uint Xmin { get; private set; }
    public int Number { get; set; }
    public decimal TotalAmount { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Open;

    public string CustomerName { get; set; } = string.Empty;
    public string CustomerDocument { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public ICollection<InvoiceProduct> Products { get; set; } = new List<InvoiceProduct>();
}