using ApiInvoice.Enums;

namespace ApiInvoice.Contracts;

public class UpdateInvoiceRequest
{
    public int? Number { get; set; }
    public IReadOnlyCollection<CreateInvoiceItemRequest>? Items { get; set; }
}