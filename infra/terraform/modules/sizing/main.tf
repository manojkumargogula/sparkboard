# One vocabulary for capacity across clouds. Callers say "small" or "ha";
# this module turns that into the SKU each provider actually sells.
# `vm` is the machine type for deployment_mode = "vm" (one VM, not highly available).

variable "size" {
  type        = string
  description = "Capacity preset: small (cost-sensitive), medium, or ha (multi-zone, HA database)."
  validation {
    condition     = contains(["small", "medium", "ha"], var.size)
    error_message = "size must be one of: small, medium, ha."
  }
}

locals {
  presets = {
    small = {
      nodes_min = 1, nodes_max = 3, db_ha = false, db_storage_gb = 20, db_backup_days = 7
      aws       = { node = "t3.medium", db = "db.t4g.micro", vm = "t3.small" }
      gcp       = { db = "db-custom-1-3840", vm = "e2-small" }
      azure     = { node = "Standard_B2s", db = "B_Standard_B1ms", vm = "Standard_B1ms" }
    }
    medium = {
      nodes_min = 2, nodes_max = 6, db_ha = false, db_storage_gb = 50, db_backup_days = 14
      aws       = { node = "t3.large", db = "db.t4g.medium", vm = "t3.medium" }
      gcp       = { db = "db-custom-2-7680", vm = "e2-medium" }
      azure     = { node = "Standard_D2s_v5", db = "GP_Standard_D2s_v3", vm = "Standard_B2s" }
    }
    ha = {
      nodes_min = 3, nodes_max = 12, db_ha = true, db_storage_gb = 100, db_backup_days = 30
      aws       = { node = "m6i.large", db = "db.m6g.large", vm = "t3.large" }
      gcp       = { db = "db-custom-4-15360", vm = "e2-standard-2" }
      azure     = { node = "Standard_D4s_v5", db = "GP_Standard_D4s_v3", vm = "Standard_B2ms" }
    }
  }
  p = local.presets[var.size]
}

output "nodes_min" { value = local.p.nodes_min }
output "nodes_max" { value = local.p.nodes_max }
output "db_ha" { value = local.p.db_ha }
output "db_storage_gb" { value = local.p.db_storage_gb }
output "db_backup_days" { value = local.p.db_backup_days }
output "aws" { value = local.p.aws }
output "gcp" { value = local.p.gcp }
output "azure" { value = local.p.azure }
