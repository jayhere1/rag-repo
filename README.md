# RAG Application

## Deployment

This application can be deployed using the provided `deploy.sh` script, which handles all necessary steps including SSL certificate management.

### Prerequisites

1. SSH key for VM access:
   ```bash
   # The SSH key should already be set up at:
   ~/.ssh/rag-app-key
   ```

2. Terraform state (for getting VM IP):
   - Make sure you've run `terraform apply` in the terraform directory
   - The script uses terraform output to get the VM IP

### Deployment Process

To deploy the application:

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

The script will:
1. Get the VM IP from Terraform output
2. Copy all necessary configuration files
3. Clone the latest code from the repository
4. Build and start Docker containers
5. Handle SSL certificate management

### Infrastructure

- Azure VM: 13.90.142.88
- Domain: innov8nxt-factorygpt.com
- Services:
  - Frontend (React)
  - Backend (FastAPI)
  - Weaviate (Vector Database)
  - Nginx (Reverse Proxy)
  - Certbot (SSL Certificate Management)

### Security

- HTTPS enforced with automatic redirection
- SSL certificates auto-renewed when within 30 days of expiry
- Content Security Policy (CSP) headers configured
- Other security headers:
  - HSTS
  - X-Frame-Options
  - X-XSS-Protection
  - X-Content-Type-Options
  - Referrer-Policy

### Troubleshooting

If deployment fails:
1. Check the script output for error messages
2. Verify VM connectivity:
   ```bash
   ssh -i ~/.ssh/rag-app-key azureuser@13.90.142.88
   ```
3. Check Docker container logs:
   ```bash
   ssh -i ~/.ssh/rag-app-key azureuser@13.90.142.88 "cd ~/app && sudo docker compose logs"
   ```
4. Verify SSL certificates:
   ```bash
   ssh -i ~/.ssh/rag-app-key azureuser@13.90.142.88 "cd ~/app && sudo docker compose exec certbot certbot certificates"
   ```

### Manual Deployment

If needed, you can manually deploy using:

```bash
# SSH into the VM
ssh -i ~/.ssh/rag-app-key azureuser@13.90.142.88

# Update and restart the application
cd ~/app
git pull
sudo docker compose down
sudo docker compose up -d --build
```
