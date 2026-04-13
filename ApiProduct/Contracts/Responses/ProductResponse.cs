namespace ApiProduct.Contracts;

public record ProductResponse(
    Guid Id,
    string Code,
    string Name,
    int Stock,
    decimal Price
);