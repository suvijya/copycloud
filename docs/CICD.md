# CI/CD Pipeline

## GitHub Actions

### Workflow Files

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run lint
```

## Stages

### 1. Lint
- ESLint for code quality
- Prettier for formatting
- TypeScript type checking

### 2. Test
- Unit tests
- Integration tests
- Coverage report

### 3. Build
- Compile TypeScript
- Bundle assets
- Generate docs

### 4. Deploy
- Staging (auto on main)
- Production (manual trigger)

## Environments

| Environment | Branch | Auto Deploy |
|-------------|--------|-------------|
| Development | feature/* | No |
| Staging | main | Yes |
| Production | release/* | Manual |

## Secrets

- DATABASE_URL
- JWT_SECRET
- API_KEY
- DEPLOY_TOKEN
