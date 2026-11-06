#!/usr/bin/env bash
# Prove the Helm chart on a local Kubernetes cluster: kind + ingress-nginx +
# in-cluster Postgres + the exact images CI builds. Idempotent.
set -euo pipefail
cd "$(dirname "$0")/../.."

CLUSTER=sparkboard
NS=sparkboard
CTX="kind-${CLUSTER}"
k() { kubectl --context "$CTX" "$@"; }

kind get clusters | grep -qx "$CLUSTER" || kind create cluster --config deploy/kind/cluster.yaml

echo "› ingress-nginx"
k apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/kind/deploy.yaml >/dev/null
k -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=180s

echo "› images"
docker build -q -t sparkboard-api:local -f docker/api.Dockerfile . >/dev/null
docker build -q -t sparkboard-web:local -f docker/web.Dockerfile . >/dev/null
kind load docker-image sparkboard-api:local sparkboard-web:local --name "$CLUSTER"

echo "› postgres"
k create namespace "$NS" --dry-run=client -o yaml | k apply -f - >/dev/null
k -n "$NS" apply -f deploy/kind/postgres.yaml >/dev/null
k -n "$NS" rollout status statefulset/postgres --timeout=120s

echo "› helm"
helm --kube-context "$CTX" upgrade --install sparkboard deploy/helm/sparkboard \
  -n "$NS" -f deploy/helm/sparkboard/values-kind.yaml --wait --timeout 5m

echo "› smoke"
for i in $(seq 1 30); do
  curl -fsS http://localhost:8088/api/readyz >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS http://localhost:8088/api/readyz
echo
echo "Sparkboard is up on http://localhost:8088"
