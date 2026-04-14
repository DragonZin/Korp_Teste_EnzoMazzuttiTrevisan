using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using BuildingBlocks.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Npgsql;


namespace BuildingBlocks.Middlewares;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    private readonly SharedApiOptions _options;

    public ErrorHandlingMiddleware(
        RequestDelegate next,
        ILogger<ErrorHandlingMiddleware> logger,
        IOptions<SharedApiOptions> options)
    {
        _next = next;
        _logger = logger;
        _options = options.Value;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex, _logger, _options);
        }
    }

    private static async Task HandleExceptionAsync(
        HttpContext context,
        Exception exception,
        ILogger<ErrorHandlingMiddleware> logger,
        SharedApiOptions options)
    {
        context.Response.ContentType = "application/problem+json";

        var exceptionTypeName = exception.GetType().Name;

        var (statusCode, type, title, detail) = exception switch
        {
            DbUpdateConcurrencyException => (
                (int)HttpStatusCode.Conflict,
                "https://httpstatuses.com/409",
                "Conflito de concorrência",
                "O recurso foi alterado por outro processo. Atualize os dados e tente novamente."
            ),
            DbUpdateException dbEx when IsUniqueViolation(dbEx) => (
                (int)HttpStatusCode.Conflict,
                "https://httpstatuses.com/409",
                "Conflito de dados",
                options.UniqueConstraintConflictDetail
            ),
            DbUpdateException => (
                (int)HttpStatusCode.InternalServerError,
                "https://httpstatuses.com/500",
                "Erro ao persistir dados",
                "Não foi possível salvar os dados no momento. Tente novamente mais tarde."
            ),
            _ when exceptionTypeName == "ValidationException" => (
                (int)HttpStatusCode.BadRequest,
                "https://httpstatuses.com/400",
                "Dados inválidos",
                exception.Message
            ),
            _ when exceptionTypeName == "NotFoundException" => (
                (int)HttpStatusCode.NotFound,
                "https://httpstatuses.com/404",
                "Recurso não encontrado",
                exception.Message
            ),
            _ => (
                (int)HttpStatusCode.InternalServerError,
                "https://httpstatuses.com/500",
                "Erro interno",
                "Ocorreu um erro interno. Tente novamente mais tarde."
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

        var response = new ProblemDetailsResponse
        {
            Type = type,
            Title = title,
            Status = statusCode,
            Detail = detail,
            Instance = context.Request.Path.ToString(),
            TraceId = traceId,
            Timestamp = DateTime.UtcNow,
            Errors = exceptionTypeName == "ValidationException" && exception.Data.Count > 0
                ? exception.Data
                : null
        };

        var jsonOptions = new JsonSerializerOptions
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
    }

    private static bool IsUniqueViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
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