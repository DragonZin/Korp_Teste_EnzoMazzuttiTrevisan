using ApiInvoice.Data;
using ApiInvoice.Interfaces;
using ApiInvoice.Services;
using BuildingBlocks.Abstractions;
using BuildingBlocks.Extensions;
using Microsoft.EntityFrameworkCore;
using Polly;
using Polly.Extensions.Http;
using Polly.Timeout;

var builder = WebApplication.CreateBuilder(args);

builder.AddCleanConsoleLogging();
Console.WriteLine("Working...");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IIdempotencyDbContext>(sp =>
    sp.GetRequiredService<AppDbContext>());

var retryPolicy = HttpPolicyExtensions
    .HandleTransientHttpError()
    .Or<TimeoutRejectedException>()
    .WaitAndRetryAsync(
        retryCount: 2,
        sleepDurationProvider: retryAttempt => TimeSpan.FromMilliseconds(200 * retryAttempt));

var circuitBreakerPolicy = HttpPolicyExtensions
    .HandleTransientHttpError()
    .Or<TimeoutRejectedException>()
    .CircuitBreakerAsync(
        handledEventsAllowedBeforeBreaking: 3,
        durationOfBreak: TimeSpan.FromSeconds(10));

var timeoutPolicy = Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(3));

builder.Services.AddHttpClient("ProductApi", client =>
{
    var productApiBaseUrl = builder.Configuration["ProductApi:BaseUrl"]
        ?? throw new InvalidOperationException("Configuração ProductApi:BaseUrl é obrigatória.");

    client.BaseAddress = new Uri(productApiBaseUrl);
})
.AddPolicyHandler(timeoutPolicy)
.AddPolicyHandler(retryPolicy)
.AddPolicyHandler(circuitBreakerPolicy);

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