# One entry point for humans and CI. `make help` lists targets.
SHELL := /bin/bash
.DEFAULT_GOAL := help

API := apps/api
WEB := apps/web
AIOPS := tools/aiops
DB_URL := postgresql://sparkboard:sparkboard@localhost:$${DB_PORT:-5432}/sparkboard

help: ## Show this help
	@grep '##' Makefile | grep -v grep

install: ## Install all dependencies
	cd $(API) && uv sync
	cd $(AIOPS) && uv sync
	cd $(WEB) && npm ci

up: ## Run the full stack in Docker (http://localhost:8080) with demo data
	docker compose up -d --build --wait
	docker compose exec -T api python -m sparkboard_api.seed

down: ## Stop the stack
	docker compose down

dev: ## Hot-reload dev: Postgres in Docker, API + Vite on the host (http://localhost:5173)
	docker compose up -d db --wait
	cd $(API) && DATABASE_URL=$(DB_URL) uv run alembic upgrade head
	(cd $(API) && DATABASE_URL=$(DB_URL) LOG_JSON=false uv run uvicorn sparkboard_api.main:app --reload --port 8000) & \
	(cd $(WEB) && npm run dev); wait

lint: ## Every static check CI runs
	cd $(API) && uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run bandit -q -c pyproject.toml -r src
	cd $(AIOPS) && uv run ruff check . && uv run ruff format --check . && uv run mypy
	cd $(WEB) && npm run lint && npm run format:check && npm run typecheck
	terraform fmt -check -recursive infra/terraform
	helm lint infra/helm/sparkboard -f infra/helm/sparkboard/values/aws.yaml --set secrets.databaseUrl=postgresql://ci@db/ci

test-db: ## Throwaway Postgres for API tests on :5433
	docker run -d --rm --name sparkboard-testdb -e POSTGRES_USER=sparkboard -e POSTGRES_PASSWORD=sparkboard \
	  -e POSTGRES_DB=sparkboard_test -p 5433:5432 postgres:17-alpine

test: ## Unit + integration tests (API tests need `make test-db`)
	cd $(API) && uv run pytest
	cd $(AIOPS) && uv run pytest
	cd $(WEB) && npm test

e2e: ## Playwright against the running stack (`make up` first)
	cd $(WEB) && E2E_BASE_URL=http://localhost:8080 npx playwright test

check: lint test ## lint + test

requirements: ## Regenerate requirements.txt for Vercel (run after changing API dependencies)
	cd $(API) && uv export --frozen --no-dev --no-hashes --no-emit-project --format requirements-txt \
	  | grep -v '^#' | grep -v '^ ' > ../../requirements.txt

tf-validate: ## Check every Terraform stack (no cloud credentials needed)
	for stack in aws gcp azure vercel; do \
	  terraform -chdir=infra/terraform/stacks/$$stack init -backend=false && \
	  terraform -chdir=infra/terraform/stacks/$$stack validate || exit 1; \
	done

envgen: ## Regenerate environment configs from infra/terraform/environments/*.intent.yaml
	cd $(AIOPS) && for env in staging production; do \
	  uv run aiops envgen --intent ../../infra/terraform/environments/$$env.intent.yaml \
	    --policy ../../infra/terraform/environments/policy.yaml --out-dir ../../infra/terraform/environments/generated; \
	done

.PHONY: help install up down dev lint test-db test e2e check requirements tf-validate envgen
