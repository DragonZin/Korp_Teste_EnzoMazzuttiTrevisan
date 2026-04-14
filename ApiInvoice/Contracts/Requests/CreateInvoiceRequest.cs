namespace ApiInvoice.Contracts;

public class CreateInvoiceRequest
{
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerDocument { get; set; } = string.Empty;
}