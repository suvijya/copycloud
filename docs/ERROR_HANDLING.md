# Error Handling Guide

## Error Types

### Authentication Errors (401)
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### Validation Errors (400)
```json
{
  "error": "Bad Request",
  "message": "Invalid email format",
  "field": "email"
}
```

### Not Found (404)
```json
{
  "error": "Not Found",
  "message": "Clipboard entry not found"
}
```

### Server Error (500)
```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_001 | Invalid credentials |
| AUTH_002 | Token expired |
| AUTH_003 | Account locked |
| CLIP_001 | Content too large |
| CLIP_002 | Invalid content type |
| SYNC_001 | Sync failed |
| SYNC_002 | Device not connected |

## Client Handling

```typescript
try {
  await api.copy(entry);
} catch (error) {
  if (error.status === 401) {
    redirectToLogin();
  } else if (error.status === 400) {
    showError(error.message);
  } else {
    showGenericError();
  }
}
```
