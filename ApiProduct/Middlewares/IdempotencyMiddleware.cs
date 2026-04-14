using ApiProduct.Data;
using ApiProduct.Models;
using Microsoft.EntityFrameworkCore;

namespace ApiProduct.Middlewares;

public class IdempotencyMiddleware
{
    private const string IdempotencyHeader = "Idempotency-Key";

    private readonly RequestDelegate _next;

    public IdempotencyMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        if (!context.Request.Headers.TryGetValue(IdempotencyHeader, out var idempotencyValues)
            || string.IsNullOrWhiteSpace(idempotencyValues)
            || !Services.IdempotencyEndpointMatcher.ShouldHandle(context.Request))
        {
            await _next(context);
            return;
        }

        var key = idempotencyValues.ToString().Trim();
        var endpoint = context.Request.Path.Value ?? string.Empty;

        var existingRecord = await dbContext.IdempotencyKeys
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Key == key && i.Endpoint == endpoint);

        if (existingRecord is not null)
        {
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
            }
            catch (DbUpdateException)
            {
                var concurrentRecord = await dbContext.IdempotencyKeys
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i => i.Key == key && i.Endpoint == endpoint);

                if (concurrentRecord is not null)
                {
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