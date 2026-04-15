using System.Text.RegularExpressions;

namespace ApiProduct.Services;

public static class IdempotencyEndpointMatcher
{
    private static readonly Regex ProductRouteRegex =
        new("^/api/products/?$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ProductInternalInventoryRouteRegex =
        new("^/api/products/internal/[0-9a-fA-F-]{36}/inventory/?$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static bool ShouldHandle(HttpRequest request)
    {
        var path = request.Path.Value ?? string.Empty;

        if (HttpMethods.IsPost(request.Method))
        {
            return ProductRouteRegex.IsMatch(path);
        }

        if (HttpMethods.IsPut(request.Method))
        {
            return ProductInternalInventoryRouteRegex.IsMatch(path);
        }

        return false;
    }
}