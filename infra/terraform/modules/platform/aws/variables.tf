variable "name" {
  type        = string
  description = "Base name for every resource (e.g. sparkboard-prod)."
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
  description = "Capacity preset passed to modules/sizing: small | medium | ha."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Extra tags/labels applied to every resource."
}

variable "api_allowed_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to reach the Kubernetes API (CI runners, office VPN). Never 0.0.0.0/0 in production."
  validation {
    condition     = length(var.api_allowed_cidrs) > 0
    error_message = "Provide at least one CIDR for Kubernetes API access."
  }
}
