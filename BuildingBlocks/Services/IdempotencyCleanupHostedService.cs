using BuildingBlocks.Abstractions;
using BuildingBlocks.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BuildingBlocks.Services;

public sealed class IdempotencyCleanupHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly SharedApiOptions _options;
    private readonly IdempotencyMetrics _metrics;
    private readonly ILogger<IdempotencyCleanupHostedService> _logger;

    public IdempotencyCleanupHostedService(
        IServiceScopeFactory scopeFactory,
        IOptions<SharedApiOptions> options,
        IdempotencyMetrics metrics,
        ILogger<IdempotencyCleanupHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _metrics = metrics;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await CleanupExpiredRecordsAsync(stoppingToken);

        var cleanupInterval = _options.IdempotencyCleanupInterval <= TimeSpan.Zero
            ? TimeSpan.FromMinutes(10)
            : _options.IdempotencyCleanupInterval;

        using var timer = new PeriodicTimer(cleanupInterval);

        while (!stoppingToken.IsCancellationRequested
               && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await CleanupExpiredRecordsAsync(stoppingToken);
        }
    }

    private async Task CleanupExpiredRecordsAsync(CancellationToken cancellationToken)
    {
        var retentionWindow = _options.IdempotencyRetentionWindow <= TimeSpan.Zero
            ? TimeSpan.FromHours(72)
            : _options.IdempotencyRetentionWindow;

        var batchSize = _options.IdempotencyCleanupBatchSize <= 0
            ? 500
            : _options.IdempotencyCleanupBatchSize;

        var expirationCutoff = DateTime.UtcNow.Subtract(retentionWindow);

        long totalDeleted = 0;

        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IIdempotencyDbContext>();

        while (!cancellationToken.IsCancellationRequested)
        {
            var expiredIds = await dbContext.IdempotencyKeys
                .Where(x => x.CreatedAt < expirationCutoff)
                .OrderBy(x => x.CreatedAt)
                .Select(x => x.Id)
                .Take(batchSize)
                .ToListAsync(cancellationToken);

            if (expiredIds.Count == 0)
            {
                break;
            }

            var deletedCount = await dbContext.IdempotencyKeys
                .Where(x => expiredIds.Contains(x.Id))
                .ExecuteDeleteAsync(cancellationToken);

            totalDeleted += deletedCount;

            if (deletedCount < batchSize)
            {
                break;
            }
        }

        var tableSize = await dbContext.IdempotencyKeys.LongCountAsync(cancellationToken);
        _metrics.UpdateTableSize(tableSize);

        if (totalDeleted > 0)
        {
            _logger.LogInformation(
                "Limpeza de idempotência removeu {DeletedCount} registros expirados. Tabela atual com {TableSize} registros.",
                totalDeleted,
                tableSize);
        }
    }
}