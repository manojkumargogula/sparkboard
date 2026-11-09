output "deployment_mode" { value = var.deployment_mode }

# k8s mode
output "cluster_name" { value = try(module.platform[0].cluster_name, null) }
output "registry_url" { value = try(module.platform[0].registry_url, null) }
output "namespace" { value = try(module.app[0].namespace, null) }

# vm mode
output "vm_public_ip" { value = try(module.vm[0].public_ip, null) }
output "vm_ssh_user" { value = try(module.vm[0].ssh_user, null) }
