# Development

**Needs:** Docker with Compose v2. For hot reload you also need [uv](https://docs.astral.sh/uv/) and Node 22.

## Run the whole stack in Docker

```bash
cp .env.example .env     # optional: AI key for "Sharpen", Google client ID
make up                  # db → api (runs migrations, then starts) → web, plus demo ideas
open http://localhost:8080
make down                # `docker compose down -v` also deletes the database
```

nginx serves the React app and proxies `/api` to the API, so the browser sees one origin.

```bash
curl -s localhost:8080/api/ideas                      # the brief's contract
curl -s -X POST localhost:8080/api/ideas -H 'Content-Type: application/json' -d '{"content":"My new idea"}'
```

If port 5432 is taken, run `DB_PORT=55432 make up`.

## Hot-reload development

```bash
make install    # uv sync + npm ci
make dev        # Postgres in Docker, API on :8000 with --reload, Vite on :5173 proxying /api
```

## Make targets

| Command | Does |
|---|---|
| `make up` / `make down` | full stack in Docker |
| `make dev` | hot-reload API + web |
| `make lint` | every static check CI runs |
| `make test-db` then `make test` | unit + integration tests (API tests use Postgres on :5433) |
| `make e2e` | Playwright against the running stack |
| `make check` | lint + test |
| `make requirements` | regenerate the root `requirements.txt` for Vercel. **Run it after changing API dependencies**; CI fails if it is out of sync |
| `make tf-validate` | validate every Terraform stack (no cloud credentials) |
| `make envgen` | regenerate the per-environment Terraform/Helm settings with AI (see [ai-ops.md](ai-ops.md)) |

## Database migrations

Migrations live in `apps/api/alembic/versions`. Create one with:

```bash
cd apps/api && uv run alembic revision -m "describe the change"
```

They run before new code takes traffic, so they must be backward compatible (expand → deploy → contract).

## Checks

`make check` runs the lint, type and test steps CI runs. See [ci.md](ci.md) for the full list, including the security scanners.
