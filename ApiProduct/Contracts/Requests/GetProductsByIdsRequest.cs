namespace ApiProduct.Contracts;

public class GetProductsByIdsRequest
{
    public IReadOnlyCollection<Guid> Ids { get; init; } = Array.Empty<Guid>();
}