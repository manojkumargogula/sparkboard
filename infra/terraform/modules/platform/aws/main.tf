# AWS platform: VPC (3 AZ, private nodes, NAT) + EKS + RDS Postgres + ECR.

module "size" {
  source = "../../sizing"
  size   = var.size
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs  = slice(data.aws_availability_zones.available.names, 0, 3)
  tags = merge(var.tags, { app = "sparkboard", environment = var.environment, region = var.region, managed-by = "terraform" })
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.16"

  name                         = var.name
  cidr                         = "10.40.0.0/16"
  azs                          = local.azs
  private_subnets              = ["10.40.0.0/20", "10.40.16.0/20", "10.40.32.0/20"]
  public_subnets               = ["10.40.100.0/24", "10.40.101.0/24", "10.40.102.0/24"]
  database_subnets             = ["10.40.200.0/24", "10.40.201.0/24", "10.40.202.0/24"]
  enable_nat_gateway           = true
  single_nat_gateway           = !module.size.db_ha # one NAT for small/medium, one per AZ for ha
  create_database_subnet_group = true

  public_subnet_tags  = { "kubernetes.io/role/elb" = 1 }
  private_subnet_tags = { "kubernetes.io/role/internal-elb" = 1 }
  tags                = local.tags
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.31"

  cluster_name                             = var.name
  cluster_version                          = "1.33"
  cluster_endpoint_public_access           = true
  cluster_endpoint_public_access_cidrs     = var.api_allowed_cidrs
  enable_cluster_creator_admin_permissions = true
  enable_irsa                              = true
  vpc_id                                   = module.vpc.vpc_id
  subnet_ids                               = module.vpc.private_subnets

  cluster_addons = {
    coredns                = {}
    kube-proxy             = {}
    vpc-cni                = {}
    eks-pod-identity-agent = {}
  }

  eks_managed_node_groups = {
    default = {
      instance_types = [module.size.aws.node]
      min_size       = module.size.nodes_min
      max_size       = module.size.nodes_max
      desired_size   = module.size.nodes_min
    }
  }
  tags = local.tags
}

resource "aws_security_group" "db" {
  name_prefix = "${var.name}-db-"
  description = "Postgres reachable only from EKS nodes"
  vpc_id      = module.vpc.vpc_id
  tags        = local.tags

  ingress {
    description     = "Postgres from cluster nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_instance" "this" {
  identifier                   = var.name
  engine                       = "postgres"
  engine_version               = "17"
  instance_class               = module.size.aws.db
  allocated_storage            = module.size.db_storage_gb
  max_allocated_storage        = module.size.db_storage_gb * 4
  storage_encrypted            = true
  db_name                      = "sparkboard"
  username                     = "sparkboard"
  password                     = random_password.db.result
  multi_az                     = module.size.db_ha
  db_subnet_group_name         = module.vpc.database_subnet_group_name
  vpc_security_group_ids       = [aws_security_group.db.id]
  publicly_accessible          = false
  backup_retention_period      = module.size.db_backup_days
  deletion_protection          = var.environment == "production"
  skip_final_snapshot          = var.environment != "production"
  final_snapshot_identifier    = "${var.name}-final"
  performance_insights_enabled = true
  auto_minor_version_upgrade   = true
  tags                         = local.tags
}

resource "aws_ecr_repository" "images" {
  for_each             = toset(["sparkboard-api", "sparkboard-web"])
  name                 = "${var.name}/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
  tags = local.tags
}
