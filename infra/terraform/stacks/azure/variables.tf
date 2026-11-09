variable "name" {
  type    = string
  default = "sparkboard"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "region" {
  type = string
}

variable "size" {
  type        = string
  default     = "small"
  description = "small | medium | ha (see modules/sizing)."
}

variable "image_tag" {
  type        = string
  description = "Git SHA built by CI."
}

variable "host" {
  type    = string
  default = ""
}

variable "ai_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "api_allowed_cidrs" {
  type = list(string)
  # Secure default: private ranges only, so the API is never public by accident.
  default     = ["10.0.0.0/8"]
  description = "k8s mode: CIDRs allowed to reach the Kubernetes API (set your runner/VPN egress)."
}

variable "deployment_mode" {
  type        = string
  default     = "k8s"
  description = "k8s: managed Kubernetes + managed Postgres + Helm. vm: one VM with docker compose + nginx."
  validation {
    condition     = contains(["k8s", "vm"], var.deployment_mode)
    error_message = "deployment_mode must be k8s or vm."
  }
}

variable "ssh_public_key" {
  type        = string
  default     = ""
  description = "vm mode: OpenSSH public key for the deploy workflow."
}

variable "ssh_allowed_cidrs" {
  type        = list(string)
  default     = []
  description = "vm mode: CIDRs allowed to SSH in."
}
