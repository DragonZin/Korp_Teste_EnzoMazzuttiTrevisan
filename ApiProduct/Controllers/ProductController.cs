using Microsoft.AspNetCore.Mvc;
using ApiProduct.Contracts;
using ApiProduct.Interfaces;

namespace ApiProduct.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<ProductResponse>>> GetProducts(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var products = await _productService.GetProductsAsync(search, page, pageSize);
        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductResponse>> GetProduct(Guid id)
    {
        var product = await _productService.GetProductByIdAsync(id);
        return Ok(product);
    }

    [HttpPost("batch")]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetProductsByIds([FromBody] GetProductsByIdsRequest request)
    {
        var products = await _productService.GetProductsByIdsAsync(request.Ids);
        return Ok(products);
    }

    [HttpPost]
    public async Task<ActionResult<ProductResponse>> CreateProduct(CreateProductRequest request)
    {
        var product = await _productService.CreateProductAsync(request);
        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProductResponse>> UpdateProduct(Guid id, UpdateProductRequest request)
    {
        var product = await _productService.UpdateProductAsync(id, request);
        return Ok(product);
    }

    [HttpPut("internal/{id:guid}/inventory")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<ActionResult<ProductResponse>> AdjustInventory(Guid id, AdjustProductInventoryRequest request)
    {
        var product = await _productService.AdjustInventoryAsync(id, request);
        return Ok(product);
    }

    [HttpPut("internal/{id:guid}/reserve")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<ActionResult<ProductResponse>> Reserve(Guid id, ProductQuantityRequest request)
    {
        var product = await _productService.ReserveAsync(id, request);
        return Ok(product);
    }

    [HttpPut("internal/{id:guid}/release")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<ActionResult<ProductResponse>> Release(Guid id, ProductQuantityRequest request)
    {
        var product = await _productService.ReleaseAsync(id, request);
        return Ok(product);
    }

    [HttpPut("internal/{id:guid}/commit")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<ActionResult<ProductResponse>> Commit(Guid id, ProductQuantityRequest request)
    {
        var product = await _productService.CommitAsync(id, request);
        return Ok(product);
    }
    
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        await _productService.DeleteProductAsync(id);
        return NoContent();
    }
}