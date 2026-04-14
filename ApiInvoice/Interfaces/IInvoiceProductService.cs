using ApiInvoice.Contracts;

namespace ApiInvoice.Interfaces;

public interface IInvoiceProductService
{
    Task<InvoiceResponse> ManageInvoiceItemsAsync(Guid invoiceId, ManageInvoiceItemsRequest request);
}