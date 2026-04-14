using System.Text.RegularExpressions;

namespace ApiInvoice.Services;

public static class IdempotencyEndpointMatcher
{
    private static readonly Regex InvoiceCreateRouteRegex =
        new("^/api/invoices/?$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex InvoiceCloseRouteRegex =
        new("^/api/invoices/[0-9a-fA-F-]{36}/close/?$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static bool ShouldHandle(HttpRequest request)
    {
        var path = request.Path.Value ?? string.Empty;

        return (HttpMethods.IsPost(request.Method) && InvoiceCreateRouteRegex.IsMatch(path))
               || (HttpMethods.IsPut(request.Method) && InvoiceCloseRouteRegex.IsMatch(path));
    }
}