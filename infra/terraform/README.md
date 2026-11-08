# Infrastructure

```
modules/
  sizing/            size preset (small|medium|ha) → per-cloud machine & DB SKUs
  platform/aws       VPC + EKS + RDS Postgres + ECR      ┐ all expose the SAME outputs
  platform/gcp       VPC + GKE Autopilot + Cloud SQL + AR ├ (see "Platform contract")
  platform/azure     VNet + AKS + PG Flexible + ACR      ┘
  app/               cloud-neutral: namespace + secret + Helm release of infra/helm/sparkboard
  vercel/            Vercel project + env + domain, Neon Postgres (the live deployment)
stacks/<target>/     thin roots: provider auth + platform + app. Only tfvars differ.
```

## Platform contract

Every `modules/platform/<cloud>` takes `name`, `region`, `environment`, `size`, `tags`
and returns:

| output | meaning |
|---|---|
| `cluster_name` | Kubernetes cluster name |
| `kube_host`, `kube_ca_certificate` | API endpoint + CA for the `kubernetes`/`helm` providers |
| `database_url` (sensitive) | `postgresql://…?sslmode=require` reachable from the cluster |
| `registry_url` | where CI pushes `sparkboard-api` / `sparkboard-web` |
| `ingress_class` | ingress class the cloud's controller watches |
| `service_account_annotations` | workload identity binding for the app's pods |

`modules/app` consumes only those outputs, so adding a fourth cloud means writing one
`modules/platform/<cloud>` that satisfies the contract plus a ~60-line `stacks/<cloud>` root.

## Usage

```bash
cd stacks/gcp
cp example.tfvars terraform.tfvars        # project_id, region, size
terraform init && terraform plan
```

State backends are declared per root (S3 / GCS / azurerm); `make tf-validate` runs
`terraform init -backend=false && terraform validate` for every root.
