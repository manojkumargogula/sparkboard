# aiops

AI-assisted delivery tooling used by `.github/workflows`. Every command:

1. asks Claude for a **typed** answer (pydantic schema, structured outputs),
2. runs it through **deterministic policy** that can correct or override it,
3. falls back to **rules** when the model is unavailable, so AI never blocks a deploy.

| Command | Used by | What it does |
|---|---|---|
| `aiops plan` | `chatops.yml` | `/deploy staging on gcp` → allow-listed step plan |
| `aiops review` | `ai-review.yml` | PR diff → findings + risk label (policy floor can't be lowered) |
| `aiops smoke` | deploy workflows | read-only probes → latency/error JSON |
| `aiops health` | deploy workflows | SLOs + AI log/metric read → promote or rollback |
| `aiops envgen` | `ai-env-config.yml` | `environments/*.intent.yaml` → tfvars + Helm values PR |
| `aiops explain` | `ci.yml` | failed job log → probable cause + fix comment |

```bash
uv sync && uv run aiops plan --command "/deploy production on aws"
ANTHROPIC_API_KEY=... uv run aiops envgen --intent ../../environments/staging.intent.yaml
```
