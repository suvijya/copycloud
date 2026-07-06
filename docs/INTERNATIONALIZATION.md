# Internationalization (i18n)

## Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English | en | Complete |
| Spanish | es | In Progress |
| French | fr | Planned |
| German | de | Planned |
| Japanese | ja | Planned |
| Hindi | hi | Planned |

## Adding a Language

1. Create `locales/{code}.json`
2. Add translations
3. Update language selector
4. Test all strings

## Translation Keys

```json
{
  "app": {
    "name": "CopyCloud",
    "tagline": "Sync your clipboard"
  },
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout"
  },
  "clipboard": {
    "copy": "Copy",
    "paste": "Paste",
    "clear": "Clear History"
  }
}
```

## Usage

```typescript
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('app.name')}</h1>;
}
```
