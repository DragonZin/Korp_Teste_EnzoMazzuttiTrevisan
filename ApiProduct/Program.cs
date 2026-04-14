using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using ApiProduct.Data;
using ApiProduct.Extensions;
using ApiProduct.Interfaces;
using ApiProduct.Middlewares;
using ApiProduct.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddCleanConsoleLogging();
Console.WriteLine("Working...");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddControllers();
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(x => x.Value?.Errors.Count > 0)
            .ToDictionary(
                keySelector: x => x.Key,
                elementSelector: x => x.Value!.Errors
                    .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage)
                        ? "Valor inválido."
                        : error.ErrorMessage)
                    .ToArray());

        var response = new
        {
            type = "https://httpstatuses.com/400",
            title = "Dados inválidos",
            status = StatusCodes.Status400BadRequest,
            detail = "Um ou mais campos da requisição são inválidos.",
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

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS idempotency_keys (
            id uuid PRIMARY KEY,
            key varchar(255) NOT NULL,
            endpoint varchar(255) NOT NULL,
            response jsonb NOT NULL,
            status_code integer NOT NULL,
            created_at timestamp with time zone NOT NULL,
            CONSTRAINT ux_idempotency_key_endpoint UNIQUE (key, endpoint)
        );
        """);
}

app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseMiddleware<IdempotencyMiddleware>();

app.MapGet("/health", async (AppDbContext dbContext, CancellationToken cancellationToken) =>
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
});

app.MapControllers();

app.Run();