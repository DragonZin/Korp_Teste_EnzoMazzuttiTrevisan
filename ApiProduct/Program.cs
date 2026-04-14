using ApiProduct.Data;
using ApiProduct.Interfaces;
using ApiProduct.Services;
using BuildingBlocks.Abstractions;
using BuildingBlocks.Extensions;
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
    options.ShouldHandleIdempotencyRequest = IdempotencyEndpointMatcher.ShouldHandle;
    options.UniqueConstraintConflictDetail = "Já existe um produto com esse código.";
});

var app = builder.Build();

app.UseSharedApiDefaults();
app.MapSharedHealthCheck<AppDbContext>();
app.MapControllers();

app.Run();