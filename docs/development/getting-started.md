# Getting Started

This guide will help you set up Kanjo for local development.

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 9.15.4+
- **Go** 1.23+
- **Docker** and Docker Compose
- **Task** (task runner) - [Install](https://taskfile.dev/installation/)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/new-marty/Kanjo.git
cd Kanjo
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgres://kanjo:kanjo@localhost:5432/kanjo?sslmode=disable

# API
API_PORT=8080

# Web
VITE_API_URL=http://localhost:8080
```

### 4. Start the Database

```bash
task dev:db
```

This starts PostgreSQL in a Docker container.

### 5. Run Database Migrations

```bash
task migrate
```

### 6. Start Development Servers

```bash
# Start all services
task dev

# Or start individually
task dev:api   # Go API on http://localhost:8080
task dev:web   # Vite on http://localhost:3000
```

## Verification

1. Open http://localhost:3000 in your browser
2. You should see the Kanjo dashboard with mock data
3. The API health check is at http://localhost:8080/health

## Common Issues

### Port Already in Use

```bash
# Find and kill process on port 8080
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill

# Find and kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill
```

### Database Connection Failed

Ensure Docker is running and the database container is up:

```bash
docker ps | grep kanjo-db
```

If not running:

```bash
task dev:db
```

### Dependencies Not Found

Clear and reinstall:

```bash
rm -rf node_modules
pnpm install
```

## Next Steps

- Read the [Architecture Guide](../architecture/overview.md) to understand the system design
- Check the [API Reference](../../apps/api/api/openapi.yaml) for endpoint documentation (OpenAPI spec)
- See the [Frontend Guide](../architecture/apps/web/overview.md) for UI development
