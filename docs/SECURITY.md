# Security Architecture

## Authentication Flow

1. User registers with email/password
2. Password is hashed with bcrypt (12 rounds)
3. Server generates JWT token (24h expiry)
4. Token is stored client-side
5. All API requests include Authorization header

## Data Protection

### In Transit
- HTTPS/TLS 1.3 for all API calls
- WSS (WebSocket Secure) for real-time sync

### At Rest
- No sensitive data stored on server
- Clipboard data is ephemeral
- Database uses encrypted connections

## Token Management

- Access tokens expire after 24 hours
- Refresh tokens expire after 7 days
- Tokens are invalidated on logout
- Concurrent session limit: 5 devices

## Rate Limiting

- API: 100 requests per minute
- Auth: 10 attempts per minute
- WebSocket: 1000 messages per minute
