namespace ApiProduct.Contracts;

public class AdjustProductInventoryRequest
{
    public int StockDelta { get; set; }

    public int ReservedStockDelta { get; set; }
}