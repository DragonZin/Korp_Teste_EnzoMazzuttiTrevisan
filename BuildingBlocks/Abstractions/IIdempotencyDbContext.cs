using BuildingBlocks.Models;
using Microsoft.EntityFrameworkCore;

namespace BuildingBlocks.Abstractions;

public interface IIdempotencyDbContext
{
    DbSet<IdempotencyKeyRecord> IdempotencyKeys { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}