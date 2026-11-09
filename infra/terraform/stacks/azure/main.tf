terraform {
  required_version = ">= 1.9"
  required_providers {
    azurerm    = { source = "hashicorp/azurerm", version = "~> 4.14" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.35" }
    helm       = { source = "hashicorp/helm", version = "~> 2.17" }
  }
  backend "azurerm" {
    key = "sparkboard/azure.tfstate"
  }
}

provider "azurerm" {
  features {}
}

module "platform" {
  count       = local.k8s ? 1 : 0
  source      = "../../modules/platform/azure"
  name        = "${var.name}-${var.environment}"
  region      = var.region
  environment = var.environment
  size        = var.size

  api_allowed_cidrs = var.api_allowed_cidrs
}

provider "kubernetes" {
  host                   = try(module.platform[0].kube_host, null)
  cluster_ca_certificate = try(module.platform[0].kube_ca_certificate, null)
  client_certificate     = try(module.platform[0].kube_client_certificate, null)
  client_key             = try(module.platform[0].kube_client_key, null)
}

provider "helm" {
  kubernetes {
    host                   = try(module.platform[0].kube_host, null)
    cluster_ca_certificate = try(module.platform[0].kube_ca_certificate, null)
    client_certificate     = try(module.platform[0].kube_client_certificate, null)
    client_key             = try(module.platform[0].kube_client_key, null)
  }
}

locals {
  k8s = var.deployment_mode == "k8s"
}

# deployment_mode = "vm": one VM running docker compose (Postgres + API + web) behind
# nginx. The app itself is shipped by deploy-cloud.yml (infra/vm/deploy.sh over SSH).
module "vm" {
  source            = "../../modules/vm/azure"
  count             = local.k8s ? 0 : 1
  name              = "${var.name}-${var.environment}"
  region            = var.region
  environment       = var.environment
  size              = var.size
  ssh_public_key    = var.ssh_public_key
  ssh_allowed_cidrs = var.ssh_allowed_cidrs
}

locals {
  # Replica counts generated from infra/terraform/environments/production.intent.yaml by `aiops envgen`.
  env_values = "${path.root}/../../environments/generated/${var.environment}.values.yaml"
}

module "app" {
  count                       = local.k8s ? 1 : 0
  source                      = "../../modules/app"
  extra_values                = fileexists(local.env_values) ? [file(local.env_values)] : []
  cloud                       = "azure"
  image_registry              = module.platform[0].registry_url
  image_tag                   = var.image_tag
  database_url                = module.platform[0].database_url
  ingress_class               = module.platform[0].ingress_class
  service_account_annotations = module.platform[0].service_account_annotations
  host                        = var.host
  ai_api_key                  = var.ai_api_key
  ai_provider                 = var.ai_api_key == "" ? "none" : "anthropic"
}
