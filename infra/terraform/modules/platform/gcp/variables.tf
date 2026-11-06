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
  description = "Environment label (staging, production, ...)."
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

variable "project_id" {
  type        = string
  description = "GCP project to deploy into."
}
