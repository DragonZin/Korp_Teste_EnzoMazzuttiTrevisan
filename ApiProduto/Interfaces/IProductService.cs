using ProductsService.Contracts;
using ProductsService.Models;

namespace ProductsService.Interfaces;

public interface IProductService
{
    Task<PagedResponse<ProductResponse>> GetProductsAsync(string? search, int page, int pageSize);
    Task<ProductResponse> GetProductByIdAsync(Guid id);
    Task<IReadOnlyCollection<ProductResponse>> GetProductsByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task<ProductResponse> CreateProductAsync(CreateProductRequest request);
    Task<ProductResponse> UpdateProductAsync(Guid id, UpdateProductRequest request);
    Task DeleteProductAsync(Guid id);
}