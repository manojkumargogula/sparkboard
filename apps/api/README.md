# sparkboard-api

FastAPI service for Sparkboard. See the repository README for architecture and setup.

```bash
uv sync
uv run alembic upgrade head
uv run uvicorn sparkboard_api.main:app --reload
uv run pytest   # needs Postgres on :5433 (make test-db)
```
