namespace ProductsService.Contracts;

public class CreateProductRequest
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int Stock { get; set; }

    public int Price { get; set; }
}
