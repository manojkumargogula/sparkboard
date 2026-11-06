# syntax=docker/dockerfile:1.7
# Sparkboard web: static Vite build served by unprivileged nginx, which also
# reverse-proxies /api to the API so the browser sees a single origin.

FROM node:22-alpine AS build
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY apps/web ./
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.31-alpine AS runtime
LABEL org.opencontainers.image.title="sparkboard-web" \
      org.opencontainers.image.source="https://github.com/manojkumargogula/sparkboard" \
      org.opencontainers.image.licenses="MIT"
# The nginx image renders /etc/nginx/templates/*.template with envsubst at start.
ENV API_UPSTREAM=http://api:8000
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/nginx-health || exit 1
