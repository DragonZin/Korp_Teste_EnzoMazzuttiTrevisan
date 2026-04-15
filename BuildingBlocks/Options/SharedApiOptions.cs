using Microsoft.AspNetCore.Http;

namespace BuildingBlocks.Options;

public sealed class SharedApiOptions
{
    public const string SectionName = "SharedApi";

    public Func<HttpRequest, bool> ShouldHandleIdempotencyRequest { get; set; } = _ => false;
    public string UniqueConstraintConflictDetail { get; set; } = "Já existe um registro com esse identificador único.";

    /// <summary>
    /// Janela de retenção dos registros de idempotência.
    /// Registros mais antigos que essa duração serão removidos pelo job periódico.
    /// </summary>
    public TimeSpan IdempotencyRetentionWindow { get; set; } = TimeSpan.FromHours(72);

    /// <summary>
    /// Intervalo de execução do job de limpeza de registros de idempotência.
    /// </summary>
    public TimeSpan IdempotencyCleanupInterval { get; set; } = TimeSpan.FromMinutes(10);

    /// <summary>
    /// Quantidade máxima de registros expirados removidos por lote.
    /// </summary>
    public int IdempotencyCleanupBatchSize { get; set; } = 500;
}