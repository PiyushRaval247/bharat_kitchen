#!/bin/bash
# SSL Certificate Setup Script for bharatkitchenware.store
# Run this script on your VPS (194.238.17.11) as root

echo "Setting up SSL certificates for bharatkitchenware.store..."

# Update system packages
apt update

# Install Certbot and Nginx plugin
apt install -y certbot python3-certbot-nginx

# Stop Nginx temporarily
systemctl stop nginx

# Obtain SSL certificate for your domain
certbot certonly --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d bharatkitchenware.store \
  -d www.bharatkitchenware.store

# Copy the updated Nginx configuration
cp /home/deploy/mall-pos/frontend/nginx-https.conf /etc/nginx/sites-available/mall-pos

# Enable the site
ln -sf /etc/nginx/sites-available/mall-pos /etc/nginx/sites-enabled/

# Remove default Nginx site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration is valid"
    # Start Nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Setup automatic certificate renewal
    crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | crontab -
    
    echo "SSL setup completed successfully!"
    echo "Your site should now be accessible at https://bharatkitchenware.store"
else
    echo "Nginx configuration has errors. Please check the configuration."
    exit 1
fi

# Display certificate information
certbot certificates