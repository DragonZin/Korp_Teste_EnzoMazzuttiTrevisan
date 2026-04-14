namespace ApiInvoice.Contracts;

public class ManageInvoiceItemRequest
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
}