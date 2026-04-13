using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using ProductsService.Exceptions;

namespace ProductsService.Middlewares;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(
        RequestDelegate next,
        ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex, _logger);
        }
    }

    private static async Task HandleExceptionAsync(
        HttpContext context,
        Exception exception,
        ILogger<ErrorHandlingMiddleware> logger)
    {
        context.Response.ContentType = "application/problem+json";

        var (statusCode, type, title) = exception switch
        {
            ValidationException => (
                (int)HttpStatusCode.BadRequest,
                "https://httpstatuses.com/400",
                "Dados inválidos"
            ),
            NotFoundException => (
                (int)HttpStatusCode.NotFound,
                "https://httpstatuses.com/404",
                "Recurso não encontrado"
            ),
            _ => (
                (int)HttpStatusCode.InternalServerError,
                "https://httpstatuses.com/500",
                "Erro interno"
            )
        };

        context.Response.StatusCode = statusCode;
        var traceId = context.TraceIdentifier;

        logger.LogError(
            exception,
            "Erro processando requisição. StatusCode: {StatusCode}, ExceptionType: {ExceptionType}, ExceptionMessage: {ExceptionMessage}, TraceId: {TraceId}",
            statusCode,
            exception.GetType().Name,
            exception.Message,
            traceId);

        var detail = statusCode == (int)HttpStatusCode.InternalServerError
            ? "Ocorreu um erro interno. Tente novamente mais tarde."
            : exception.Message;

        var response = new ProblemDetailsResponse
        {
            Type = type,
            Title = title,
            Status = statusCode,
            Detail = detail,
            Instance = context.Request.Path.ToString(),
            TraceId = traceId,
            Timestamp = DateTime.UtcNow,
            Errors = exception is ValidationException && exception.Data.Count > 0
                ? exception.Data
                : null
        };

        var options = new JsonSerializerOptions
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
    }

    private sealed class ProblemDetailsResponse
    {
        [JsonPropertyName("type")]
        public string Type { get; init; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; init; } = string.Empty;

        [JsonPropertyName("status")]
        public int Status { get; init; }

        [JsonPropertyName("detail")]
        public string Detail { get; init; } = string.Empty;

        [JsonPropertyName("instance")]
        public string Instance { get; init; } = string.Empty;

        [JsonPropertyName("traceId")]
        public string TraceId { get; init; } = string.Empty;

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; init; }

        [JsonPropertyName("errors")]
        public object? Errors { get; init; }
    }
}