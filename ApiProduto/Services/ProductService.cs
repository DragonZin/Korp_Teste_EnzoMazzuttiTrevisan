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
            .Where(p => !p.IsDeleted)
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
            .Where(p => p.Id == id && !p.IsDeleted)
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

    public async Task<ProductResponse> CreateProductAsync(CreateProductRequest request)
    {
        ValidateRequest(request.Code, request.Name);

        var code = request.Code.Trim();
        var name = request.Name.Trim();

        var codeAlreadyExists = await _context.Products
            .AnyAsync(p => p.Code == code && !p.IsDeleted);

        if (codeAlreadyExists)
        {
            throw new ValidationException("Já existe um produto com esse código.");
        }

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = name,
            Stock = request.Stock,
            Price = request.Price,
            IsDeleted = false
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return new ProductResponse(
            product.Id,
            product.Code,
            product.Name,
            product.Stock,
            product.Price
        );
    }

    public async Task<ProductResponse> UpdateProductAsync(Guid id, UpdateProductRequest request)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new NotFoundException("Produto não encontrado.");

        ValidateRequest(request.Code, request.Name);

        var code = request.Code.Trim();
        var name = request.Name.Trim();

        var codeAlreadyExists = await _context.Products
            .AnyAsync(p => p.Id != id && p.Code == code && !p.IsDeleted);

        if (codeAlreadyExists)
        {
            throw new ValidationException("Já existe um produto com esse código.");
        }

        product.Code = code;
        product.Name = name;
        product.Stock = request.Stock;
        product.Price = request.Price;

        await _context.SaveChangesAsync();

        return new ProductResponse(
            product.Id,
            product.Code,
            product.Name,
            product.Stock,
            product.Price
        );
    }

    public async Task DeleteProductAsync(Guid id)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new NotFoundException("Produto não encontrado.");

        product.IsDeleted = true;
        await _context.SaveChangesAsync();
    }

    private static void ValidateRequest(string code, string name)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ValidationException("Code é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ValidationException("Name é obrigatório.");
        }
    }
}