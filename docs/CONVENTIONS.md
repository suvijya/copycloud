# Code Conventions

## Naming

### Files
- PascalCase for components: `ClipboardService.ts`
- camelCase for utilities: `formatDate.ts`
- kebab-case for configs: `eslint.config.js`

### Variables
- camelCase: `clipboardEntry`
- UPPER_SNAKE_CASE: `MAX_RETRY_COUNT`
- PascalCase: `ClipboardService`

### Functions
- camelCase: `getClipboardEntry()`
- Boolean: `isValid()`, `hasPermission()`
- Async: `fetchClipboard()`, `saveEntry()`

## Imports

```typescript
// 1. External packages
import React from 'react';
import { FastifyRequest } from 'fastify';

// 2. Internal modules
import { ClipboardEntry } from '../types';
import { validateToken } from '../auth';

// 3. Utils
import { formatDate } from '../utils';

// 4. Styles
import './styles.css';
```

## Comments

```typescript
/**
 * Saves a clipboard entry to the database.
 * 
 * @param entry - The clipboard entry to save
 * @returns The saved entry with ID
 * @throws {ValidationError} If entry is invalid
 */
async function saveEntry(entry: ClipboardEntry): Promise<SavedEntry> {
  // Implementation
}
```

## TypeScript

- Use strict mode
- Prefer interfaces over types
- Avoid `any` type
- Use enums for constants
