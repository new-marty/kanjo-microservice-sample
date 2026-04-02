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
```

### Before Committing

```bash
# Format all code
task format

# Run all checks
task check      # Runs lint + test
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

4. Ship to main:
   ```bash
   task ship
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

### 5. Generate OpenAPI

```bash
task generate
```

## Testing

### Run All Tests

```bash
task test
```

### Run Specific Tests

```bash
cd apps/api && go test ./...
cd apps/api && go test ./internal/handler/... -run TestGetExample
```

## Linting

```bash
task lint
```

## Common Tasks

### Create a Database Migration

```bash
task migrate:create -- describe_your_change
```

### Add a Go Dependency

```bash
cd apps/api && go get <package>
```

## Environment Variables

### Required

| Variable       | Description                  | Example                                     |
| -------------- | ---------------------------- | ------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/kanjo` |

### Optional

| Variable     | Description     | Default |
| ------------ | --------------- | ------- |
| `PORT`       | API server port | `8080`  |
| `LOG_FORMAT` | Log format      | `text`  |

## Debugging

### Go API

Use `log.Printf` or add breakpoints in your IDE.

### Database Queries

Enable query logging in PostgreSQL:

```sql
SET log_statement = 'all';
```

## Troubleshooting

### Database Connection Issues

1. Ensure Docker is running
2. Check `DATABASE_URL` is correct
3. Restart the database: `task dev:db`

### Hot Reload Not Working

Restart `task dev:api`
