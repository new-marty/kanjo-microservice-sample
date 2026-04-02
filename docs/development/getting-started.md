# Getting Started

This guide will help you set up Kanjo for local development.

## Prerequisites

- **Go** 1.24+
- **Docker** and Docker Compose
- **Task** (task runner) - [Install](https://taskfile.dev/installation/)
- **pnpm** 9.15.4+ (for scraper job only)
- **uv** (for transform job only)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/new-marty/Kanjo.git
cd Kanjo
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgres://dev:dev@localhost:5432/kanjo?sslmode=disable
```

### 3. Start the Database

```bash
task dev:db
```

This starts PostgreSQL in a Docker container.

### 4. Run Database Migrations

```bash
task migrate
```

### 5. Start the API Server

```bash
task dev:api   # Go API on http://localhost:8080
```

Or start everything (db + api):

```bash
task dev
```

## Verification

The API health check is at http://localhost:8080/health

## Common Issues

### Port Already in Use

```bash
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill
```

### Database Connection Failed

Ensure Docker is running and the database container is up:

```bash
docker ps | grep postgres
task dev:db
```

## Next Steps

- Read the [Architecture Guide](../architecture/overview.md) to understand the system design
- Check the [API Reference](../../apps/api/api/openapi.yaml) for endpoint documentation (OpenAPI spec)
