using ApiInvoice.Data;
using ApiInvoice.Interfaces;
using ApiInvoice.Services;
using BuildingBlocks.Extensions;
using Microsoft.EntityFrameworkCore;
using BuildingBlocks.Abstractions;

var builder = WebApplication.CreateBuilder(args);

builder.AddCleanConsoleLogging();
Console.WriteLine("Working...");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IIdempotencyDbContext>(sp => sp.GetRequiredService<AppDbContext>());

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

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseSharedApiDefaults();
app.MapSharedHealthCheck<AppDbContext>();

app.MapControllers();

app.Run();