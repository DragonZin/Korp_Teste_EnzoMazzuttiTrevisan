namespace ApiInvoice.Contracts;

public class ManageInvoiceItemsRequest
{
    public IReadOnlyCollection<ManageInvoiceItemRequest> Products { get; set; } = [];
}