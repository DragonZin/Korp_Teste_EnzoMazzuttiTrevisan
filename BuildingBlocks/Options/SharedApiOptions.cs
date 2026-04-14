using Microsoft.AspNetCore.Http;

namespace BuildingBlocks.Options;

public sealed class SharedApiOptions
{
    public Func<HttpRequest, bool> ShouldHandleIdempotencyRequest { get; set; } = _ => false;
    public string UniqueConstraintConflictDetail { get; set; } = "Já existe um registro com esse identificador único.";
}