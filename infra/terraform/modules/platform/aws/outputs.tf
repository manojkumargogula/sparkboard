# Platform contract (see docs/deployment.md). Identical names on every cloud.

output "cluster_name" { value = module.eks.cluster_name }
output "kube_host" { value = module.eks.cluster_endpoint }
output "kube_ca_certificate" { value = base64decode(module.eks.cluster_certificate_authority_data) }

output "database_url" {
  value     = "postgresql://${aws_db_instance.this.username}:${random_password.db.result}@${aws_db_instance.this.address}:5432/sparkboard?sslmode=require"
  sensitive = true
}

# Images live at <registry_url>/sparkboard-{api,web}, the layout the Helm chart expects.
output "registry_url" {
  value = "${split("/", aws_ecr_repository.images["sparkboard-api"].repository_url)[0]}/${var.name}"
}
output "ingress_class" { value = "alb" }
output "service_account_annotations" { value = {} }
