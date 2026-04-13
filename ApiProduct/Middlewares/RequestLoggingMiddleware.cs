using System.Diagnostics;
using System.Text;

namespace ApiProduct.Middlewares;

public class RequestLoggingMiddleware
{
    private const int MaxBodyLength = 1000;

    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var requestBody = await ReadRequestBodyAsync(context.Request);

        try
        {
            await _next(context);

            stopwatch.Stop();

            _logger.LogInformation(
                "HTTP {Method} {Path} | Status: {StatusCode} | {ElapsedMs}ms | Body: {Body}",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds,
                requestBody);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                ex,
                "HTTP {Method} {Path} | Status: 500 | {ElapsedMs}ms | Body: {Body}",
                context.Request.Method,
                context.Request.Path,
                stopwatch.ElapsedMilliseconds,
                requestBody);

            throw;
        }
    }

    private static async Task<string> ReadRequestBodyAsync(HttpRequest request)
    {
        if (request.ContentLength is null or 0 ||
            !request.Body.CanRead ||
            !(HttpMethods.IsPost(request.Method) ||
              HttpMethods.IsPut(request.Method) ||
              HttpMethods.IsPatch(request.Method)))
        {
            return "-";
        }

        request.EnableBuffering();

        using var reader = new StreamReader(
            request.Body,
            Encoding.UTF8,
            detectEncodingFromByteOrderMarks: false,
            leaveOpen: true);

        var rawBody = await reader.ReadToEndAsync();
        request.Body.Position = 0;

        if (string.IsNullOrWhiteSpace(rawBody))
        {
            return "-";
        }

        return rawBody.Length > MaxBodyLength
            ? $"{rawBody[..MaxBodyLength]}...(truncado)"
            : rawBody;
    }
}