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
  source      = "../../modules/platform/azure"
  name        = "${var.name}-${var.environment}"
  region      = var.region
  environment = var.environment
  size        = var.size

  api_allowed_cidrs = var.api_allowed_cidrs
}

provider "kubernetes" {
  host                   = module.platform.kube_host
  cluster_ca_certificate = module.platform.kube_ca_certificate
  client_certificate     = module.platform.kube_client_certificate
  client_key             = module.platform.kube_client_key
}

provider "helm" {
  kubernetes {
    host                   = module.platform.kube_host
    cluster_ca_certificate = module.platform.kube_ca_certificate
    client_certificate     = module.platform.kube_client_certificate
    client_key             = module.platform.kube_client_key
  }
}

locals {
  # Replica counts generated from infra/terraform/environments/<env>.intent.yaml by `aiops envgen`.
  env_values = "${path.root}/../../environments/generated/${var.environment}.values.yaml"
}

module "app" {
  source                      = "../../modules/app"
  extra_values                = fileexists(local.env_values) ? [file(local.env_values)] : []
  cloud                       = "azure"
  image_registry              = module.platform.registry_url
  image_tag                   = var.image_tag
  database_url                = module.platform.database_url
  ingress_class               = module.platform.ingress_class
  service_account_annotations = module.platform.service_account_annotations
  host                        = var.host
  ai_api_key                  = var.ai_api_key
  ai_provider                 = var.ai_api_key == "" ? "none" : "anthropic"
}
