# AI operations

`tools/aiops` is one typed Python CLI shared by every workflow:

| Command | Used by | Does |
|---|---|---|
| `aiops plan` | `ai.yml` (ChatOps) | PR comment → typed deploy plan of allow-listed steps |
| `aiops review` | `ai.yml` (review) | PR diff → findings + `risk:*` label, with a floor the model can't lower |
| `aiops envgen` | `ai.yml` (env-config), `make envgen` | plain-language environment intent → cloud-neutral tfvars + Helm values |
| `aiops smoke` | deploy workflows | read-only probes of a deployment → error rate, p50/p95 (JSON) |
| `aiops health` | deploy workflows | SLOs + the model's read of metrics and logs → promote or roll back |
| `aiops explain` | `ci.yml` | failed CI log → failing step, probable cause, suggested fix |

**Design rule: the model proposes, deterministic code decides.** Every AI answer is a typed object validated against a Pydantic schema. Policy code can correct or override it, and every command falls back to rules when the model is unavailable.

**Model:** GLM 5.3 Flash (`z-ai/glm-5.3-flash`) via NVIDIA's OpenAI-compatible API, with the `NVIDIA_API_KEY` repository secret. The model is asked for one JSON object matching the schema; reasoning tags and code fences are stripped and the result is validated. Set `ANTHROPIC_API_KEY` to use Claude instead (native structured outputs), or `AIOPS_PROVIDER` / `AIOPS_BASE_URL` / `AIOPS_MODEL` for another OpenAI-compatible endpoint. With no key, everything runs on rules. AI can make a decision smarter but never unsafe, and it can never block a deploy or a rollback.

## ChatOps deploy planner

Comment on a PR (owners, members and collaborators only):

| Comment | Result |
|---|---|
| `/deploy preview` | Vercel preview deployment of the PR |
| `/deploy production` | Vercel production, after the `production` environment approval |
| `/deploy on gcp` (or `aws`, `azure`) | Kubernetes deploy to that cloud's production environment |
| `/rollback production` | roll the production release back |
| `/plan <plain English>` | post the plan only, run nothing |

The model returns a `DeployPlan`: environment, target and steps from a fixed list (`build, test, migrate, deploy, smoke, health_gate, promote, rollback`). Policy then overrides anything that contradicts what the human literally typed, forces the mandatory step order, allows `preview` only on Vercel (each cloud has one environment, `production`), and requires approval for production. The plan is posted on the PR and executed by the matching deploy workflow.

## AI PR review and risk gate

Every non-draft PR diff gets a structured review (findings per file, risk reasons, suggested tests) as a sticky comment, plus a `risk:low|medium|high` label. Path rules set a floor: migrations and Terraform are always high; workflows, Helm, Docker, `vercel.json`, auth/config code and lockfiles at least medium. The model can raise risk but never lower it. The `risk-gate` job requires two approvals on high-risk PRs.

## Environment sizing (one environment, every cloud)

`infra/terraform/environments/production.intent.yaml` describes the need: *"high-availability production for a public launch, survive a zone outage, $2,500/month, ~120 rps"*. `aiops envgen` asks the model for a size and replica ranges, then:

- clamps them to `policy.yaml` (allowed sizes, replica caps, ≥ 2 replicas for critical availability);
- steps the size down until a deterministic cost estimate fits the budget on the most expensive of AWS, GCP and Azure;
- writes cloud-neutral `generated/production.tfvars` (size) and `generated/production.values.yaml` (replicas). Regions stay in each stack's own `terraform.tfvars`.

Changing the intent on `main` makes `ai.yml` open a PR with the regenerated files. Current output: `ha`, API 4–12 and web 2–6 replicas.

## Deploy health gate

After each deploy, before users get the new release:

1. **SLOs first** (no AI): error rate ≤ 1 %, a p95 latency ceiling, and p95 no more than 1.5× the previous release. Any breach blocks the release.
2. **The model reads the metrics and logs** for what thresholds miss: a new exception type, a database pool warning, one slow endpoint. It blocks only when at least 80 % confident.
3. Without the key, or if the model is down, the SLOs alone decide.

On Vercel the domain only moves after the gate passes. On Kubernetes the Helm release is atomic and a failed gate runs `helm rollback`. Both open an incident issue with the model's summary.

## CI failure explainer

When a CI job fails on a PR, the failed log tail goes to the model, which posts the failing step, probable cause and a fix as a sticky comment. Without AI it reports the first error line.

## In the product

The composer's **Sharpen** button uses the same pattern inside the API (`app/backend/src/sparkboard_api/ai/`, Anthropic or any OpenAI-compatible endpoint). It is rate-limited, treats user text as data, and is hidden when no AI key is configured.

## Running it locally

```bash
cd tools/aiops && uv sync
uv run aiops plan --command "/deploy on gcp"
uv run aiops smoke --url https://ideas.infrenic.com --out smoke.json
uv run aiops health --current smoke.json
make envgen        # from the repo root; uses NVIDIA_API_KEY (or ANTHROPIC_API_KEY) if set
```
