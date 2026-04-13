using Microsoft.EntityFrameworkCore;
using ProductsService.Contracts;
using ProductsService.Data;
using ProductsService.Exceptions;
using ProductsService.Models;

namespace ProductsService.Services;

public class ProductService : IProductService
{
    private readonly AppDbContext _context;

    public ProductService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ProductResponse>> GetProductsAsync()
    {
        return await _context.Products
            .AsNoTracking()
            .OrderBy(p => p.Name)
            .Select(p => new ProductResponse(
                p.Id,
                p.Code,
                p.Name,
                p.Stock,
                p.Price
            ))
            .ToListAsync();
    }

    public async Task<ProductResponse> GetProductByIdAsync(Guid id)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new ProductResponse(
                p.Id,
                p.Code,
                p.Name,
                p.Stock,
                p.Price
            ))
            .FirstOrDefaultAsync();

        return product ?? throw new NotFoundException("Produto não encontrado.");
    }

    public async Task<Product> CreateProductAsync(CreateProductRequest request)
    {
        ValidateRequest(request.Code, request.Name);

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Stock = request.Stock,
            Price = request.Price,
            IsDeleted = false
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return product;
    }

    public async Task<Product> UpdateProductAsync(Guid id, UpdateProductRequest request)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id)
                      ?? throw new NotFoundException("Produto não encontrado.");

        ValidateRequest(request.Code, request.Name);

        product.Code = request.Code.Trim();
        product.Name = request.Name.Trim();
        product.Stock = request.Stock;
        product.Price = request.Price;

        await _context.SaveChangesAsync();

        return product;
    }

    public async Task DeleteProductAsync(Guid id)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id)
                      ?? throw new NotFoundException("Produto não encontrado.");

        product.IsDeleted = true;
        await _context.SaveChangesAsync();
    }

    private static void ValidateRequest(string code, string name)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
        {
            throw new ValidationException("Code e Name são obrigatórios.");
        }
    }
}