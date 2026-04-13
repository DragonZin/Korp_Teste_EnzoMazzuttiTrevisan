using Microsoft.EntityFrameworkCore;
using ProductsService.Contracts;
using ProductsService.Data;
using ProductsService.Exceptions;
using ProductsService.Interfaces;
using ProductsService.Models;

namespace ProductsService.Services;

public class ProductService : IProductService
{
    private const int MaxPageSize = 100;
    private readonly AppDbContext _context;

    public ProductService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResponse<ProductResponse>> GetProductsAsync(string? search, int page, int pageSize)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize < 1 ? 10 : Math.Min(pageSize, MaxPageSize);

        var query = _context.Products.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(p => p.Name.Contains(term) || p.Code.Contains(term));
        }

        var totalItems = await query.CountAsync();
        var totalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)normalizedPageSize);

        var items = await query
            .OrderBy(p => p.Name)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .Select(p => new ProductResponse(
                p.Id,
                p.Code,
                p.Name,
                p.Stock,
                p.Price
            ))
            .ToListAsync();

        return new PagedResponse<ProductResponse>(
            items,
            normalizedPage,
            normalizedPageSize,
            totalItems,
            totalPages
        );
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

    public async Task<IReadOnlyCollection<ProductResponse>> GetProductsByIdsAsync(IReadOnlyCollection<Guid> ids)
    {
        if (ids is null)
        {
            throw new ValidationException("A lista de IDs é obrigatória.");
        }

        if (ids.Count == 0)
        {
            throw new ValidationException("Informe ao menos um ID.");
        }

        var uniqueIds = ids.Distinct().ToList();

        return await _context.Products
            .AsNoTracking()
            .Where(p => uniqueIds.Contains(p.Id))
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

    public async Task<ProductResponse> CreateProductAsync(CreateProductRequest request)
    {
        ValidateRequest(request.Code, request.Name, request.Stock, request.Price);

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

        ValidateRequest(request.Code, request.Name, request.Stock, request.Price);

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

    private static void ValidateRequest(string code, string name, int stock, decimal price)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ValidationException("Código é obrigatório.");
        }

        if (code.Trim().Length > 50)
        {
            throw new ValidationException("Código deve ter no máximo 50 caracteres.");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ValidationException("Nome é obrigatório.");
        }

        if (name.Trim().Length > 255)
        {
            throw new ValidationException("Nome deve ter no máximo 255 caracteres.");
        }

        if (stock < 0)
        {
            throw new ValidationException("Estoque não pode ser negativo.");
        }

        if (price < 0)
        {
            throw new ValidationException("Preço não pode ser negativo.");
        }
    }
}