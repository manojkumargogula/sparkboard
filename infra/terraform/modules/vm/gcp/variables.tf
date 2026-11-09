variable "name" {
  type        = string
  description = "Base name for every resource (e.g. sparkboard-production)."
}

variable "region" {
  type        = string
  description = "Cloud region."
}

variable "environment" {
  type        = string
  description = "Environment label used in resource names and tags (production)."
}

variable "size" {
  type        = string
  default     = "small"
  description = "Capacity preset passed to modules/sizing: small | medium | ha (VM mode is one VM either way)."
}

variable "disk_gb" {
  type        = number
  default     = 30
  description = "Boot disk size. Holds Docker images and the Postgres volume."
}

variable "ssh_public_key" {
  type        = string
  description = "Public key the deploy workflow uses to SSH in (key-only auth)."
  validation {
    condition     = can(regex("^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256) ", var.ssh_public_key))
    error_message = "ssh_public_key must be an OpenSSH public key."
  }
}

variable "ssh_allowed_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to SSH in (deploy runner, your IP). Ports 80/443 are public."
  validation {
    condition     = length(var.ssh_allowed_cidrs) > 0
    error_message = "Provide at least one CIDR for SSH access."
  }
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Extra tags/labels applied to every resource."
}

variable "project_id" {
  type        = string
  description = "GCP project to deploy into."
}
