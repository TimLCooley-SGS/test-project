# Database Setup

## Schema Overview

```
Organizations (multi-tenant)
    └── Users (first user = admin)
    └── Categories
    └── Suggestions
        └── Votes
    └── Integrations
        └── Push History
```

## Setup Instructions

### 1. Connect to your AWS RDS PostgreSQL instance

Using psql:
```bash
psql -h your-rds-endpoint.amazonaws.com -U your_username -d your_database
```

Or using a GUI tool like:
- pgAdmin
- DBeaver
- TablePlus

### 2. Run the schema migration

```bash
psql -h your-rds-endpoint.amazonaws.com -U your_username -d your_database -f database/schema.sql
```

Or copy/paste the contents of `schema.sql` into your SQL client.

### 3. (Optional) Run seed data for testing

```bash
psql -h your-rds-endpoint.amazonaws.com -U your_username -d your_database -f database/seed.sql
```

### 4. Set up environment variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your RDS connection details:
```
DATABASE_URL=postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/feature_roadmap
```

## Tables

| Table | Description |
|-------|-------------|
| `organizations` | Multi-tenant organizations with plan/billing info |
| `users` | Users belonging to an organization (admin or user role) |
| `categories` | Feature categories per organization |
| `suggestions` | Feature requests with status tracking |
| `votes` | User votes on suggestions |
| `integrations` | External tool connections (Jira, Linear, etc.) |
| `push_history` | Record of suggestions pushed to external tools |
| `sessions` | User authentication sessions |

## Key Relationships

- **Organization → Users**: One-to-many. First user to join becomes admin.
- **Organization → Categories**: One-to-many. Categories are scoped per org.
- **Organization → Suggestions**: One-to-many. Suggestions belong to one org.
- **Suggestion → Votes**: One-to-many. Users can vote once per suggestion.
- **User → Votes**: One-to-many. Track which users voted on what.

## Views

- `suggestions_with_votes`: Suggestions with vote count and impact score calculated

## Security Notes

1. **Password Storage**: Use bcrypt to hash passwords before storing
2. **Credentials**: Store integration credentials encrypted (config JSONB field)
3. **RDS Security**: Ensure your RDS instance is in a private subnet with proper security groups
4. **Environment Variables**: Never commit `.env` to version control
