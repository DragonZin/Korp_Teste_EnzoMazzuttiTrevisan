using ApiInvoice.Enums;

using ApiInvoice.Contracts;

namespace ApiInvoice.Interfaces;

public interface IInvoiceService
{
    Task<PagedResponse<InvoiceResponse>> GetInvoicesAsync(int page, int pageSize, int? number, InvoiceStatus? status);
    Task<InvoiceResponse> GetInvoiceByIdAsync(Guid id);
    Task<InvoiceResponse> CreateInvoiceAsync();
    //Task<InvoiceResponse> UpdateInvoiceAsync(Guid id, UpdateInvoiceRequest request);
    Task DeleteInvoiceAsync(Guid id);
}