# Azure platform: VNet + AKS (app routing add-on) + PostgreSQL Flexible Server (VNet-injected) + ACR.

module "size" {
  source = "../../sizing"
  size   = var.size
}

locals {
  tags = merge(var.tags, { app = "sparkboard", environment = var.environment, managed-by = "terraform" })
  # Flexible Server only accepts these storage sizes (MB): round the preset up.
  pg_storage_sizes = [32768, 65536, 131072, 262144, 524288, 1048576]
  pg_storage_mb    = [for mb in local.pg_storage_sizes : mb if mb >= module.size.db_storage_gb * 1024][0]
  # ACR names must be globally unique, alphanumeric only.
  acr_name = substr(replace("${var.name}${random_string.suffix.result}", "-", ""), 0, 50)
}

resource "random_string" "suffix" {
  length  = 5
  special = false
  upper   = false
}

resource "azurerm_resource_group" "this" {
  name     = var.name
  location = var.region
  tags     = local.tags
}

resource "azurerm_virtual_network" "this" {
  name                = var.name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  address_space       = ["10.60.0.0/16"]
  tags                = local.tags
}

resource "azurerm_subnet" "nodes" {
  name                 = "nodes"
  resource_group_name  = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = ["10.60.0.0/20"]
}

resource "azurerm_subnet" "db" {
  name                 = "postgres"
  resource_group_name  = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = ["10.60.32.0/24"]
  service_endpoints    = ["Microsoft.Storage"]

  delegation {
    name = "postgres"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_private_dns_zone" "db" {
  name                = "${var.name}.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "db" {
  name                  = "${var.name}-db"
  private_dns_zone_name = azurerm_private_dns_zone.db.name
  virtual_network_id    = azurerm_virtual_network.this.id
  resource_group_name   = azurerm_resource_group.this.name
}

resource "azurerm_kubernetes_cluster" "this" {
  name                              = var.name
  location                          = azurerm_resource_group.this.location
  resource_group_name               = azurerm_resource_group.this.name
  dns_prefix                        = var.name
  sku_tier                          = module.size.db_ha ? "Standard" : "Free"
  oidc_issuer_enabled               = true
  role_based_access_control_enabled = true
  workload_identity_enabled         = true
  tags                              = local.tags

  default_node_pool {
    name                 = "system"
    vm_size              = module.size.azure.node
    vnet_subnet_id       = azurerm_subnet.nodes.id
    auto_scaling_enabled = true
    min_count            = module.size.nodes_min
    max_count            = module.size.nodes_max
    zones                = module.size.db_ha ? ["1", "2", "3"] : null
    upgrade_settings {
      max_surge = "33%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
  }

  web_app_routing {
    dns_zone_ids = []
  }

  api_server_access_profile {
    authorized_ip_ranges = var.api_allowed_cidrs
  }
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                          = var.name
  resource_group_name           = azurerm_resource_group.this.name
  location                      = azurerm_resource_group.this.location
  version                       = "17"
  sku_name                      = module.size.azure.db
  storage_mb                    = local.pg_storage_mb
  backup_retention_days         = module.size.db_backup_days
  delegated_subnet_id           = azurerm_subnet.db.id
  private_dns_zone_id           = azurerm_private_dns_zone.db.id
  public_network_access_enabled = false
  administrator_login           = "sparkboard"
  administrator_password        = random_password.db.result
  zone                          = "1"
  tags                          = local.tags
  depends_on                    = [azurerm_private_dns_zone_virtual_network_link.db]

  dynamic "high_availability" {
    for_each = module.size.db_ha ? [1] : []
    content {
      mode = "ZoneRedundant"
    }
  }
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = "sparkboard"
  server_id = azurerm_postgresql_flexible_server.this.id
}

resource "azurerm_container_registry" "this" {
  name                = local.acr_name
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku                 = "Standard"
  admin_enabled       = false
  tags                = local.tags
}

# Let the cluster's kubelet pull from the registry without credentials.
resource "azurerm_role_assignment" "aks_pull" {
  scope                            = azurerm_container_registry.this.id
  role_definition_name             = "AcrPull"
  principal_id                     = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id
  skip_service_principal_aad_check = true
}
