# AGENTS.md

Instructions for AI coding agents (and humans) working in this repo: how Sparkboard is built and how it ships.
Code standards and branch naming are in [docs/code-quality.md](docs/code-quality.md). Read both before changing anything.

## What this is

Sparkboard is a community idea board, live at https://ideas.infrenic.com. People post ideas, vote, comment, and follow them on a roadmap. Writes need Google sign-in in production.

## Architecture

```
Browser (React SPA)
   │
   ├── /*      ──── Vercel service "ui"      (static build of app/ui)
   └── /api/*  ──── Vercel service "backend" (FastAPI in app/backend) ── Neon Postgres
```

| Path | What lives there |
|---|---|
| `app/backend/` | FastAPI service. `src/sparkboard_api/` layers: `api/routers` (HTTP) → `services` (use cases, transactions) → `repositories` (all SQL) → `models.py` (tables). `schemas.py` holds Pydantic contracts, `core/` holds config, db, logging, rate limits, auth, `ai/` holds the LLM provider adapters |
| `app/backend/alembic/versions/` | database migrations, numbered `0001_…`, `0002_…` |
| `app/ui/` | React 19 SPA. `src/features/<feature>/` per product area, `src/ui/` shared components, `src/lib/` API client, queries and helpers |
| `tools/aiops/` | deploy health gate (`smoke`, `health`) and AI environment sizing (`envgen`) |
| `infra/docker/` | Dockerfiles + nginx config (local stack and Kubernetes) |
| `infra/vm/` | VM mode: production docker-compose, host nginx, deploy.sh (deploy/rollback), cloud-init |
| `infra/helm/sparkboard/` | Kubernetes chart, per-cloud overlays in `values/` |
| `infra/terraform/` | `modules/`, `stacks/<target>`, `environments/` |
| `vercel.json` | Vercel config: two services (`ui` → `app/ui`, `backend` → `app/backend`) and the public routes |
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

**Vercel is the live target; AWS, GCP and Azure are ready but not applied.** Workflows:

| Workflow | When | Does |
|---|---|---|
| `.github/workflows/ci.yml` | every PR and push | static analysis, code scanning, tests (must all pass) |
| `.github/workflows/ai.yml` | PRs, PR comments, intent changes | AI review + risk label, ChatOps `/deploy`, AI environment config |
| `.github/workflows/deploy-vercel.yml` | after CI passes on `main` | build → migrate → deploy without moving the domain → probe → health gate → promote, or block and open an incident |
| `.github/workflows/deploy-cloud.yml` | ChatOps or manual | AWS/GCP/Azure, VM (compose + nginx) or k8s (Helm): terraform apply → ship → probe → health gate → auto-rollback |

Rules:

- **Ship by merging to `main`.** Don't deploy from a laptop except to fix a broken pipeline, and then only with `npx vercel deploy --prod` from the repo root after `make check`.
- **Migrations must be backward compatible** (expand → deploy → contract). They run before the new code takes traffic, so the old code must keep working on the new schema. Never drop or rename a column in the same release that stops using it.
- **API dependencies:** add them with `uv add` in `app/backend` and commit `uv.lock`; Vercel installs the backend straight from it.
- **Never commit secrets.** They live in Vercel env vars and GitHub secrets. `.env` files are ignored; only `.env.example` is committed.
- **Never write to the production database by hand** (no ad-hoc SQL, seeds or test posts). If a smoke test writes to production, delete what it created.
- **Rollback:** run *Deploy · Vercel* from the Actions tab with `rollback: true`, or `vercel rollback`.

The cloud setup (`infra/terraform/stacks/{aws,gcp,azure}` with `deployment_mode = vm | k8s`, `infra/vm` for VMs, `infra/helm` for Kubernetes, deployed by `deploy-cloud.yml`) is validated, tested in both modes and scanned in CI but **not applied**. Keep `infra/vm/deploy.sh` idempotent: it must stay safe to re-run, and it rolls back on a failed health check. Keep it passing `make tf-validate` and the Helm checks when you touch it. Don't run `terraform apply` without explicit approval; it creates paid cloud resources.

More: [docs/deployment.md](docs/deployment.md).

## Before you open a PR

```bash
make check          # lint + types + tests (API tests need: make test-db)
make up && make e2e # if you changed UI or API behaviour
```

Name the branch per [docs/code-quality.md](docs/code-quality.md#branch-naming); CI rejects other names.
