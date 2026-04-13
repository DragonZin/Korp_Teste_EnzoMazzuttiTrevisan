using ProductsService.Contracts;

namespace ProductsService.Services;

public interface IProductService
{
    Task<IEnumerable<ProductResponse>> GetProductsAsync();
    Task<ProductResponse> GetProductByIdAsync(Guid id);
    Task<ProductResponse> CreateProductAsync(CreateProductRequest request);
    Task<ProductResponse> UpdateProductAsync(Guid id, UpdateProductRequest request);
    Task DeleteProductAsync(Guid id);
}