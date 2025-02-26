variable "resource_group_name" {
  description = "Name of the existing resource group"
  type        = string
  default     = "Bcdilabs-Resources"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "test.innov8nxt-factorygpt.com"  # Changed to test subdomain
}

variable "vm_size" {
  description = "Size of the virtual machine"
  type        = string
  default     = "Standard_B2s"  # Changed to smaller VM size
}

# Environment variables for the application
variable "app_env_vars" {
  description = "Environment variables for the application"
  type = object({
    # Authentication
    secret_key                            = string
    
    # Azure OpenAI Settings
    azure_openai_api_key                 = string
    azure_openai_endpoint                = string
    azure_openai_embedding_deployment_name = string
    azure_openai_chat_deployment_name     = string
    azure_openai_api_version             = string
    
    # Weaviate Settings
    weaviate_url                         = string
    weaviate_auth_enabled                = bool
    weaviate_persistence_data_path       = string
    weaviate_default_vectorizer_module   = string
    weaviate_cluster_hostname            = string
    
    # CORS Settings
    additional_cors_origins              = list(string)
  })
  sensitive = true
}
