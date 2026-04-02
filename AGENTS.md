# AGENTS.md

Guidance for AI coding agents working on this repository. Tool-agnostic — applies to Claude Code, Cursor, Copilot, etc.

## Code Boundaries

| App/Package       | Language    | Entry Point          | Notes                    |
| ----------------- | ----------- | -------------------- | ------------------------ |
| `apps/api/`       | Go 1.24     | `cmd/server/main.go` | NOT a pnpm package       |
| `jobs/scraper/`   | TypeScript  | `src/`               | Playwright-based scraper |
| `jobs/transform/` | Python 3.12 | `src/transform/`     | Uses `uv`, not pip       |

## Code Generation

After changing these files, you **must** regenerate:

| Changed                          | Run                        |
| -------------------------------- | -------------------------- |
| `apps/api/db/queries/*.sql`      | `task generate:sqlc`       |
| `apps/api/internal/handler/*.go` | `task generate:openapi`    |
| Any of the above                 | `task generate` (runs all) |

Never edit generated files directly: `apps/api/internal/repository/`.

## Testing

Before any PR or merge to main:

```bash
task format    # gofmt + goimports
task check     # lint + test
```

## Key Constraints

- **Package managers:** pnpm (TypeScript jobs), uv (Python). Never npm, yarn, pip, or requirements.txt.
- **Financial amounts:** Integer yen only, never floating point.
- **Comments:** Only comment _why_, not _what_.
- **No overengineering:** Build only what's needed. Delete unused code completely.

## Documentation

- `CLAUDE.md` — Commands, patterns, and constraints for coding. Read this first.
- `docs/` — Architecture, principles, decisions. See [docs/README.md](docs/README.md) for navigation.
