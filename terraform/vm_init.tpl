#!/bin/bash

# Install Docker
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Create docker group and add azureuser
usermod -aG docker azureuser

# Create app directory
mkdir -p /home/azureuser/app/backend
chown -R azureuser:azureuser /home/azureuser/app

# Create .env file
cat > /home/azureuser/app/backend/.env << EOL
# Authentication
SECRET_KEY=${env_vars.secret_key}

# Azure OpenAI Settings
AZURE_OPENAI_API_KEY=${env_vars.azure_openai_api_key}
AZURE_OPENAI_ENDPOINT=${env_vars.azure_openai_endpoint}
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=${env_vars.azure_openai_embedding_deployment_name}
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=${env_vars.azure_openai_chat_deployment_name}
AZURE_OPENAI_API_VERSION=${env_vars.azure_openai_api_version}

# Weaviate Settings
WEAVIATE_URL=${env_vars.weaviate_url}

# CORS Settings
ADDITIONAL_CORS_ORIGINS=${jsonencode(env_vars.additional_cors_origins)}
EOL

# Update docker-compose.yml with Weaviate settings
cat > /home/azureuser/app/docker-compose.override.yml << EOL
services:
  weaviate:
    environment:
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: '${env_vars.weaviate_auth_enabled}'
      PERSISTENCE_DATA_PATH: '${env_vars.weaviate_persistence_data_path}'
      DEFAULT_VECTORIZER_MODULE: '${env_vars.weaviate_default_vectorizer_module}'
      CLUSTER_HOSTNAME: '${env_vars.weaviate_cluster_hostname}'
EOL

# Set proper ownership and permissions for .env file
chown azureuser:azureuser /home/azureuser/app/backend/.env
chmod 600 /home/azureuser/app/backend/.env
