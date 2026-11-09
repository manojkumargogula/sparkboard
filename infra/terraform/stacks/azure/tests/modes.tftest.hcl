# Runs the stack in both deployment modes against mocked providers (nothing is
# created, no cloud account needed) and checks that each mode creates only its own resources.

mock_provider "azurerm" {
  mock_resource "azurerm_resource_group" {
    defaults = { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg" }
  }
  mock_resource "azurerm_virtual_network" {
    defaults = { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet" }
  }
  mock_resource "azurerm_subnet" {
    defaults = { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet" }
  }
  mock_resource "azurerm_network_security_group" {
    defaults = { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/nsg" }
  }
  mock_resource "azurerm_public_ip" {
    defaults = { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.Network/publicIPAddresses/pip" }
  }
  mock_resource "azurerm_network_interface" {
    defaults = { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.Network/networkInterfaces/nic" }
  }
  mock_resource "azurerm_private_dns_zone" {
    defaults = { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.Network/privateDnsZones/zone.postgres.database.azure.com" }
  }
  mock_resource "azurerm_postgresql_flexible_server" {
    defaults = { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/pg" }
  }
  mock_resource "azurerm_container_registry" {
    defaults = { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.ContainerRegistry/registries/acr" }
  }
  mock_resource "azurerm_kubernetes_cluster" {
    defaults = {
      id               = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.ContainerService/managedClusters/aks"
      kubelet_identity = [{ object_id = "00000000-0000-0000-0000-000000000001", client_id = "00000000-0000-0000-0000-000000000002", user_assigned_identity_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/kubelet" }]
      kube_config = [{
        host                   = "https://203.0.113.20"
        cluster_ca_certificate = "Y2VydA=="
        client_certificate     = "Y2VydA=="
        client_key             = "Y2VydA=="
      }]
    }
  }
}
mock_provider "kubernetes" {}
mock_provider "helm" {}
mock_provider "random" {}

variables {
  region    = "germanywestcentral"
  image_tag = "abc1234"
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
      kube_client_certificate     = "cert"
      kube_client_key             = "key"
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
