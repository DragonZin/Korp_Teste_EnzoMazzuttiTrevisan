using ApiInvoice.Enums;

namespace ApiInvoice.Contracts;

public class UpdateInvoiceRequest
{
    public IReadOnlyCollection<CreateInvoiceItemRequest>? Items { get; set; }
}