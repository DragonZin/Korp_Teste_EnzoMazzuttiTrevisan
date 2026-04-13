using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using ProductsService.Data;
using ProductsService.Middlewares;
using ProductsService.Services;
using ProductsService.Interfaces;

var builder = WebApplication.CreateBuilder(args);

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

app.UseMiddleware<ErrorHandlingMiddleware>();
app.MapControllers();

app.Run();