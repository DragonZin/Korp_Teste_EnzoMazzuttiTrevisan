using ApiInvoice.Data;
using ApiInvoice.Interfaces;
using ApiInvoice.Services;
using BuildingBlocks.Extensions;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddCleanConsoleLogging();
Console.WriteLine("Working...");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient("ProductApi", client =>
{
    var productApiBaseUrl = builder.Configuration["ProductApi:BaseUrl"]
        ?? throw new InvalidOperationException("Configuração ProductApi:BaseUrl é obrigatória.");

    client.BaseAddress = new Uri(productApiBaseUrl);
});

builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IInvoiceProductService, InvoiceProductService>();
builder.Services.AddControllers();
builder.Services.AddSharedApiDefaults(options =>
{
    options.ShouldHandleIdempotencyRequest = IdempotencyEndpointMatcher.ShouldHandle;
    options.UniqueConstraintConflictDetail = "Já existe uma nota fiscal com esse número.";
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

app.UseSharedApiDefaults();
app.MapSharedHealthCheck<AppDbContext>();

app.MapControllers();

app.Run();