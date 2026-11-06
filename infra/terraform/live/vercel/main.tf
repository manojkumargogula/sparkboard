terraform {
  required_version = ">= 1.9"
  required_providers {
    vercel = { source = "vercel/vercel", version = "~> 2.6" }
    neon   = { source = "kislerdm/neon", version = "~> 0.6" }
  }
}

# VERCEL_API_TOKEN and NEON_API_KEY come from the environment.
provider "vercel" {}
provider "neon" {}

variable "github_repo" {
  type    = string
  default = "manojkumargogula/sparkboard"
}

variable "domain" {
  type    = string
  default = "ideas.infrenic.com"
}

variable "ai_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

module "vercel" {
  source      = "../../modules/vercel"
  github_repo = var.github_repo
  domain      = var.domain
  ai_api_key  = var.ai_api_key
}

output "project_id" { value = module.vercel.project_id }
