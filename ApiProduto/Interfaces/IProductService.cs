using ProductsService.Contracts;
using ProductsService.Models;

namespace ProductsService.Services;

public interface IProductService
{
    Task<IEnumerable<ProductResponse>> GetProductsAsync();
    Task<ProductResponse> GetProductByIdAsync(Guid id);
    Task<Product> CreateProductAsync(CreateProductRequest request);
    Task<Product> UpdateProductAsync(Guid id, UpdateProductRequest request);
    Task DeleteProductAsync(Guid id);
}