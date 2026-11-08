# Build: install the API and its dependencies into /app/.venv
FROM python:3.12-slim-bookworm AS build
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /usr/local/bin/uv
WORKDIR /app
COPY apps/api ./
RUN uv sync --frozen --no-dev --no-editable

# Run: copy only the virtualenv and migrations
FROM python:3.12-slim-bookworm
WORKDIR /app
COPY --from=build /app/.venv ./.venv
COPY apps/api/alembic.ini ./
COPY apps/api/alembic ./alembic
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
USER 10001
EXPOSE 8000
CMD ["uvicorn", "sparkboard_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--no-server-header", "--proxy-headers", "--forwarded-allow-ips", "*"]
