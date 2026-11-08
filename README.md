# Sparkboard

**Drop an idea. Fan the best ones. Watch them ship.**
A community idea board by [Infrenic](https://infrenic.com): people post ideas, vote on them, discuss them, and follow them on a public roadmap from *Open* to *Shipped*.

- **Live:** https://ideas.infrenic.com (Vercel + Neon Postgres)
- **API docs:** https://ideas.infrenic.com/api/docs
- **Kubernetes:** one Helm chart and Terraform for AWS, GCP and Azure (validated, not applied)

## Quick start

Needs Docker with Compose v2.

```bash
git clone https://github.com/manojkumargogula/sparkboard && cd sparkboard
make up          # builds and starts db + api + web, loads demo ideas
open http://localhost:8080
make down
```

`make help` lists every command. Hot-reload development, tests and the quality gates are in [docs/development.md](docs/development.md).

## Repository layout

```
apps/
  api/                FastAPI service (routers → services → repositories → models)
  web/                React SPA (features/, ui/, lib/)
tools/aiops/          deploy health gate + AI environment sizing (deploy-vercel.yml, make envgen)
infra/
  docker/             Dockerfiles + nginx.conf
  helm/sparkboard/    Kubernetes chart, values/<cloud>.yaml per cloud
  terraform/          modules/ · stacks/<cloud> · environments/
docs/                 all documentation
.github/workflows/    ci.yml (static analysis, code scanning, tests) · deploy-vercel.yml

api/index.py, vercel.json, requirements.txt   Vercel entry point and config (Vercel needs them at the root)
docker-compose.yml, Makefile                   local stack and command entry point
```

## Documentation

AI coding agents: start with [AGENTS.md](AGENTS.md).


| Doc | What's in it |
|---|---|
| [Product](docs/product.md) | features and tech stack |
| [Architecture](docs/architecture.md) | system diagram, API layers, data model, security, trade-offs |
| [Development](docs/development.md) | run locally, make targets, tests, migrations |
| [CI and code scanning](docs/ci.md) | what every PR is checked for, and how to handle a finding |
| [Code quality](docs/code-quality.md) | coding standards, naming, branch and commit conventions |
| [Deployment](docs/deployment.md) | the Vercel pipeline, plus Terraform for Kubernetes on AWS / GCP / Azure |
| [AI operations](docs/ai-ops.md) | the deploy health gate and AI environment sizing |

## License

MIT © Infrenic
