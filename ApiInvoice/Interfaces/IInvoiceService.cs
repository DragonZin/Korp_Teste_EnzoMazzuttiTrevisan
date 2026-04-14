using ApiInvoice.Enums;

using ApiInvoice.Contracts;

namespace ApiInvoice.Interfaces;

public interface IInvoiceService
{
    Task<PagedResponse<InvoiceResponse>> GetInvoicesAsync(int page, int pageSize, int? number, InvoiceStatus? status);
    Task<InvoiceResponse> GetInvoiceByIdAsync(Guid id);
    Task<InvoiceResponse> CreateInvoiceAsync(CreateInvoiceRequest request);
    Task<InvoiceResponse> UpdateInvoiceAsync(Guid id, UpdateInvoiceRequest request);
    Task<InvoiceResponse> ManageInvoiceItemsAsync(Guid id, ManageInvoiceItemsRequest request);
    Task<InvoiceResponse> CloseInvoiceAsync(Guid id);
    Task DeleteInvoiceAsync(Guid id);
}