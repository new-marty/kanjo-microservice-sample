# AGENTS.md

Guidance for AI coding agents working on this repository. Tool-agnostic — applies to Claude Code, Cursor, Copilot, etc.

## Code Boundaries

| App/Package            | Language    | Entry Point          | Notes                    |
| ---------------------- | ----------- | -------------------- | ------------------------ |
| `apps/api/`            | Go 1.23     | `cmd/server/main.go` | NOT a pnpm package       |
| `apps/web/`            | TypeScript  | `src/main.tsx`       | React 19 + Vite SPA      |
| `apps/mobile/`         | TypeScript  | `app/`               | Expo Router (deferred)   |
| `packages/api-client/` | TypeScript  | Generated            | Do not edit manually     |
| `packages/shared/`     | TypeScript  | `src/`               | Shared utilities         |
| `packages/ui/`         | TypeScript  | `src/`               | Shared UI components     |
| `jobs/scraper/`        | TypeScript  | `src/`               | Playwright-based scraper |
| `jobs/transform/`      | Python 3.12 | `src/transform/`     | Uses `uv`, not pip       |

## Code Generation

After changing these files, you **must** regenerate:

| Changed                          | Run                        |
| -------------------------------- | -------------------------- |
| `apps/api/db/queries/*.sql`      | `task generate:sqlc`       |
| `apps/api/internal/handler/*.go` | `task generate:openapi`    |
| `apps/api/api/openapi.yaml`      | `task generate:client`     |
| Any of the above                 | `task generate` (runs all) |

Never edit generated files directly: `apps/api/internal/repository/`, `packages/api-client/src/`.

## Testing

Before any PR or merge to main:

```bash
task format    # prettier + gofmt + goimports
task check     # lint + typecheck + test + knip
```

## Key Constraints

- **Package managers:** pnpm (TypeScript), uv (Python). Never npm, yarn, pip, or requirements.txt.
- **Financial amounts:** Integer yen only, never floating point.
- **Comments:** Only comment _why_, not _what_.
- **No overengineering:** Build only what's needed. Delete unused code completely.
- **Generated code in git:** `packages/api-client/` is committed to avoid CI tool dependencies.

## Documentation

- `CLAUDE.md` — Commands, patterns, and constraints for coding. Read this first.
- `docs/` — Architecture, principles, decisions. See [docs/README.md](docs/README.md) for navigation.
