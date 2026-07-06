# Accessibility Guide

## Standards

- WCAG 2.1 AA compliance
- Section 508 compliance
- ARIA best practices

## Keyboard Navigation

### Desktop App
| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+C | Copy to cloud |
| Ctrl+Shift+V | Paste from cloud |
| Ctrl+Shift+H | Show history |
| Ctrl+Shift+S | Settings |
| Ctrl+Shift+Q | Quit |

### Navigation
- Tab: Move forward
- Shift+Tab: Move backward
- Enter: Select/activate
- Escape: Close/cancel
- Arrow keys: Navigate lists

## Screen Reader Support

- All interactive elements have labels
- Images have alt text
- Form fields have descriptions
- Error messages are announced

## Color Contrast

- Normal text: 4.5:1 ratio
- Large text: 3:1 ratio
- UI components: 3:1 ratio

## Testing

```bash
# Run accessibility tests
npm run test:a11y

# Check with axe-core
npx axe-core cli --url http://localhost:3000
```

## Resources

- WCAG Guidelines
- ARIA Authoring Practices
- Web Accessibility Evaluation Tools
