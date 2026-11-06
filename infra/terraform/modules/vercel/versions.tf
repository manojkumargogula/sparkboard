terraform {
  required_version = ">= 1.9"
  required_providers {
    vercel = { source = "vercel/vercel", version = "~> 2.6" }
    neon   = { source = "kislerdm/neon", version = "~> 0.6" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}
