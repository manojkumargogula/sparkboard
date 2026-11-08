# infra

Everything that builds, ships or provisions Sparkboard lives here. Application code lives in
`apps/`; the only infra files kept at the repo root are the ones tools look for there
(`docker-compose.yml`, `vercel.json`, `api/index.py`, `requirements.txt`).

```
infra/
  docker/                 container images
    api.Dockerfile        FastAPI (uv, slim, non-root, uvicorn)
    web.Dockerfile        Vite build → nginx-unprivileged
    nginx.conf            serves the app, proxies /api, security headers
  helm/sparkboard/        one chart for every Kubernetes target
    values.yaml           cloud-neutral defaults
    values/<target>.yaml  small per-target overlays: aws · gcp · azure
    templates/            api · web · HPA · ingress · migration job · network policy
  terraform/              see terraform/README.md
    modules/              reusable code: sizing · platform/{aws,gcp,azure} · app · vercel
    stacks/<target>/      what you apply: aws · gcp · azure · vercel
    environments/         the settings you apply it with
      <env>.intent.yaml   the need in plain language (budget, SLO, region)
      policy.yaml         guardrails the AI output is clamped to
      generated/          staging/production tfvars + Helm values from `aiops envgen`
```

How the pieces connect:

- `docker-compose.yml` and CI build `docker/*.Dockerfile` with the repo root as context.
- `terraform/modules/app` installs `helm/sparkboard` with `values/<cloud>.yaml` plus
  `terraform/environments/generated/<env>.values.yaml`.
- `terraform/stacks/<cloud>` is applied with `-var-file=../../environments/generated/<env>.tfvars`.

Checks: `make lint` (terraform fmt, helm lint), `make tf-validate` (every stack).
