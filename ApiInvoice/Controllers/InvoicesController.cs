using ApiInvoice.Contracts;
using ApiInvoice.Enums;
using ApiInvoice.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ApiInvoice.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;
    private readonly IInvoiceProductService _invoiceProductService;

    public InvoicesController(IInvoiceService invoiceService, IInvoiceProductService invoiceProductService)
    {
        _invoiceService = invoiceService;
        _invoiceProductService = invoiceProductService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<InvoiceResponse>>> GetInvoices(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] InvoiceStatus? status = null)
    {
        var invoices = await _invoiceService.GetInvoicesAsync(page, pageSize, status);
        return Ok(invoices);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<InvoiceResponse>> GetInvoice(Guid id)
    {
        var invoice = await _invoiceService.GetInvoiceByIdAsync(id);
        return Ok(invoice);
    }

    [HttpPost]
    public async Task<ActionResult<InvoiceResponse>> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        var invoice = await _invoiceService.CreateInvoiceAsync(request);
        return CreatedAtAction(nameof(GetInvoice), new { id = invoice.Id }, invoice);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<InvoiceResponse>> UpdateInvoice(Guid id, [FromBody] UpdateInvoiceRequest request)
    {
        var invoice = await _invoiceService.UpdateInvoiceAsync(id, request);
        return Ok(invoice);
    }

    [HttpPatch("{id:guid}/items")]
    public async Task<ActionResult<InvoiceResponse>> UpsertInvoiceItems(Guid id, [FromBody] ManageInvoiceItemsRequest request)
    {
        var invoice = await _invoiceProductService.UpsertInvoiceItemsAsync(id, request);
        return Ok(invoice);
    }

    [HttpDelete("{invoiceId:guid}/product/{productId:guid}")]
    public async Task<IActionResult> DeleteInvoiceItem(Guid invoiceId, Guid productId)
    {
        await _invoiceProductService.RemoveInvoiceItemAsync(invoiceId, productId);
        return NoContent();
    }
    
    [HttpPut("{id:guid}/close")]
    public async Task<ActionResult<InvoiceResponse>> CloseInvoice(Guid id)
    {
        var invoice = await _invoiceService.CloseInvoiceAsync(id);
        return Ok(invoice);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteInvoice(Guid id)
    {
        await _invoiceService.DeleteInvoiceAsync(id);
        return NoContent();
    }
}