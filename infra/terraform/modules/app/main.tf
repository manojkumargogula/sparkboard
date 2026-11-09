# Cloud-neutral application layer. Knows nothing about AWS/GCP/Azure: it only
# consumes the platform contract and installs the same Helm chart everywhere.

locals {
  chart_dir = "${path.module}/../../../helm/sparkboard"
}

resource "random_password" "admin" {
  length  = 40
  special = false
}

resource "kubernetes_namespace_v1" "this" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/part-of"          = "sparkboard"
      "pod-security.kubernetes.io/enforce" = "restricted"
    }
  }
}

# Secrets are created here (not by Helm) so they never land in Helm release history.
resource "kubernetes_secret_v1" "app" {
  metadata {
    name      = "${var.release_name}-secrets"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }
  data = {
    DATABASE_URL = var.database_url
    ADMIN_TOKEN  = random_password.admin.result
    AI_API_KEY   = var.ai_api_key
  }
}

resource "helm_release" "app" {
  name            = var.release_name
  namespace       = kubernetes_namespace_v1.this.metadata[0].name
  chart           = local.chart_dir
  atomic          = true # failed upgrade => automatic rollback
  cleanup_on_fail = true
  wait            = true
  timeout         = 600
  max_history     = 10

  values = concat(
    [file("${local.chart_dir}/values/${var.cloud}.yaml")],
    [yamlencode({
      image          = { registry = var.image_registry, tag = var.image_tag }
      secrets        = { existingSecret = kubernetes_secret_v1.app.metadata[0].name }
      ingress        = { className = var.ingress_class, host = var.host }
      api            = { env = { AI_PROVIDER = var.ai_provider, ENVIRONMENT = "production" } }
      serviceAccount = { annotations = var.service_account_annotations }
    })],
    var.extra_values,
  )
}
