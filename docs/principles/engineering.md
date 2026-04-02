# Engineering Principles

## Package Managers

- **TypeScript:** Always `pnpm`, never `npm` or `yarn`
- **Python:** Always `uv` with `pyproject.toml`, never `pip` or `requirements.txt`

## Comments

Only comment _why_, not _what_. Do not add comments that restate the code.

## Clean Code

- Remove excessive logs, debug statements, and unnecessary comments before PRs
- No overengineering — only build what's needed
- If stuck or unsure, ask the human rather than guessing

## Error Handling

- **TypeScript:** Use `neverthrow` for Result types in shared package
- **Python:** Use Pydantic for validation, structlog for logging, pydantic-settings for config

## Validation

- **TypeScript:** Valibot for runtime validation
- **Python:** Pydantic models

## Workspace Conventions

- Workspace imports use `workspace:*` in package.json dependencies
- Generated code (api-client) is kept in git to avoid CI tool dependencies
- ESLint configs are per-app (not shared) to avoid tsconfig resolution issues

## Security

- Database credentials via environment variables, never hardcoded
- No sensitive data in client-side storage
- CORS configured for specific origins
- Session-based authentication (planned)
