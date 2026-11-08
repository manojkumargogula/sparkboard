# AI operations

`tools/aiops` is a small Python CLI with three commands:

| Command | Used by | Does |
|---|---|---|
| `aiops smoke` | `deploy-vercel.yml` | read-only probes of a deployment → error rate, p50/p95 latency (JSON) |
| `aiops health` | `deploy-vercel.yml` | decides promote or block from the probe results, the previous release and the runtime logs |
| `aiops envgen` | `make envgen` | turns a plain-language environment intent into Terraform tfvars + Helm values |

**Design rule: the model proposes, deterministic code decides.** Every AI answer is a typed object validated by a Pydantic schema. Policy code can correct or override it, and if the model is unavailable each command falls back to rules. The AI can make a decision smarter but can never make it unsafe or block a rollback.

## Deploy health gate

After each Vercel deploy, and before the domain moves:

1. **SLOs first** (no AI): error rate ≤ 1 %, p95 ≤ 2.5 s, and p95 no more than 1.5× the live release. Any breach blocks the release.
2. **Claude reads the metrics and logs** for what thresholds miss: a new exception type, a database pool warning, one slow endpoint. It blocks only when it is at least 80 % confident.
3. Without `ANTHROPIC_API_KEY`, or if the model is down, the SLOs alone decide.

A blocked release never takes traffic: the old release keeps the domain and an incident issue is opened with the summary.

## Environment sizing

`infra/terraform/environments/staging.intent.yaml` describes the need, not the build: *"cost-sensitive staging for QA and demos, best-effort, $300/month, ~3 rps"*. `make envgen` asks Claude for a size and replica counts, then:

- clamps them to `infra/terraform/environments/policy.yaml` (allowed sizes, replica caps, ≥ 2 replicas for critical environments);
- steps the size down until a deterministic cost estimate fits the budget;
- writes `generated/<env>.tfvars` and `generated/<env>.values.yaml`.

Commit the result through a normal PR. Current output: staging → `small` (~$204/month), production → `ha` with ≥ 2 replicas per tier (~$1,472/month).

## In the product

The composer's **Sharpen** button uses the same pattern inside the API (`app/backend/src/sparkboard_api/ai/`, Anthropic or any OpenAI-compatible endpoint). It is rate-limited, treats user text as data, and is hidden when no AI key is configured.

## Running it

```bash
cd tools/aiops && uv sync
uv run aiops smoke --url https://ideas.infrenic.com --out smoke.json
uv run aiops health --current smoke.json
```
