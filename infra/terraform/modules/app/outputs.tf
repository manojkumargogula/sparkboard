output "namespace" { value = kubernetes_namespace_v1.this.metadata[0].name }
output "release" { value = helm_release.app.name }
output "admin_token" {
  value     = random_password.admin.result
  sensitive = true
}
