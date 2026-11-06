# Platform contract (see infra/terraform/README.md). Identical names on every cloud.

output "cluster_name" { value = google_container_cluster.this.name }
output "kube_host" { value = "https://${google_container_cluster.this.endpoint}" }
output "kube_ca_certificate" {
  value = base64decode(google_container_cluster.this.master_auth[0].cluster_ca_certificate)
}

output "database_url" {
  value     = "postgresql://sparkboard:${random_password.db.result}@${google_sql_database_instance.this.private_ip_address}:5432/sparkboard?sslmode=require"
  sensitive = true
}

output "registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}
output "ingress_class" { value = "gce" }
output "service_account_annotations" { value = {} }
