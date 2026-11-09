# VM contract: identical outputs on every cloud, consumed by stacks and deploy-cloud.yml.
output "public_ip" {
  value       = google_compute_address.this.address
  description = "Static public IP of the VM."
}

output "ssh_user" {
  value       = "ubuntu"
  description = "Login user for the deploy workflow."
}
