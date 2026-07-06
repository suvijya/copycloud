# Database Schema

## Tables

### users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR | User email |
| password_hash | VARCHAR | Bcrypt hash |
| created_at | TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | Last update |

### clipboard_entries
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| content | TEXT | Clipboard content |
| type | ENUM | text, image, file |
| created_at | TIMESTAMP | Entry creation |

### devices
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| name | VARCHAR | Device name |
| platform | VARCHAR | OS platform |
| last_seen | TIMESTAMP | Last activity |

## Indexes

- users: email (unique)
- clipboard_entries: user_id, created_at
- devices: user_id

## Migrations

```bash
npm run db:migrate
npm run db:rollback
```
