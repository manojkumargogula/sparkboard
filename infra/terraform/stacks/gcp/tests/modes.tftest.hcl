# Runs the stack in both deployment modes against mocked providers (nothing is
# created, no cloud account needed) and checks that each mode creates only its own resources.

mock_provider "google" {
  mock_data "google_compute_zones" {
    defaults = { names = ["europe-west3-a", "europe-west3-b"] }
  }
  mock_resource "google_container_cluster" {
    defaults = {
      endpoint    = "203.0.113.20"
      master_auth = [{ cluster_ca_certificate = "Y2VydA==" }]
    }
  }
}
mock_provider "kubernetes" {}
mock_provider "helm" {}
mock_provider "random" {}

variables {
  region     = "europe-west3"
  image_tag  = "abc1234"
  project_id = "demo-project"
}

run "vm_mode_creates_one_vm_and_no_cluster" {
  command = apply
  variables {
    deployment_mode   = "vm"
    ssh_public_key    = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGA4p2C7dv8iISNyLKmr30O7ic/O0iQj1hv7Ry+cPPbo deploy@sparkboard"
    ssh_allowed_cidrs = ["203.0.113.10/32"]
  }
  assert {
    condition     = length(module.vm) == 1 && length(module.platform) == 0 && length(module.app) == 0
    error_message = "vm mode must create the VM module only"
  }
}

run "k8s_mode_creates_cluster_and_helm_release_only" {
  command = apply
  # The cloud platform module is validated on its own; here we test the stack's mode
  # switch and the Helm app module (chart path, values files) end to end.
  override_module {
    target = module.platform
    outputs = {
      cluster_name                = "sparkboard-production"
      kube_host                   = "https://203.0.113.20"
      kube_ca_certificate         = "cert"
      database_url                = "postgresql://sparkboard:secret@db.internal:5432/sparkboard?sslmode=require"
      registry_url                = "registry.example.com/sparkboard"
      ingress_class               = "nginx"
      service_account_annotations = {}
    }
  }
  variables {
    deployment_mode   = "k8s"
    api_allowed_cidrs = ["203.0.113.0/24"]
  }
  assert {
    condition     = length(module.platform) == 1 && length(module.app) == 1 && length(module.vm) == 0
    error_message = "k8s mode must create the platform and app modules only"
  }
}

run "unknown_mode_is_rejected" {
  command = plan
  variables {
    deployment_mode = "serverless"
  }
  expect_failures = [var.deployment_mode]
}
