# Build: compile the React app into /app/dist
FROM node:22-alpine AS build
WORKDIR /app
COPY app/ui/package.json app/ui/package-lock.json ./
RUN npm ci
COPY app/ui ./
RUN npm run build

# Run: serve it with nginx (which also proxies /api to the API)
FROM nginxinc/nginx-unprivileged:1.29-alpine
ENV API_UPSTREAM=http://api:8000
# Install OS security fixes the base image doesn't have yet
USER root
# hadolint ignore=DL3017
RUN apk upgrade --no-cache
COPY infra/docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
