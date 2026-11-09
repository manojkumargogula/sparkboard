# VM contract: identical outputs on every cloud, consumed by stacks and deploy-cloud.yml.
output "public_ip" {
  value       = aws_eip.this.public_ip
  description = "Static public IP of the VM."
}

output "ssh_user" {
  value       = "ubuntu"
  description = "Login user for the deploy workflow."
}
