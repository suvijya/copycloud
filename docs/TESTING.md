# Testing Guide

## Test Types

### Unit Tests
Test individual functions and modules.

```bash
npm run test:unit
```

### Integration Tests
Test API endpoints and database queries.

```bash
npm run test:integration
```

### E2E Tests
Test complete user flows.

```bash
npm run test:e2e
```

## Writing Tests

### Test Structure
```typescript
describe('ClipboardService', () => {
  it('should save clipboard entry', async () => {
    // Arrange
    const entry = { content: 'test' };
    
    // Act
    const result = await clipboardService.save(entry);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.content).toBe('test');
  });
});
```

### Best Practices
- One assertion per test
- Use descriptive test names
- Mock external dependencies
- Test edge cases
- Aim for 80%+ coverage

## Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.
