project_id        = "my-gcp-project"
region            = "europe-west3"
size              = "small"
image_tag         = "REPLACE_WITH_GIT_SHA"
api_allowed_cidrs = ["203.0.113.0/24"] # your VPN / runner egress

# Deployment mode: "k8s" (managed Kubernetes + managed Postgres + Helm, uses
# api_allowed_cidrs) or "vm" (one VM: docker compose + Postgres + nginx).
deployment_mode = "k8s"
# vm mode only:
# ssh_public_key    = "ssh-ed25519 AAAA... deploy@sparkboard"
# ssh_allowed_cidrs = ["203.0.113.10/32"] # your IP / runner egress
