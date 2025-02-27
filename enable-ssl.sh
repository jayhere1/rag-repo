#!/bin/bash

set -e  # Exit on error

DOMAIN="innov8nxt-factorygpt.com"
EMAIL="jay@bcdilab.com"

# Function to check if certificates exist
check_certs() {
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        return 0  # Certificates exist
    else
        return 1  # Certificates don't exist
    fi
}

# Function to enable SSL in Nginx
enable_ssl() {
    cat > /etc/nginx/conf.d/default.conf << 'EOL'
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name innov8nxt-factorygpt.com www.innov8nxt-factorygpt.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS configuration
server {
    listen 443 ssl;
    server_name innov8nxt-factorygpt.com www.innov8nxt-factorygpt.com;

    ssl_certificate /etc/letsencrypt/live/innov8nxt-factorygpt.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/innov8nxt-factorygpt.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/innov8nxt-factorygpt.com/chain.pem;

    # SSL configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeouts for long-running operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https://innov8nxt-factorygpt.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://innov8nxt-factorygpt.com wss://innov8nxt-factorygpt.com;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;
    gzip_disable "MSIE [1-6]\.";
}
EOL

    # Test Nginx configuration
    nginx -t

    # Reload Nginx
    nginx -s reload
}

# Main script
echo "Checking for SSL certificates..."
if check_certs; then
    echo "Certificates found. Enabling SSL..."
    enable_ssl
    echo "SSL enabled successfully!"
else
    echo "No certificates found. Please ensure DNS is properly configured and certbot has run successfully."
    exit 1
fi
