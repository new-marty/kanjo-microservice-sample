# Development Guide

This guide covers the development workflow, code generation, and best practices for contributing to Kanjo.

## Development Workflow

### Daily Development

```bash
# Start all services
task dev

# Or start individually
task dev:db     # PostgreSQL
task dev:api    # Go API (with hot reload via air)
task dev:web    # Vite dev server
```

### Before Committing

```bash
# Format all code
task format

# Run all checks
task check      # Runs lint + typecheck + test + knip
```

### Git Workflow

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature
   ```

2. Make commits with clear messages

3. Ensure all checks pass:

   ```bash
   task check
   ```

4. Merge to main:
   ```bash
   git checkout main
   git merge feature/your-feature
   git push
   ```

## Code Generation

### SQL to Go (sqlc)

When you modify SQL queries in `apps/api/db/queries/`:

```bash
task generate:sqlc
```

This generates Go repository code in `apps/api/internal/repository/`.

### Go to OpenAPI

When you modify Go handlers:

```bash
task generate:openapi
```

This updates `apps/api/api/openapi.yaml`.

### OpenAPI to TypeScript

When the OpenAPI spec changes:

```bash
task generate:client
```

This generates React Query hooks in `packages/api-client/`.

### All at Once

```bash
task generate   # Runs all generation steps
```

## Adding a New API Endpoint

### 1. Add SQL Query (if needed)

```sql
-- apps/api/db/queries/example.sql

-- name: GetExampleByID :one
SELECT * FROM examples WHERE id = $1;

-- name: ListExamples :many
SELECT * FROM examples ORDER BY created_at DESC LIMIT $1 OFFSET $2;
```

### 2. Generate Repository Code

```bash
task generate:sqlc
```

### 3. Create Handler

```go
// apps/api/internal/handler/example.go
package handler

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

type ExampleHandler struct {
    // dependencies
}

// GetExample godoc
// @Summary Get an example
// @Tags examples
// @Produce json
// @Param id path int true "Example ID"
// @Success 200 {object} Example
// @Router /examples/{id} [get]
func (h *ExampleHandler) GetExample(c *gin.Context) {
    // implementation
}
```

### 4. Register Route

```go
// apps/api/cmd/server/main.go
func setupRoutes(r *gin.Engine) {
    // ...
    examples := r.Group("/examples")
    {
        examples.GET("/:id", exampleHandler.GetExample)
    }
}
```

### 5. Generate OpenAPI and Client

```bash
task generate
```

### 6. Use in Frontend

```tsx
import { useGetExample } from '@repo/api-client';

function ExampleComponent({ id }: { id: number }) {
  const { data, isLoading } = useGetExample(id);
  // ...
}
```

## Adding a New Frontend Route

### 1. Create Route File

```tsx
// apps/web/src/routes/reports.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/reports')({
  component: Reports,
});

function Reports() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      {/* content */}
    </div>
  );
}
```

### 2. Add to Sidebar (if needed)

```tsx
// apps/web/src/components/layout/sidebar.tsx
const navItems = [
  // ...existing items
  { to: '/reports', icon: FileText, label: 'Reports' },
];
```

### 3. Add Page Title

```tsx
// apps/web/src/routes/__root.tsx
const titles: Record<string, string> = {
  // ...existing titles
  '/reports': 'レポート',
};
```

## Adding a shadcn/ui Component

```bash
cd apps/web
npx shadcn@latest add dialog
```

The component will be added to `apps/web/src/components/ui/`.

## Testing

### Run All Tests

```bash
task test
```

### Run Specific Tests

```bash
# Frontend tests
cd apps/web && pnpm test

# Backend tests
cd apps/api && go test ./...
```

### Watch Mode

```bash
cd apps/web && pnpm test:watch
```

## Linting

### Run All Linters

```bash
task lint
```

### Fix Auto-Fixable Issues

```bash
# ESLint
pnpm lint --fix

# Go
gofmt -w .
```

## Common Tasks

### Add a New Dependency

```bash
# Root workspace
pnpm add -w <package>

# Specific app
pnpm add -F @repo/web <package>

# Shared package
pnpm add -F @repo/shared <package>
```

### Update Dependencies

```bash
pnpm update
```

### Find Unused Exports

```bash
task knip
```

### Create a Database Migration

```bash
task migrate:create -- describe_your_change
```

## Environment Variables

### Required

| Variable       | Description                  | Example                                     |
| -------------- | ---------------------------- | ------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/kanjo` |

### Optional

| Variable       | Description          | Default                 |
| -------------- | -------------------- | ----------------------- |
| `API_PORT`     | API server port      | `8080`                  |
| `VITE_API_URL` | API URL for frontend | `http://localhost:8080` |

## Debugging

### Go API

Use `log.Printf` or add breakpoints in your IDE.

```go
log.Printf("Debug: value = %v", value)
```

### React Frontend

Use React DevTools and browser DevTools.

```tsx
console.log('Debug:', value);
```

### Database Queries

Enable query logging in PostgreSQL:

```sql
SET log_statement = 'all';
```

## Performance Tips

### Frontend

- Use `React.memo` for expensive components
- Use `useMemo` for expensive calculations
- Lazy load routes with code splitting (automatic with TanStack Router)

### Backend

- Use database indexes for frequently queried columns
- Batch database operations when possible
- Use connection pooling (built into database/sql)

## Troubleshooting

### "Module not found" Errors

```bash
rm -rf node_modules
pnpm install
```

### TypeScript Errors After Generation

```bash
task generate
pnpm typecheck
```

### Database Connection Issues

1. Ensure Docker is running
2. Check `DATABASE_URL` is correct
3. Restart the database: `task dev:db`

### Hot Reload Not Working

- Go: Restart `task dev:api`
- React: Check Vite terminal for errors
