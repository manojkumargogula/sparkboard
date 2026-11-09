# GCP VM: VPC + subnet + firewall + static IP + Ubuntu 24.04 Compute Engine VM.
# The VM runs infra/vm/docker-compose.yml (Postgres + API + web) behind host nginx.

module "size" {
  source = "../../sizing"
  size   = var.size
}

locals {
  labels = merge(var.tags, { app = "sparkboard", environment = var.environment, mode = "vm", managed-by = "terraform" })
}

resource "google_project_service" "compute" {
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

data "google_compute_zones" "available" {
  project    = var.project_id
  region     = var.region
  depends_on = [google_project_service.compute]
}

resource "google_compute_network" "this" {
  project                 = var.project_id
  name                    = "${var.name}-vm"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.compute]
}

resource "google_compute_subnetwork" "this" {
  project                  = var.project_id
  name                     = "${var.name}-vm"
  region                   = var.region
  network                  = google_compute_network.this.id
  ip_cidr_range            = "10.80.0.0/24"
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
  }
}

resource "google_compute_firewall" "web" {
  project       = var.project_id
  name          = "${var.name}-vm-web"
  network       = google_compute_network.this.id
  direction     = "INGRESS"
  source_ranges = ["0.0.0.0/0"] #trivy:ignore:AVD-GCP-0027 public web server
  target_tags   = ["sparkboard-vm"]
  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
}

resource "google_compute_firewall" "ssh" {
  project       = var.project_id
  name          = "${var.name}-vm-ssh"
  network       = google_compute_network.this.id
  direction     = "INGRESS"
  source_ranges = var.ssh_allowed_cidrs
  target_tags   = ["sparkboard-vm"]
  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

resource "google_compute_address" "this" {
  project    = var.project_id
  name       = "${var.name}-vm"
  region     = var.region
  depends_on = [google_project_service.compute]
}

# Dedicated identity with no project roles (not the default compute account).
resource "google_service_account" "vm" {
  project      = var.project_id
  account_id   = substr("${var.name}-vm", 0, 30)
  display_name = "Sparkboard VM"
}

resource "google_compute_instance" "this" {
  project      = var.project_id
  name         = "${var.name}-vm"
  zone         = data.google_compute_zones.available.names[0]
  machine_type = module.size.gcp.vm
  tags         = ["sparkboard-vm"]
  labels       = local.labels

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2404-lts-amd64"
      size  = var.disk_gb
      type  = "pd-balanced"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.this.id
    access_config {
      nat_ip = google_compute_address.this.address
    }
  }

  metadata = {
    user-data              = file("${path.module}/../../../../vm/cloud-init.yaml")
    ssh-keys               = "ubuntu:${var.ssh_public_key}"
    block-project-ssh-keys = "true"
  }

  service_account {
    email  = google_service_account.vm.email
    scopes = ["https://www.googleapis.com/auth/logging.write", "https://www.googleapis.com/auth/monitoring.write"]
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  # The Postgres data lives on this disk: never replace the VM for a new image or
  # a cloud-init edit. App updates go through deploy.sh, not Terraform.
  lifecycle {
    ignore_changes = [metadata["user-data"], boot_disk[0].initialize_params[0].image]
  }
}
