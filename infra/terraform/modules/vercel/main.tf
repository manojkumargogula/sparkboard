# Serverless target: static SPA on Vercel's CDN + FastAPI as a Python function,
# backed by Neon serverless Postgres. Same app, same contract, no cluster.

variable "name" {
  type    = string
  default = "sparkboard"
}

variable "github_repo" {
  type        = string
  description = "owner/repo connected to the Vercel project."
}

variable "domain" {
  type    = string
  default = ""
}

variable "neon_region" {
  type    = string
  default = "aws-eu-central-1"
}

variable "google_client_id" {
  type        = string
  default     = ""
  description = "Public OAuth client ID for Continue with Google; enables AUTH_REQUIRED."
}

variable "ai_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

resource "neon_project" "db" {
  name                      = var.name
  region_id                 = var.neon_region
  pg_version                = 17
  history_retention_seconds = 86400
}

resource "random_password" "admin" {
  length  = 40
  special = false
}

resource "vercel_project" "this" {
  name      = var.name
  framework = null
  git_repository = {
    type = "github"
    repo = var.github_repo
  }
  # Builds happen in GitHub Actions (vercel build --prebuilt); the pipeline owns deploys.
  ignore_command = "exit 0"
}

locals {
  env = {
    DATABASE_URL  = { value = neon_project.db.connection_uri_pooler, sensitive = true }
    DB_SERVERLESS = { value = "true", sensitive = false }
    ENVIRONMENT   = { value = "production", sensitive = false }
    ADMIN_TOKEN   = { value = random_password.admin.result, sensitive = true }
    AI_PROVIDER   = { value = var.ai_api_key == "" ? "none" : "anthropic", sensitive = false }
    AI_API_KEY    = { value = var.ai_api_key, sensitive = true }
    AUTH_REQUIRED = { value = var.google_client_id == "" ? "false" : "true", sensitive = false }
  }
  # Optional keys, added only when set (keys must not depend on sensitive values).
  optional_env = var.google_client_id == "" ? {} : {
    GOOGLE_CLIENT_ID = { value = var.google_client_id, sensitive = false }
  }
  all_env = merge(local.env, local.optional_env)
}

resource "vercel_project_environment_variable" "env" {
  # Keys are not secret; only whether the AI key is set decides the set of keys.
  for_each   = setsubtract(keys(local.all_env), nonsensitive(var.ai_api_key == "") ? ["AI_API_KEY"] : [])
  project_id = vercel_project.this.id
  key        = each.key
  value      = local.all_env[each.key].value
  sensitive  = local.all_env[each.key].sensitive
  target     = ["production", "preview"]
}

resource "vercel_project_domain" "this" {
  count      = var.domain == "" ? 0 : 1
  project_id = vercel_project.this.id
  domain     = var.domain
}

output "project_id" { value = vercel_project.this.id }
output "database_url_direct" {
  description = "Non-pooled URL for migrations."
  value       = neon_project.db.connection_uri
  sensitive   = true
}
