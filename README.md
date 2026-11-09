# Sparkboard

**Drop an idea. Fan the best ones. Watch them ship.**
A community idea board by [Infrenic](https://infrenic.com): people post ideas, vote on them, discuss them, and follow them on a public roadmap from *Open* to *Shipped*.

- **Live:** https://ideas.infrenic.com (Vercel + Neon Postgres)
- **API docs:** https://ideas.infrenic.com/api/docs
- **Kubernetes:** one Helm chart and Terraform for AWS, GCP and Azure (validated, not applied)
- **Built by:** [Manoj Kumar Gogula](https://manojkumargogula.github.io)

![Sparkboard home page: "What should we build next?" with the three most-wanted problems as tickets](docs/images/hero.png)

## The product

Every team and community has more ideas than it can build. Feature requests get lost in chat threads, the same idea is posted five times, and nobody can see what happened to the one they voted for. Sparkboard gives those ideas one public home:

- **Post an idea** in a sentence. While you type, Sparkboard shows similar ideas that already exist, so people vote instead of reposting.
- **Vote** for the ideas you want. Each person gets one vote per idea, and voting needs a Google account, so the ranking reflects real people.
- **Discuss** on each idea's own shareable page.
- **Follow it to shipped** on the public roadmap: Open → Planned → Building → Shipped.

The board opens with 114 curated problems worth solving across 20 industries, ranked by score until the community's votes re-rank them. An optional AI **Sharpen** button rewrites a rough idea into a clear headline and description. Search, the command palette (`⌘K`) and keyboard shortcuts make it fast to get around, and it works just as well on a phone.

### Screenshots

| Top 10 problems | Every idea, filterable |
|---|---|
| ![Top 10 problems as a ranked grid of cards](docs/images/top-10.png) | ![All ideas table with topic filters and Heat / Rising / Newest sorting](docs/images/all-ideas.png) |

| Idea page with discussion | Public roadmap |
|---|---|
| ![An idea opened in a side sheet with votes, share and discussion](docs/images/idea.png) | ![Roadmap board with Open, Planned, Building and Shipped columns](docs/images/roadmap.png) |

<p align="center"><img src="docs/images/mobile.png" alt="Sparkboard on a phone" width="300"></p>

Full feature list and tech stack: [docs/product.md](docs/product.md).

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
app/
  backend/            FastAPI service (routers → services → repositories → models)
  ui/                 React SPA (features/, ui/, lib/)
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

## Author

Built by **Manoj Kumar Gogula**: design, frontend, backend, infrastructure and CI/CD.
Portfolio and other projects: **https://manojkumargogula.github.io**

## License

MIT © Infrenic
