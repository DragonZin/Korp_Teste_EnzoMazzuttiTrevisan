using ApiInvoice.Contracts;

namespace ApiInvoice.Interfaces;

public interface IInvoiceProductService
{
    Task<InvoiceResponse> UpsertInvoiceItemsAsync(Guid invoiceId, ManageInvoiceItemsRequest request);
    Task RemoveInvoiceItemAsync(Guid invoiceId, Guid productId);
}