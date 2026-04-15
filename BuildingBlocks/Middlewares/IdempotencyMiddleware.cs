using BuildingBlocks.Abstractions;
using BuildingBlocks.Models;
using BuildingBlocks.Options;
using BuildingBlocks.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BuildingBlocks.Middlewares;

public class IdempotencyMiddleware
{
    private const string IdempotencyHeader = "Idempotency-Key";

    private readonly RequestDelegate _next;
    private readonly SharedApiOptions _options;
    private readonly IdempotencyMetrics _metrics;

    public IdempotencyMiddleware(
        RequestDelegate next,
        IOptions<SharedApiOptions> options,
        IdempotencyMetrics metrics)
    {
        _next = next;
        _options = options.Value;
        _metrics = metrics;
    }

    public async Task InvokeAsync(HttpContext context, IIdempotencyDbContext dbContext)
    {
        if (!context.Request.Headers.TryGetValue(IdempotencyHeader, out var idempotencyValues)
            || string.IsNullOrWhiteSpace(idempotencyValues)
            || !_options.ShouldHandleIdempotencyRequest(context.Request))
        {
            await _next(context);
            return;
        }

        var retentionWindow = _options.IdempotencyRetentionWindow <= TimeSpan.Zero
            ? TimeSpan.FromHours(72)
            : _options.IdempotencyRetentionWindow;
        var expirationCutoff = DateTime.UtcNow.Subtract(retentionWindow);

        var key = idempotencyValues.ToString().Trim();
        var endpoint = context.Request.Path.Value ?? string.Empty;

        await dbContext.IdempotencyKeys
            .Where(i => i.Key == key && i.Endpoint == endpoint && i.CreatedAt < expirationCutoff)
            .ExecuteDeleteAsync();

        var existingRecord = await dbContext.IdempotencyKeys
            .AsNoTracking()
            .FirstOrDefaultAsync(i =>
                i.Key == key
                && i.Endpoint == endpoint
                && i.CreatedAt >= expirationCutoff);

        if (existingRecord is not null)
        {
            _metrics.RecordRequest(wasReused: true);
            context.Response.StatusCode = existingRecord.StatusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(existingRecord.Response);
            return;
        }

        var originalBodyStream = context.Response.Body;
        await using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        try
        {
            await _next(context);

            responseBody.Position = 0;
            var responseText = await new StreamReader(responseBody).ReadToEndAsync();

            var newRecord = new IdempotencyKeyRecord
            {
                Id = Guid.NewGuid(),
                Key = key,
                Endpoint = endpoint,
                Response = responseText,
                StatusCode = context.Response.StatusCode,
                CreatedAt = DateTime.UtcNow
            };

            dbContext.IdempotencyKeys.Add(newRecord);

            try
            {
                await dbContext.SaveChangesAsync();
                _metrics.RecordRequest(wasReused: false);
            }
            catch (DbUpdateException)
            {
                var concurrentRecord = await dbContext.IdempotencyKeys
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i =>
                        i.Key == key
                        && i.Endpoint == endpoint
                        && i.CreatedAt >= expirationCutoff);

                if (concurrentRecord is not null)
                {
                    _metrics.RecordRequest(wasReused: true);
                    context.Response.StatusCode = concurrentRecord.StatusCode;
                    context.Response.ContentType = "application/json";
                    context.Response.Body = originalBodyStream;
                    await context.Response.WriteAsync(concurrentRecord.Response);
                    return;
                }

                throw;
            }

            responseBody.Position = 0;
            context.Response.Body = originalBodyStream;
            await responseBody.CopyToAsync(originalBodyStream);
        }
        finally
        {
            context.Response.Body = originalBodyStream;
        }
    }
}