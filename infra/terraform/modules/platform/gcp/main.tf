# GCP platform: custom VPC + GKE Autopilot + Cloud SQL (private IP) + Artifact Registry.

module "size" {
  source = "../../sizing"
  size   = var.size
}

locals {
  labels = merge(var.tags, { app = "sparkboard", environment = var.environment, managed-by = "terraform" })
}

resource "google_project_service" "apis" {
  for_each = toset([
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "servicenetworking.googleapis.com",
    "artifactregistry.googleapis.com",
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "google_compute_network" "vpc" {
  project                 = var.project_id
  name                    = var.name
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "nodes" {
  project                  = var.project_id
  name                     = "${var.name}-nodes"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  ip_cidr_range            = "10.50.0.0/20"
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.52.0.0/14"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.56.0.0/20"
  }
}

# Private Service Access so Cloud SQL gets an IP inside the VPC.
resource "google_compute_global_address" "sql_range" {
  project       = var.project_id
  name          = "${var.name}-sql"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "sql" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.sql_range.name]
}

resource "google_compute_router" "router" {
  project = var.project_id
  name    = var.name
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  project                            = var.project_id
  name                               = var.name
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# Autopilot: Google manages nodes; we pay per pod request. Scales to zero idle nodes.
resource "google_container_cluster" "this" {
  project             = var.project_id
  name                = var.name
  location            = var.region
  enable_autopilot    = true
  network             = google_compute_network.vpc.id
  subnetwork          = google_compute_subnetwork.nodes.id
  deletion_protection = var.environment == "production"
  resource_labels     = local.labels

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  release_channel {
    channel = "REGULAR"
  }

  master_authorized_networks_config {
    dynamic "cidr_blocks" {
      for_each = var.api_allowed_cidrs
      content {
        cidr_block = cidr_blocks.value
      }
    }
  }
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "google_sql_database_instance" "this" {
  project             = var.project_id
  name                = var.name
  region              = var.region
  database_version    = "POSTGRES_17"
  deletion_protection = var.environment == "production"
  depends_on          = [google_service_networking_connection.sql]

  settings {
    tier              = module.size.gcp.db
    edition           = "ENTERPRISE"
    availability_type = module.size.db_ha ? "REGIONAL" : "ZONAL"
    disk_size         = module.size.db_storage_gb
    disk_autoresize   = true
    user_labels       = local.labels

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
      ssl_mode                                      = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = module.size.db_backup_days
      }
    }

    insights_config {
      query_insights_enabled = true
    }
  }
}

resource "google_sql_database" "app" {
  project  = var.project_id
  name     = "sparkboard"
  instance = google_sql_database_instance.this.name
}

resource "google_sql_user" "app" {
  project  = var.project_id
  name     = "sparkboard"
  instance = google_sql_database_instance.this.name
  password = random_password.db.result
}

resource "google_artifact_registry_repository" "images" {
  project       = var.project_id
  location      = var.region
  repository_id = var.name
  format        = "DOCKER"
  labels        = local.labels
  depends_on    = [google_project_service.apis]

  docker_config {
    immutable_tags = true
  }
}
