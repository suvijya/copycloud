# Frequently Asked Questions

## General

### What is CopyCloud?
CopyCloud is a cross-device clipboard sync application. Copy text on one device, paste it on another.

### Which platforms are supported?
- Windows (Electron)
- macOS (Electron)
- Linux (Electron)
- iOS (React Native)
- Android (React Native)

### Is it free?
Yes, CopyCloud is open-source and free to use.

## Technical

### How does sync work?
Devices connect to a central server via WebSocket. When you copy text, it's sent to the server and broadcast to all connected devices.

### Is my data encrypted?
Yes, all communication uses HTTPS/WSS. Clipboard data is not stored permanently on the server.

### What's the max clipboard size?
- Text: 100KB
- Images: 5MB
- Files: 50MB (coming soon)

### Can I use it offline?
No, an internet connection is required for sync between devices.

## Development

### How do I contribute?
See CONTRIBUTING.md for guidelines.

### Where do I report bugs?
Open an issue on GitHub with the bug report template.

### How do I run tests?
```bash
npm test
```
