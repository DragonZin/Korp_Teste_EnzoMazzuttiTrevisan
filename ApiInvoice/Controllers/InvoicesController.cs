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

    public InvoicesController(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<InvoiceResponse>>> GetInvoices(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? number = null,
        [FromQuery] InvoiceStatus? status = null)
    {
        var invoices = await _invoiceService.GetInvoicesAsync(page, pageSize, number, status);
        return Ok(invoices);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<InvoiceResponse>> GetInvoice(Guid id)
    {
        var invoice = await _invoiceService.GetInvoiceByIdAsync(id);
        return Ok(invoice);
    }

    /*[HttpPost]
    public async Task<ActionResult<InvoiceResponse>> CreateInvoice(CreateInvoiceRequest request)
    {
        var invoice = await _invoiceService.CreateInvoiceAsync(request);
        return CreatedAtAction(nameof(GetInvoice), new { id = invoice.Id }, invoice);
    }*/


    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteInvoice(Guid id)
    {
        await _invoiceService.DeleteInvoiceAsync(id);
        return NoContent();
    }
}