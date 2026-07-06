# Monitoring Guide

## Metrics

### Server Metrics
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (%)
- Active connections
- Memory usage
- CPU usage

### Business Metrics
- Active users
- Daily clipboard syncs
- Average sync latency
- Device distribution

## Tools

### Prometheus
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'copycloud'
    static_configs:
      - targets: ['localhost:3001']
```

### Grafana Dashboard
- Real-time metrics
- Historical trends
- Alert rules

## Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| High Error Rate | > 5% for 5min | Page on-call |
| High Latency | p95 > 1s for 5min | Investigate |
| Memory High | > 80% for 10min | Scale up |
| Disk Low | < 20% free | Clean up |

## Logging

```typescript
// Structured logging
logger.info('Clipboard sync', {
  userId: user.id,
  deviceId: device.id,
  latency: Date.now() - start,
});
```
