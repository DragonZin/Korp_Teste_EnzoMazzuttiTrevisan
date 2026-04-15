using ApiProduct.Data;
using ApiProduct.Interfaces;
using ApiProduct.Services;
using BuildingBlocks.Abstractions;
using BuildingBlocks.Extensions;
using BuildingBlocks.Options;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddCleanConsoleLogging();
Console.WriteLine("Working...");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IIdempotencyDbContext>(sp => sp.GetRequiredService<AppDbContext>());
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddControllers();
builder.Services.AddSharedApiDefaults(options =>
{
    builder.Configuration.GetSection(SharedApiOptions.SectionName).Bind(options);
    options.ShouldHandleIdempotencyRequest = IdempotencyEndpointMatcher.ShouldHandle;
    options.UniqueConstraintConflictDetail = "Já existe um produto com esse código.";
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseSharedApiDefaults();
app.MapSharedHealthCheck<AppDbContext>("/api/products/health");
app.MapControllers();

app.Run();