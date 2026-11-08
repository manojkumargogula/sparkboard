# Platform contract (see docs/deployment.md). Identical names on every cloud.

output "cluster_name" { value = azurerm_kubernetes_cluster.this.name }
output "kube_host" { value = azurerm_kubernetes_cluster.this.kube_config[0].host }
output "kube_ca_certificate" {
  value = base64decode(azurerm_kubernetes_cluster.this.kube_config[0].cluster_ca_certificate)
}

# AKS local accounts give a client cert; exposed for the provider config only.
output "kube_client_certificate" {
  value     = base64decode(azurerm_kubernetes_cluster.this.kube_config[0].client_certificate)
  sensitive = true
}
output "kube_client_key" {
  value     = base64decode(azurerm_kubernetes_cluster.this.kube_config[0].client_key)
  sensitive = true
}

output "database_url" {
  value     = "postgresql://sparkboard:${random_password.db.result}@${azurerm_postgresql_flexible_server.this.fqdn}:5432/sparkboard?sslmode=require"
  sensitive = true
}

output "registry_url" { value = azurerm_container_registry.this.login_server }
output "ingress_class" { value = "webapprouting.kubernetes.azure.com" }
output "service_account_annotations" { value = {} }
