using System.Diagnostics.Metrics;
using System.Threading;

namespace BuildingBlocks.Services;

/// <summary>
/// Publishes runtime metrics related to idempotency processing.
/// </summary>
public sealed class IdempotencyMetrics : IDisposable
{
    private readonly Meter _meter;
    private readonly Counter<long> _totalRequests;
    private readonly Counter<long> _cacheHits;
    private readonly Counter<long> _cacheMisses;

    private long _inFlightRequests;
    private double _avgRequestDurationMs;

    public IdempotencyMetrics()
    {
        _meter = new Meter("BuildingBlocks.Idempotency", "1.0.0");

        _totalRequests = _meter.CreateCounter<long>("idempotency.requests.total");
        _cacheHits = _meter.CreateCounter<long>("idempotency.cache.hits.total");
        _cacheMisses = _meter.CreateCounter<long>("idempotency.cache.misses.total");

        // Observable instruments are owned by Meter and do not implement IDisposable.
        _meter.CreateObservableGauge("idempotency.requests.in_flight", () => Volatile.Read(ref _inFlightRequests));
        _meter.CreateObservableGauge("idempotency.request_duration.avg_ms", () => Volatile.Read(ref _avgRequestDurationMs));
    }

    public void RegisterRequest() => _totalRequests.Add(1);

    public void RegisterCacheHit() => _cacheHits.Add(1);

    public void RegisterCacheMiss() => _cacheMisses.Add(1);

    public void IncrementInFlight() => Interlocked.Increment(ref _inFlightRequests);

    public void DecrementInFlight() => Interlocked.Decrement(ref _inFlightRequests);

    public void SetAverageRequestDuration(double durationMs)
        => Volatile.Write(ref _avgRequestDurationMs, durationMs);

    public void Dispose()
    {
        _meter.Dispose();
    }
}