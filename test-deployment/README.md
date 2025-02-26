# Test Deployment Environment

This directory contains the necessary files to create and manage a separate test deployment environment for the RAG application. The test environment uses the Azure-provided FQDN `innov8nxt-factorygpt-test.eastus.cloudapp.azure.com` and is configured with a smaller VM size for cost savings.

## Directory Structure

- `terraform/` - Contains Terraform configuration files for the test environment
  - `main.tf` - Main Terraform configuration with resource definitions
  - `variables.tf` - Variable definitions
  - `terraform.tfvars` - Variable values specific to the test environment
  - `vm_init.tpl` - VM initialization template
- `deploy.sh` - Script to deploy the application to the test VM
- `enable-ssl.sh` - Script to enable SSL for the test domain

## Deployment Process

### 1. ✅ Create the Test Infrastructure

This step has been completed. The test infrastructure has been created with the following outputs:

```
Outputs:
public_ip = "13.92.188.103"
fqdn = "innov8nxt-factorygpt-test.eastus.cloudapp.azure.com"
```

### 2. ✅ Use Azure-provided FQDN

We'll use the Azure-provided FQDN `innov8nxt-factorygpt-test.eastus.cloudapp.azure.com` instead of setting up custom DNS records. This allows us to skip the DNS configuration step and proceed directly with the deployment.

### 3. ✅ Update the Deployment Script

This step has been completed. The `deploy.sh` script has been updated with the VM IP address.

### 4. Deploy the Application

The deployment script is designed to be run from the `test-deployment` directory and will access necessary files from the parent directory:

```bash
cd test-deployment
./deploy.sh
```

The script will:
- Copy necessary files from the parent directory
- Use a custom Nginx configuration without SSL initially
- Create required Docker volumes for SSL certificates
- Deploy the application to the test VM

Initially, the application will be accessible via HTTP only. After setting up SSL certificates, you can enable HTTPS.

Note: If you encounter any permission issues, make sure the script is executable:
```bash
chmod +x deploy.sh
```

### 5. SSL Configuration (Optional)

For the test environment using the Azure-provided FQDN, we'll skip the SSL setup initially. The application will be accessible via HTTP only at `innov8nxt-factorygpt-test.eastus.cloudapp.azure.com`.

If you need SSL for the test environment, you can obtain a certificate for the Azure-provided FQDN:

```bash
ssh -i ~/.ssh/rag-app-key azureuser@13.92.188.103

# On the VM
sudo apt-get update
sudo apt-get install -y certbot

# Stop the nginx container temporarily
cd ~/app
sudo docker compose stop nginx

# Run certbot in standalone mode for the Azure FQDN
sudo certbot certonly --standalone -d innov8nxt-factorygpt-test.eastus.cloudapp.azure.com

# Start nginx again
sudo docker compose start nginx
```

Then modify the enable-ssl.sh script to use the correct domain name before running it:

```bash
# Copy the enable-ssl.sh script to the VM
scp -i ~/.ssh/rag-app-key test-deployment/enable-ssl.sh azureuser@13.92.188.103:~/

# SSH into the VM
ssh -i ~/.ssh/rag-app-key azureuser@13.92.188.103

# Edit the script to use the Azure FQDN
sudo sed -i 's/test.innov8nxt-factorygpt.com/innov8nxt-factorygpt-test.eastus.cloudapp.azure.com/g' ~/enable-ssl.sh

# Run the script
sudo bash ~/enable-ssl.sh
```

## Accessing the Test Environment

Once deployed, the test environment will be accessible at:

- http://innov8nxt-factorygpt-test.eastus.cloudapp.azure.com (initially HTTP only)
- https://innov8nxt-factorygpt-test.eastus.cloudapp.azure.com (after SSL is set up, if configured)

## Differences from Production

1. Using Azure-provided FQDN `innov8nxt-factorygpt-test.eastus.cloudapp.azure.com` instead of custom domain
2. Smaller VM size: `Standard_B2s` vs `Standard_D4s_v3`
3. Different resource names (all include `-test` suffix)
4. Different secret key for authentication
5. CORS configuration includes the production domain

## Cleanup

To destroy the test environment when no longer needed:

```bash
cd test-deployment/terraform
terraform destroy
```
