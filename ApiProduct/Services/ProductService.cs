using Microsoft.EntityFrameworkCore;
using ApiProduct.Contracts;
using ApiProduct.Data;
using ApiProduct.Exceptions;
using ApiProduct.Interfaces;
using ApiProduct.Models;

namespace ApiProduct.Services;

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

        var query = _context.Products
            .AsNoTracking()
            .Where(p => !p.IsDeleted);

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
                p.Stock - p.ReservedStock,
                p.Price))
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
                p.Stock - p.ReservedStock,
                p.Price))
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
                p.Stock - p.ReservedStock,
                p.Price))
            .ToListAsync();
    }

    public async Task<ProductResponse> CreateProductAsync(CreateProductRequest request)
    {
        ValidateCreateRequest(request);

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
            ReservedStock = 0,
            IsDeleted = false
        };
        
        ValidateStock(product.Stock, product.ReservedStock);

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return ToResponse(product);
    }

    public async Task<ProductResponse> UpdateProductAsync(Guid id, UpdateProductRequest request)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new NotFoundException("Produto não encontrado.");

        ValidateUpdateRequest(request);

        if (request.Code is not null)
        {
            var code = request.Code.Trim();

            var codeAlreadyExists = await _context.Products
                .AnyAsync(p => p.Id != id && p.Code == code && !p.IsDeleted);

            if (codeAlreadyExists)
            {
                throw new ValidationException("Já existe um produto com esse código.");
            }

            product.Code = code;
        }

        if (request.Name is not null)
        {
            product.Name = request.Name.Trim();
        }

        if (request.Stock.HasValue)
        {
            product.Stock = request.Stock.Value;
        }

        if (request.Price.HasValue)
        {
            product.Price = request.Price.Value;
        }

        ValidateStock(product.Stock, product.ReservedStock);

        await _context.SaveChangesAsync();

        return ToResponse(product);
    }

    public async Task<ProductResponse> AdjustInventoryAsync(Guid id, AdjustProductInventoryRequest request)
    {
        ValidateRequestBody(request);

        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new NotFoundException("Produto não encontrado.");

        product.Stock += request.StockDelta;
        product.ReservedStock += request.ReservedStockDelta;
        ValidateStock(product.Stock, product.ReservedStock);

        await _context.SaveChangesAsync();

        return ToResponse(product);
    }

    public async Task<ProductResponse> ReserveAsync(Guid id, ProductQuantityRequest request)
    {
        ValidateRequestBody(request);
        ValidatePositiveQuantity(request.Quantity);

        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new NotFoundException("Produto não encontrado.");

        EnsureAvailableStock(product, request.Quantity);
        product.ReservedStock += request.Quantity;

        await _context.SaveChangesAsync();

        return ToResponse(product);
    }

    public async Task<ProductResponse> ReleaseAsync(Guid id, ProductQuantityRequest request)
    {
        ValidateRequestBody(request);
        ValidatePositiveQuantity(request.Quantity);

        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new NotFoundException("Produto não encontrado.");

        EnsureReservedStock(product, request.Quantity);
        product.ReservedStock -= request.Quantity;

        await _context.SaveChangesAsync();

        return ToResponse(product);
    }

    public async Task<ProductResponse> CommitAsync(Guid id, ProductQuantityRequest request)
    {
        ValidateRequestBody(request);
        ValidatePositiveQuantity(request.Quantity);

        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new NotFoundException("Produto não encontrado.");

        EnsureReservedStock(product, request.Quantity);
        EnsureAvailableStock(product, request.Quantity);

        product.Stock -= request.Quantity;
        product.ReservedStock -= request.Quantity;

        await _context.SaveChangesAsync();

        return ToResponse(product);
    }

    public async Task DeleteProductAsync(Guid id)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new NotFoundException("Produto não encontrado.");

        product.IsDeleted = true;
        await _context.SaveChangesAsync();
    }

    private static ProductResponse ToResponse(Product product)
        => new(
            product.Id,
            product.Code,
            product.Name,
            product.Stock,
            product.Stock - product.ReservedStock,
            product.Price);

    private static void ValidateCreateRequest(CreateProductRequest request)
    {
        ValidateRequestBody(request);

        ValidateCode(request.Code);
        ValidateName(request.Name);

        if (request.Stock < 0)
        {
            throw new ValidationException("Estoque não pode ser negativo.");
        }

        if (request.Price < 0)
        {
            throw new ValidationException("Preço não pode ser negativo.");
        }
    }

    private static void ValidateUpdateRequest(UpdateProductRequest request)
    {
        ValidateRequestBody(request);

        var hasAnyFieldToUpdate =
            request.Code is not null ||
            request.Name is not null ||
            request.Stock.HasValue ||
            request.Price.HasValue;

        if (!hasAnyFieldToUpdate)
        {
            throw new ValidationException("Informe ao menos um campo para atualização.");
        }

        if (request.Code is not null)
        {
            ValidateCode(request.Code);
        }

        if (request.Name is not null)
        {
            ValidateName(request.Name);
        }

        if (request.Stock.HasValue && request.Stock.Value < 0)
        {
            throw new ValidationException("Estoque não pode ser negativo.");
        }

        if (request.Price.HasValue && request.Price.Value < 0)
        {
            throw new ValidationException("Preço não pode ser negativo.");
        }
    }

    private static void ValidateCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ValidationException("Código é obrigatório.");
        }

        if (code.Trim().Length > 50)
        {
            throw new ValidationException("Código deve ter no máximo 50 caracteres.");
        }
    }

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ValidationException("Nome é obrigatório.");
        }

        if (name.Trim().Length > 255)
        {
            throw new ValidationException("Nome deve ter no máximo 255 caracteres.");
        }
    }

    private static void ValidateStock(int stock, int reservedStock = 0)
    {
        if (stock < 0)
        {
            throw new ValidationException("Estoque não pode ser negativo.");
        }

        if (reservedStock < 0)
        {
            throw new ValidationException("Estoque reservado não pode ser negativo.");
        }

        if (reservedStock > stock)
        {
            throw new ValidationException("Estoque reservado não pode ser maior que o estoque total.");
        }
    }
    private static void ValidateRequestBody<TRequest>(TRequest request)
        where TRequest : class
    {
        if (request is null)
        {
            throw new ValidationException("O corpo da requisição é obrigatório.");
        }
    }

    private static void ValidatePositiveQuantity(int quantity)
    {
        if (quantity <= 0)
        {
            throw new ValidationException("Quantidade deve ser maior que zero.");
        }
    }

    private static void EnsureAvailableStock(Product product, int quantity)
    {
        if (product.Stock - product.ReservedStock < quantity)
        {
            throw new ValidationException("Estoque disponível insuficiente.");
        }
    }

    private static void EnsureReservedStock(Product product, int quantity)
    {
        if (product.ReservedStock < quantity)
        {
            throw new ValidationException("Estoque reservado insuficiente.");
        }
    }
}