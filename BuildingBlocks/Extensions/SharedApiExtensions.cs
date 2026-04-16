using BuildingBlocks.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace BuildingBlocks.Extensions;

public static class SharedApiExtensions
{
    public static IServiceCollection AddSharedApiDefaults(
        this IServiceCollection services,
        Action<SharedApiOptions>? configureOptions = null)
    {
        services.Configure<SharedApiOptions>(options =>
        {
            configureOptions?.Invoke(options);
        });

        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(entry => entry.Value?.Errors.Count > 0)
                    .ToDictionary(
                        keySelector: entry => string.IsNullOrWhiteSpace(entry.Key) ? "body" : entry.Key,
                        elementSelector: entry => entry.Value!.Errors
                            .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage)
                                ? "Valor inválido."
                                : error.ErrorMessage)
                            .Distinct()
                            .ToArray());

                var response = new
                {
                    type = "https://httpstatuses.com/400",
                    title = "Dados inválidos",
                    status = StatusCodes.Status400BadRequest,
                    detail = "Um ou mais erros de validação foram encontrados.",
                    instance = context.HttpContext.Request.Path.ToString(),
                    traceId = context.HttpContext.TraceIdentifier,
                    timestamp = DateTime.UtcNow,
                    errors
                };

                return new BadRequestObjectResult(response)
                {
                    ContentTypes = { "application/problem+json" }
                };
            };
        });

        return services;
    }

    public static IApplicationBuilder UseSharedApiDefaults(this IApplicationBuilder app)
    {
        app.UseMiddleware<Middlewares.RequestLoggingMiddleware>();
        app.UseMiddleware<Middlewares.ErrorHandlingMiddleware>();
        app.UseMiddleware<Middlewares.IdempotencyMiddleware>();
        return app;
    }

    public static IEndpointRouteBuilder MapSharedHealthCheck<TDbContext>(
        this IEndpointRouteBuilder endpoints,
        string healthPath)
        where TDbContext : DbContext
    {
        if (string.IsNullOrWhiteSpace(healthPath))
        {
            throw new ArgumentException("O caminho do healthcheck é obrigatório.", nameof(healthPath));
        }

        endpoints.MapGet(healthPath, HealthCheckHandler<TDbContext>);

        return endpoints;
    }

    private static async Task<IResult> HealthCheckHandler<TDbContext>(
        TDbContext dbContext,
        CancellationToken cancellationToken)
        where TDbContext : DbContext
    {
        var databaseOnline = await dbContext.Database.CanConnectAsync(cancellationToken);

        var response = new
        {
            status = databaseOnline ? "ok" : "degraded",
            databaseOnline,
            timestamp = DateTime.UtcNow
        };

        return databaseOnline
            ? Results.Ok(response)
            : Results.Json(response, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}