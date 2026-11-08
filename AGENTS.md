# AGENTS.md

Instructions for AI coding agents (and humans) working in this repo: how Sparkboard is built and how it ships.
Code standards and branch naming are in [docs/code-quality.md](docs/code-quality.md). Read both before changing anything.

## What this is

Sparkboard is a community idea board, live at https://ideas.infrenic.com. People post ideas, vote, comment, and follow them on a roadmap. Writes need Google sign-in in production.

## Architecture

```
Browser (React SPA)
   │
   ├── Vercel CDN ── static build of apps/web
   └── /api/* ────── Vercel Python function (api/index.py) ── FastAPI app (apps/api) ── Neon Postgres
```

| Path | What lives there |
|---|---|
| `apps/api/` | FastAPI service. `src/sparkboard_api/` layers: `api/routers` (HTTP) → `services` (use cases, transactions) → `repositories` (all SQL) → `models.py` (tables). `schemas.py` holds Pydantic contracts, `core/` holds config, db, logging, rate limits, auth, `ai/` holds the LLM provider adapters |
| `apps/api/alembic/versions/` | database migrations, numbered `0001_…`, `0002_…` |
| `apps/web/` | React 19 SPA. `src/features/<feature>/` per product area, `src/ui/` shared components, `src/lib/` API client, queries and helpers |
| `tools/aiops/` | deploy health gate (`smoke`, `health`) and AI environment sizing (`envgen`) |
| `infra/docker/` | Dockerfiles + nginx config (local stack and Kubernetes) |
| `infra/helm/sparkboard/` | Kubernetes chart, per-cloud overlays in `values/` |
| `infra/terraform/` | `modules/`, `stacks/<target>`, `environments/` |
| `api/index.py`, `vercel.json`, `requirements.txt` | Vercel entry point and config. Vercel needs them at the repo root; don't move them |
| `docs/` | all documentation |

Rules that keep the architecture intact:

- **Dependencies point down only:** routers → services → repositories → models. Routers never run SQL; repositories never raise HTTP errors.
- **All SQL goes in `repositories/`**, through SQLAlchemy (parameterised). No raw string-built SQL.
- **The public contract is fixed:** `GET /api/ideas` and `POST /api/ideas` with `{"content": "..."}`, and the `ideas` table keeps `id, content, created_at`. Don't break them.
- **Config comes from environment variables** via `core/config.py` (pydantic-settings). Never hard-code URLs, keys or tokens.
- **The app is built per test:** `create_app(settings)` is a factory; don't add global state.
- **AI output is never executed.** Every model answer is a Pydantic object, checked by policy code, with a rules fallback when the model is down.
- API field names are `snake_case`; the web client uses them as-is.

More: [docs/architecture.md](docs/architecture.md).

## Deployment

**Vercel is the only live target.** There are two workflows:

| Workflow | When | Does |
|---|---|---|
| `.github/workflows/ci.yml` | every PR and push | static analysis, code scanning, tests (must all pass) |
| `.github/workflows/deploy-vercel.yml` | after CI passes on `main` | build → migrate → deploy without moving the domain → probe → health gate → promote, or block and open an incident |

Rules:

- **Ship by merging to `main`.** Don't deploy from a laptop except to fix a broken pipeline, and then only with `npx vercel deploy --prod` from the repo root after `make check`.
- **Migrations must be backward compatible** (expand → deploy → contract). They run before the new code takes traffic, so the old code must keep working on the new schema. Never drop or rename a column in the same release that stops using it.
- **After changing API dependencies, run `make requirements`.** Vercel installs from the root `requirements.txt`; a missing package takes production down (this happened on 2026-11-07). CI fails if the file is out of sync.
- **Never commit secrets.** They live in Vercel env vars and GitHub secrets. `.env` files are ignored; only `.env.example` is committed.
- **Never write to the production database by hand** (no ad-hoc SQL, seeds or test posts). If a smoke test writes to production, delete what it created.
- **Rollback:** run *Deploy · Vercel* from the Actions tab with `rollback: true`, or `vercel rollback`.

The Kubernetes setup (`infra/terraform/stacks/{aws,gcp,azure}` + `infra/helm`) is validated and scanned in CI but **not applied**, and there is no workflow for it. Keep it passing `make tf-validate` and the Helm checks when you touch it. Don't run `terraform apply` without explicit approval; it creates paid cloud resources.

More: [docs/deployment.md](docs/deployment.md).

## Before you open a PR

```bash
make check          # lint + types + tests (API tests need: make test-db)
make up && make e2e # if you changed UI or API behaviour
```

Name the branch per [docs/code-quality.md](docs/code-quality.md#branch-naming); CI rejects other names.
