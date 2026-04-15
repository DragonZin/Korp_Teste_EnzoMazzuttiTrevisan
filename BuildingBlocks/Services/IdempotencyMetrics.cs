using System.Diagnostics.Metrics;
using System.Threading;

namespace BuildingBlocks.Services;

public sealed class IdempotencyMetrics : IDisposable
{
    private readonly Meter _meter;
    private readonly ObservableGauge<long> _tableSizeGauge;
    private readonly ObservableGauge<double> _reuseRateGauge;

    private long _tableSize;
    private long _handledRequests;
    private long _reusedRequests;

    public IdempotencyMetrics()
    {
        _meter = new Meter("BuildingBlocks.Idempotency", "1.0.0");

        _tableSizeGauge = _meter.CreateObservableGauge(
            name: "idempotency.table.size",
            observeValue: () => Interlocked.Read(ref _tableSize),
            unit: "records",
            description: "Quantidade atual de registros na tabela de idempotência.");

        _reuseRateGauge = _meter.CreateObservableGauge(
            name: "idempotency.key.reuse_rate",
            observeValue: () => CalculateReuseRate(),
            unit: "ratio",
            description: "Taxa de reaproveitamento de Idempotency-Key sobre requisições idempotentes tratadas.");
    }

    public void RecordRequest(bool wasReused)
    {
        Interlocked.Increment(ref _handledRequests);

        if (wasReused)
        {
            Interlocked.Increment(ref _reusedRequests);
        }
    }

    public void UpdateTableSize(long size)
    {
        Interlocked.Exchange(ref _tableSize, size);
    }

    private double CalculateReuseRate()
    {
        var total = Interlocked.Read(ref _handledRequests);
        if (total == 0)
        {
            return 0;
        }

        var reused = Interlocked.Read(ref _reusedRequests);
        return reused / (double)total;
    }

    public void Dispose()
    {
        _tableSizeGauge.Dispose();
        _reuseRateGauge.Dispose();
        _meter.Dispose();
    }
}