terraform {
  required_version = ">= 1.9"
  required_providers {
    aws        = { source = "hashicorp/aws", version = "~> 5.80" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.35" }
    helm       = { source = "hashicorp/helm", version = "~> 2.17" }
  }
  backend "s3" {
    key          = "sparkboard/aws/terraform.tfstate"
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region
}

module "platform" {
  source      = "../../modules/platform/aws"
  name        = "${var.name}-${var.environment}"
  region      = var.region
  environment = var.environment
  size        = var.size

  api_allowed_cidrs = var.api_allowed_cidrs
}

locals {
  kube_exec = {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.platform.cluster_name, "--region", var.region]
  }
}

provider "kubernetes" {
  host                   = module.platform.kube_host
  cluster_ca_certificate = module.platform.kube_ca_certificate
  exec {
    api_version = local.kube_exec.api_version
    command     = local.kube_exec.command
    args        = local.kube_exec.args
  }
}

provider "helm" {
  kubernetes {
    host                   = module.platform.kube_host
    cluster_ca_certificate = module.platform.kube_ca_certificate
    exec {
      api_version = local.kube_exec.api_version
      command     = local.kube_exec.command
      args        = local.kube_exec.args
    }
  }
}

locals {
  # Replica counts generated from environments/<env>.intent.yaml by `aiops envgen`.
  env_values = "${path.root}/../../../../environments/generated/${var.environment}.values.yaml"
}

module "app" {
  source                      = "../../modules/app"
  extra_values                = fileexists(local.env_values) ? [file(local.env_values)] : []
  cloud                       = "aws"
  image_registry              = module.platform.registry_url
  image_tag                   = var.image_tag
  database_url                = module.platform.database_url
  ingress_class               = module.platform.ingress_class
  service_account_annotations = module.platform.service_account_annotations
  host                        = var.host
  ai_api_key                  = var.ai_api_key
  ai_provider                 = var.ai_api_key == "" ? "none" : "anthropic"
}
