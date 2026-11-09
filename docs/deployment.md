# Deployment

| Target | Status |
|---|---|
| **Vercel + Neon** | Live at https://ideas.infrenic.com, deployed by `deploy-vercel.yml` |
| Kubernetes on AWS / GCP / Azure | Terraform, Helm chart and `deploy-k8s.yml` written, validated and scanned in CI; not applied yet |

## Vercel (the live target)

### How a deploy works

`deploy-vercel.yml` runs after `ci.yml` passes on `main` (only for pushes, not the weekly scan). You can also run it from the Actions tab to deploy a preview, deploy production, or roll production back.

1. Probe the live site for a baseline.
2. `vercel build`.
3. Run database migrations (direct, non-pooled connection). They run before traffic shifts, so they must be backward compatible.
4. Deploy production **without moving the domain** (`--skip-domain`).
5. Probe the new deployment and collect its logs.
6. Health gate: SLO thresholds, then the model (Nemotron via NVIDIA) reads metrics and logs (see [ai-ops.md](ai-ops.md)).
7. Pass: `vercel promote` moves the domain with zero downtime. Fail: traffic stays on the old release and an incident issue is opened.

### One-time setup

1. **Project and database.** Apply `infra/terraform/stacks/vercel` (needs `VERCEL_API_TOKEN` and `NEON_API_KEY`), or by hand: `vercel link`, then add Neon Postgres from the Vercel Marketplace.
2. **Vercel env vars** (Production + Preview): `DATABASE_URL` (pooled), `DB_SERVERLESS=true`, `ENVIRONMENT`, `ADMIN_TOKEN`, `GOOGLE_CLIENT_ID`, `AUTH_REQUIRED=true`, and optionally `AI_PROVIDER=anthropic` + `AI_API_KEY`.
3. **GitHub settings:**

   | Name | Purpose |
   |---|---|
   | secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Vercel CLI from Actions |
   | secrets `DATABASE_URL_UNPOOLED`, `PREVIEW_DATABASE_URL_UNPOOLED` | migrations |
   | secret `NVIDIA_API_KEY` *(optional)* | the model (NVIDIA API) for the AI health gate and other AI features; without it the rules decide. `ANTHROPIC_API_KEY` switches to Claude |
   | secret `VERCEL_AUTOMATION_BYPASS_SECRET` *(optional)* | lets probes reach protected preview URLs |
   | variable `PUBLIC_URL` | `https://ideas.infrenic.com` |
   | environment `production` | required reviewers: the human approval before production |

4. **Google sign-in client.** Google Cloud → Google Auth Platform → Clients → *Web application*. Add the site and `http://localhost:5173` as Authorized JavaScript origins (no redirect URI or secret needed), and publish the app.

`vercel.json` defines two services in one project: `ui` (root `app/ui`, Vite) and `backend` (root `app/backend`, FastAPI, installed from `uv.lock`). They build and deploy together, so the UI and API can never be out of sync.

## Kubernetes on AWS / GCP / Azure (not applied yet)

1. **Once per cloud:** create a Terraform state bucket and a GitHub OIDC trust for a deploy identity (IAM role on AWS, Workload Identity Federation on GCP, federated app registration on Azure).
2. **Repository variables:** `TF_BACKEND_CONFIG` plus `AWS_DEPLOY_ROLE_ARN` + `AWS_REGION`, or `GCP_WIF_PROVIDER` + `GCP_DEPLOY_SA` + `GCP_PROJECT_ID` + `GCP_REGION`, or `AZURE_CLIENT_ID` + `AZURE_TENANT_ID` + `AZURE_SUBSCRIPTION_ID`.
3. **First apply** by hand:

```bash
cd infra/terraform/stacks/azure                 # or aws / gcp
cp example.tfvars terraform.tfvars              # region, size, image_tag (+ project_id on GCP)
terraform init -backend-config="bucket=my-tf-state"
terraform apply -var-file=../../environments/generated/production.tfvars
```

This creates the network, managed Kubernetes, managed Postgres and an image registry, then installs the Helm chart.

4. **After that, deploy from GitHub:** *Deploy · Kubernetes* in the Actions tab, or a PR comment such as `/deploy on gcp`. The workflow logs in with OIDC, builds and pushes both images, runs `terraform apply` (atomic Helm release), probes the ingress, runs the AI health gate and rolls back with `helm rollback` if it fails. The run summary shows the public URL.

### Layout

```
infra/
  .trivyignore            reviewed exceptions for the Trivy IaC scan
  docker/
    api.Dockerfile        FastAPI on uvicorn, non-root
    web.Dockerfile        Vite build served by nginx-unprivileged
    nginx.conf            serves the SPA, proxies /api, security headers
  helm/sparkboard/
    values.yaml           cloud-neutral defaults
    values/<cloud>.yaml   small per-cloud overlays (ingress class, annotations)
    templates/            api · web · autoscaling · ingress · migration job · network policy
  terraform/
    modules/              reusable code
      sizing/             small | medium | ha → each cloud's machine and database SKUs
      platform/<cloud>/   network + Kubernetes + Postgres + registry, same outputs on every cloud
      app/                namespace + secret + Helm release (no cloud-specific code)
      vercel/             Vercel project + env + domain, Neon Postgres
    stacks/<target>/      what you apply: aws · gcp · azure · vercel
    environments/         one environment (production), shared by every cloud
      production.intent.yaml   the need in plain language (availability, budget, traffic)
      policy.yaml              limits the AI sizing must stay within
      generated/               production.tfvars (size) + production.values.yaml (replicas), cloud-neutral
```

### How it stays cloud-agnostic

**A platform contract.** Each `modules/platform/<cloud>` takes `name`, `region`, `environment`, `size`, `tags` and returns the same outputs:

| Output | Meaning |
|---|---|
| `cluster_name` | Kubernetes cluster name |
| `kube_host`, `kube_ca_certificate` | API endpoint + CA for the `kubernetes` and `helm` providers |
| `database_url` (sensitive) | `postgresql://…?sslmode=require`, reachable from the cluster |
| `registry_url` | where the `sparkboard-api` and `sparkboard-web` images go |
| `ingress_class` | the ingress class the cloud's controller watches |
| `service_account_annotations` | workload identity binding for the app's pods |

| | AWS | GCP | Azure |
|---|---|---|---|
| Kubernetes | EKS (managed node group, IRSA) | GKE Autopilot (private nodes) | AKS (autoscaling pool, workload identity, RBAC) |
| Postgres | RDS 17, Multi-AZ when `ha`, logs to CloudWatch | Cloud SQL 17, private IP, TLS required | Flexible Server 17, VNet-injected |
| Registry | ECR (immutable, scan on push) | Artifact Registry | ACR |
| Ingress | ALB | GCE | App Routing (managed nginx) |

**A cloud-neutral app layer.** `modules/app` uses only those outputs to install the same Helm chart, so it has no cloud-specific code.

**One word for capacity.** `size = small | medium | ha`, mapped to each cloud's SKUs by `modules/sizing`.

**Adding a cloud** (say DigitalOcean): write `modules/platform/digitalocean` with the same outputs, add a `stacks/digitalocean` root and a `values/digitalocean.yaml`. Nothing else changes.

Each stack declares its own state backend (S3 / GCS / azurerm). `make tf-validate` checks every stack without cloud credentials.
