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
