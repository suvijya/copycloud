# WebSocket Protocol

## Connection

```
wss://api.copycloud.app/ws?token=JWT_TOKEN
```

## Message Format

```json
{
  "type": "clipboard_update",
  "payload": {
    "content": "text content",
    "type": "text",
    "timestamp": "2026-06-29T12:00:00Z"
  }
}
```

## Message Types

### Client → Server

| Type | Description |
|------|-------------|
| clipboard_update | New clipboard content |
| heartbeat | Keep-alive ping |
| device_info | Device identification |

### Server → Client

| Type | Description |
|------|-------------|
| clipboard_sync | Sync clipboard from another device |
| device_list | List of connected devices |
| error | Error message |

## Events

### On Connect
1. Server validates JWT
2. Registers device
3. Sends device list

### On Clipboard Update
1. Client sends clipboard_update
2. Server validates and stores
3. Server broadcasts to other devices

### On Disconnect
1. Server removes device from active list
2. Cleanup resources

## Reconnection

- Exponential backoff: 1s, 2s, 4s, 8s...
- Max retry: 30s
- Max attempts: 10
