#!/usr/bin/env bash
# Deploy or roll back Sparkboard on a VM. Runs as root in /opt/sparkboard.
#
#   deploy.sh <image-tag>     pull, migrate, restart, health-check (auto-rollback on failure)
#   deploy.sh --rollback      go back to the previous tag
#
# Needs /opt/sparkboard/.env (written by the deploy workflow) with at least
# REGISTRY, DOMAIN and POSTGRES_PASSWORD.
# Testing hooks: SPARKBOARD_DIR (default /opt/sparkboard) and SKIP_HOST_SETUP=1
# (skip nginx, certbot and cron, which only exist on the VM).
set -euo pipefail
cd "${SPARKBOARD_DIR:-/opt/sparkboard}"

if [ "${1:-}" = "--rollback" ]; then
  tag=$(cat .prev_tag 2>/dev/null || true)
  [ -n "$tag" ] || { echo "no previous release to roll back to" >&2; exit 1; }
else
  tag=${1:?usage: deploy.sh <image-tag> | --rollback}
fi
current=$(cat .tag 2>/dev/null || true)
# shellcheck source=/dev/null
set -a && . ./.env && set +a

compose() { TAG="$1" docker compose --env-file .env "${@:2}"; }

healthy() {
  for _ in $(seq 1 30); do
    curl -fsS http://127.0.0.1:8080/api/readyz >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

echo "› deploying $tag (current: ${current:-none})"
compose "$tag" pull --quiet --policy missing
compose "$tag" up -d db
compose "$tag" run --rm api alembic upgrade head
compose "$tag" up -d --remove-orphans

if ! healthy; then
  echo "✗ $tag failed its health check" >&2
  if [ -n "$current" ] && [ "$current" != "$tag" ]; then
    echo "› rolling back to $current" >&2
    compose "$current" up -d --remove-orphans
    if healthy; then echo "✓ $current is serving again" >&2; else echo "✗ rollback to $current is unhealthy too" >&2; fi
  fi
  exit 1
fi
if [ -n "$current" ] && [ "$current" != "$tag" ]; then echo "$current" > .prev_tag; fi
echo "$tag" > .tag

if [ "${SKIP_HOST_SETUP:-0}" = "1" ]; then echo "✓ $tag is live (host setup skipped)"; exit 0; fi

# Host nginx in front, with HTTPS from Let's Encrypt once DNS points here.
sed "s/__DOMAIN__/$DOMAIN/g" nginx.conf > /etc/nginx/sites-available/sparkboard.conf
ln -sf /etc/nginx/sites-available/sparkboard.conf /etc/nginx/sites-enabled/sparkboard.conf
nginx -t && systemctl reload nginx
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  contact=(--register-unsafely-without-email)
  if [ -n "${CERTBOT_EMAIL:-}" ]; then contact=(-m "$CERTBOT_EMAIL"); fi
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect "${contact[@]}" \
    || echo "⚠ HTTPS not set up yet (is DNS for $DOMAIN pointing at this VM?); serving HTTP" >&2
fi

# Nightly database backup, 7 days kept.
cat > /etc/cron.d/sparkboard-backup <<'CRON'
15 3 * * * root docker exec sparkboard-db-1 pg_dump -U sparkboard sparkboard | gzip > /var/backups/sparkboard/sparkboard-$(date +\%F).sql.gz && find /var/backups/sparkboard -name '*.sql.gz' -mtime +7 -delete
CRON

docker image prune -f >/dev/null
echo "✓ $tag is live"
