# CI and code scanning

The repo has two workflows:

| Workflow | Runs on | Does |
|---|---|---|
| `.github/workflows/ci.yml` | every PR, every push to `main`, weekly | static analysis, code scanning and tests. All jobs must pass before a merge |
| `.github/workflows/deploy-vercel.yml` | after CI passes on `main`, or by hand | deploys to Vercel (see [deployment.md](deployment.md)) |

## Code scanning

| Job | Tool | Finds | Fails on |
|---|---|---|---|
| `sast` | **Semgrep** (`p/default`, `p/python`, `p/typescript`, `p/react`, `p/dockerfile`) | injection, XSS, insecure crypto, risky React and FastAPI patterns, Terraform and workflow misconfigurations | any finding |
| `trivy` | **Trivy** filesystem scan | vulnerable dependencies (`uv.lock`, `package-lock.json`), IaC misconfigurations (Terraform, Helm, Dockerfiles), committed secrets | HIGH or CRITICAL (lower severities are reported, not blocking) |
| `secrets` | **gitleaks** | secrets anywhere in git history | any finding |
| `images` | **Trivy** image scan | OS and library CVEs in the built api and web images | fixable HIGH or CRITICAL |

Semgrep and Trivy results are uploaded as SARIF, so they also appear in the repo under **Security → Code scanning** with file and line links. The weekly run catches new CVEs in code that hasn't changed.

## Static analysis and tests

| Job | Checks |
|---|---|
| `api` | `ruff` lint + format, `mypy --strict`, `bandit` (security lint), `pip-audit`, `pytest` against real Postgres (≥ 85 % coverage), `requirements.txt` in sync with `uv.lock` |
| `web` | `eslint` (typescript-eslint strict type-checked + `jsx-a11y` + React hooks), `prettier`, `tsc`, `npm audit`, `vitest` with coverage thresholds, production build, bundle budget (230 kB gzipped) |
| `aiops` | `ruff`, `mypy --strict`, `pytest` (≥ 85 % coverage) |
| `infra` | `hadolint` (Dockerfiles), `actionlint` + shellcheck (workflows), `terraform fmt` + `validate` (every stack), `tflint`, `helm lint` + `kubeconform` (every cloud) |
| `e2e` | Playwright on desktop and mobile against `docker compose up` |

Run the same lint, type and test steps locally with `make check`.

## Supply-chain hardening

- Every action is pinned to a full commit SHA (the tag is kept in a comment); Dependabot updates the pins.
- Dependabot waits 7 days before proposing a new release, which avoids most compromised packages (they are usually yanked within days).
- Each job gets only the `permissions` it needs; secrets are scoped to the deploy job, not the whole workflow.

## When a scanner flags something

1. **Fix it** if it is real. This is almost always the answer.
2. **Suppress it** only if it is a false positive or the fix would break the app, and always say why on the same line:
   - Semgrep: `# nosemgrep: <rule-id>` with a reason, on the line above or the flagged line.
   - Trivy IaC: add the check ID with a reason to `infra/.trivyignore`.

Current reviewed suppressions:

| Where | Rule | Why |
|---|---|---|
| `infra/docker/nginx.conf` | nginx `missing-internal` | `/api/` is a public reverse proxy to a fixed upstream; `internal` would make it unreachable |
| `app/backend/.../api/deps.py` | `directly-returned-format-string` | the string is a rate-limit key, never rendered as HTML |
| `infra/terraform/modules/platform/gcp` | Cloud SQL client certificates (Semgrep + `AVD-GCP-0015`) | TLS is already required (`ENCRYPTED_ONLY`); the app authenticates with a password over TLS |
| `infra/.trivyignore` | `AVD-AWS-0040`, `AVD-AWS-0104` | EKS endpoint is CIDR-restricted; worker egress is required to reach ECR/STS |
