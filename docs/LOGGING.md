# Logging Guide

## Log Levels

| Level | Usage |
|-------|-------|
| ERROR | System errors, crashes |
| WARN | Potential issues |
| INFO | Normal operations |
| DEBUG | Development debugging |

## Format

```
[2026-06-29 12:00:00] INFO: Server started on port 3001
[2026-06-29 12:00:01] DEBUG: WebSocket connection from device abc123
[2026-06-29 12:00:02] INFO: User suvijya logged in
[2026-06-29 12:00:03] WARN: Rate limit exceeded for IP 192.168.1.1
[2026-06-29 12:00:04] ERROR: Database connection failed
```

## Configuration

```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

## Best Practices

- Use appropriate log levels
- Include context (user ID, request ID)
- Never log sensitive data
- Rotate logs daily
- Monitor error rates
