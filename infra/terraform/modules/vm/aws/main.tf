# AWS VM: VPC + public subnet + security group + Ubuntu 24.04 EC2 + Elastic IP.
# The VM runs infra/vm/docker-compose.yml (Postgres + API + web) behind host nginx.

module "size" {
  source = "../../sizing"
  size   = var.size
}

locals {
  tags = merge(var.tags, { app = "sparkboard", environment = var.environment, region = var.region, mode = "vm", managed-by = "terraform" })
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_vpc" "this" {
  cidr_block           = "10.70.0.0/16"
  enable_dns_hostnames = true
  tags                 = merge(local.tags, { Name = var.name })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = local.tags
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = "10.70.1.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]
  tags              = merge(local.tags, { Name = "${var.name}-public" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags   = local.tags
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "vm" {
  name_prefix = "${var.name}-vm-"
  description = "Sparkboard VM: public web, SSH from allowed CIDRs only"
  vpc_id      = aws_vpc.this.id
  tags        = local.tags

  ingress {
    description = "HTTP (redirects to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] #trivy:ignore:AVD-AWS-0107 public web server
  }
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] #trivy:ignore:AVD-AWS-0107 public web server
  }
  ingress {
    description = "SSH for the deploy workflow"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidrs
  }
  egress {
    description = "Package installs, image pulls, Lets Encrypt"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] #trivy:ignore:AVD-AWS-0104 needs internet egress
  }
}

resource "aws_key_pair" "deploy" {
  key_name_prefix = "${var.name}-"
  public_key      = var.ssh_public_key
  tags            = local.tags
}

resource "aws_instance" "this" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = module.size.aws.vm
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.vm.id]
  key_name               = aws_key_pair.deploy.key_name
  user_data              = file("${path.module}/../../../../vm/cloud-init.yaml")
  monitoring             = true
  tags                   = merge(local.tags, { Name = var.name })

  metadata_options {
    http_tokens   = "required" # IMDSv2 only
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_size = var.disk_gb
    volume_type = "gp3"
    encrypted   = true
  }

  # The Postgres data lives on this disk: never replace the VM for a new AMI or
  # a cloud-init edit. App updates go through deploy.sh, not Terraform.
  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

resource "aws_eip" "this" {
  instance = aws_instance.this.id
  domain   = "vpc"
  tags     = local.tags
}
