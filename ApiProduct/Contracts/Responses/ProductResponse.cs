namespace ApiProduct.Contracts;

public record ProductResponse(
    Guid Id,
    string Code,
    string Name,
    int Stock,
    int AvailableQuantity,
    decimal Price,
    bool IsDeleted
);