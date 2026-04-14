using System.Text.RegularExpressions;

namespace ApiProduct.Services;

public static class IdempotencyEndpointMatcher
{
    private static readonly Regex ProductRouteRegex =
        new("^/api/products/?$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static bool ShouldHandle(HttpRequest request)
    {
        if (!HttpMethods.IsPost(request.Method))
        {
            return false;
        }

        return ProductRouteRegex.IsMatch(request.Path.Value ?? string.Empty);
    }
}