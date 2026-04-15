using ApiInvoice.Enums;

using ApiInvoice.Contracts;

namespace ApiInvoice.Interfaces;

public interface IInvoiceService
{
    Task<PagedResponse<InvoiceListItemResponse>> GetInvoicesAsync(int page, int pageSize, InvoiceStatus? status);
    Task<InvoiceResponse> GetInvoiceByIdAsync(Guid id);
    Task<InvoiceResponse> CreateInvoiceAsync(CreateInvoiceRequest request);
    Task<InvoiceResponse> UpdateInvoiceAsync(Guid id, UpdateInvoiceRequest request);
    Task<InvoiceResponse> CloseInvoiceAsync(Guid id);
    Task DeleteInvoiceAsync(Guid id);
}