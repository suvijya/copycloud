# Scaling Guide

## Horizontal Scaling

### Server Instances
- Load balancer distributes traffic
- Session affinity not required
- Shared Redis for state

```yaml
# docker-compose.scale.yml
services:
  server:
    deploy:
      replicas: 3
```

### Database
- Read replicas for queries
- Write master for mutations
- Connection pooling

## Vertical Scaling

### Resources
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 2GB | 8GB |
| Storage | 20GB SSD | 100GB SSD |

### Node.js Settings
```bash
# Increase memory limit
node --max-old-space-size=4096 server.js

# Cluster mode
node -i max server.js
```

## Caching

### Redis
- Session storage
- Rate limiting
- Pub/Sub for WebSocket

### CDN
- Static assets
- API responses (where appropriate)

## Queue System

### Use Cases
- Bulk clipboard operations
- File uploads
- Analytics processing

### Implementation
- BullMQ for job queues
- Redis for broker
- Priority levels

## Load Testing

```bash
# Artillery
artillery run load-test.yml

# k6
k6 run --vus 100 --duration 30s script.js
```
