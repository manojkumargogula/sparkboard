variable "namespace" {
  type    = string
  default = "sparkboard"
}

variable "release_name" {
  type    = string
  default = "sparkboard"
}

variable "cloud" {
  type        = string
  description = "aws | gcp | azure; selects deploy/helm/sparkboard/values-<cloud>.yaml."
}

variable "image_registry" {
  type        = string
  description = "Platform contract output `registry_url`."
}

variable "image_tag" {
  type        = string
  description = "Image tag to deploy (CI passes the git SHA)."
}

variable "database_url" {
  type      = string
  sensitive = true
}

variable "ai_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "ai_provider" {
  type    = string
  default = "none"
}

variable "ingress_class" {
  type = string
}

variable "host" {
  type        = string
  default     = ""
  description = "Public hostname; empty serves on the load balancer address."
}

variable "service_account_annotations" {
  type    = map(string)
  default = {}
}

variable "extra_values" {
  type        = list(string)
  default     = []
  description = "Extra YAML documents merged after the cloud values (e.g. AI-generated env config)."
}
