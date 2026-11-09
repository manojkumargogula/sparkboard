# Azure VM: VNet + subnet + NSG + static public IP + Ubuntu 24.04 Linux VM.
# The VM runs infra/vm/docker-compose.yml (Postgres + API + web) behind host nginx.

module "size" {
  source = "../../sizing"
  size   = var.size
}

locals {
  tags = merge(var.tags, { app = "sparkboard", environment = var.environment, mode = "vm", managed-by = "terraform" })
}

resource "azurerm_resource_group" "this" {
  name     = "${var.name}-vm"
  location = var.region
  tags     = local.tags
}

resource "azurerm_virtual_network" "this" {
  name                = "${var.name}-vm"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  address_space       = ["10.90.0.0/16"]
  tags                = local.tags
}

resource "azurerm_subnet" "this" {
  name                 = "vm"
  resource_group_name  = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = ["10.90.1.0/24"]
}

resource "azurerm_network_security_group" "this" {
  name                = "${var.name}-vm"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.tags

  security_rule {
    name                       = "web"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["80", "443"]
    source_address_prefix      = "Internet" #trivy:ignore:AVD-AZU-0047 public web server
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "ssh"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefixes    = var.ssh_allowed_cidrs
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "this" {
  subnet_id                 = azurerm_subnet.this.id
  network_security_group_id = azurerm_network_security_group.this.id
}

resource "azurerm_public_ip" "this" {
  name                = "${var.name}-vm"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.tags
}

resource "azurerm_network_interface" "this" {
  name                = "${var.name}-vm"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.tags

  ip_configuration {
    name                          = "primary"
    subnet_id                     = azurerm_subnet.this.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.this.id
  }
}

resource "azurerm_linux_virtual_machine" "this" {
  name                            = "${var.name}-vm"
  location                        = azurerm_resource_group.this.location
  resource_group_name             = azurerm_resource_group.this.name
  size                            = module.size.azure.vm
  admin_username                  = "ubuntu"
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.this.id]
  custom_data                     = base64encode(file("${path.module}/../../../../vm/cloud-init.yaml"))
  tags                            = local.tags

  admin_ssh_key {
    username   = "ubuntu"
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
    disk_size_gb         = var.disk_gb
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  # The Postgres data lives on this disk: never replace the VM for a new image or
  # a cloud-init edit. App updates go through deploy.sh, not Terraform.
  lifecycle {
    ignore_changes = [custom_data, source_image_reference]
  }
}
