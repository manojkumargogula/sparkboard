#!/usr/bin/env bash
# Run Sparkboard on a local Kubernetes cluster (kind) → http://localhost:8088
set -euo pipefail
cd "$(dirname "$0")/../.."

# 1. Cluster + ingress controller
kind create cluster --name sparkboard --config infra/kind/cluster.yaml || true
kubectl config use-context kind-sparkboard   # never touch any other cluster
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/kind/deploy.yaml
kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=180s

# 2. Build the images and load them into the cluster
docker build -t sparkboard-api:local -f infra/docker/api.Dockerfile .
docker build -t sparkboard-web:local -f infra/docker/web.Dockerfile .
kind load docker-image sparkboard-api:local sparkboard-web:local --name sparkboard

# 3. Postgres inside the cluster
kubectl create namespace sparkboard || true
kubectl -n sparkboard apply -f infra/kind/postgres.yaml
kubectl -n sparkboard rollout status statefulset/postgres --timeout=120s

# 4. The app
helm upgrade --install sparkboard infra/helm/sparkboard -n sparkboard \
  -f infra/helm/sparkboard/values/kind.yaml --wait --timeout 5m

echo "Sparkboard is up on http://localhost:8088"
