namespace ApiInvoice.Models;

public class IdempotencyKeyRecord
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public DateTime CreatedAt { get; set; }
}