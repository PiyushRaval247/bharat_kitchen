# Production Setup Checklist for bharatkitchenware.store

## Prerequisites
- VPS Server: 194.238.17.11
- Domain: bharatkitchenware.store
- SSH access to VPS
- Domain registrar access

## 1. DNS Configuration ✅

### Required DNS Records:
```
Type: A
Name: @
Value: 194.238.17.11
TTL: 3600

Type: A
Name: www
Value: 194.238.17.11
TTL: 3600
```

### Verification:
```bash
# Run this on your local machine or VPS
./dns-check.sh
```

## 2. Environment Variables ✅

### Backend (.env):
- ✅ FRONTEND_URL updated to https://bharatkitchenware.store
- ✅ CORS_ORIGIN updated to https://bharatkitchenware.store
- ⚠️ Update SUPABASE_SERVICE_ROLE_KEY with actual key
- ⚠️ Add JWT_SECRET for production

### Frontend (.env):
- ✅ VITE_API_URL updated to https://bharatkitchenware.store/api

## 3. SSL Certificate Setup

### On VPS (as root):
```bash
# Upload and run the SSL setup script
scp ssl-setup.sh root@194.238.17.11:/root/
ssh root@194.238.17.11
chmod +x /root/ssl-setup.sh
./ssl-setup.sh
```

### Manual Steps:
1. Update email in ssl-setup.sh before running
2. Ensure domain DNS is propagated before running
3. Verify certificates: `certbot certificates`

## 4. Nginx Configuration ✅

- ✅ Updated nginx-https.conf with bharatkitchenware.store
- ✅ Added API proxy configuration
- ✅ SSL certificate paths configured for Let's Encrypt

## 5. Deployment Process

### Automatic (GitHub Actions):
- Push to main branch triggers deployment
- Workflow updated to handle HTTPS configuration

### Manual Deployment:
```bash
ssh deploy@194.238.17.11
cd /home/deploy/mall-pos
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install && npm run build
cd ..
pm2 restart mall-pos-backend
sudo systemctl reload nginx
```

## 6. Post-Deployment Verification

### Check Services:
```bash
# Backend status
pm2 status
pm2 logs mall-pos-backend

# Nginx status
sudo systemctl status nginx
sudo nginx -t

# SSL certificate
curl -I https://bharatkitchenware.store
```

### Test Endpoints:
- https://bharatkitchenware.store (Frontend)
- https://bharatkitchenware.store/api/health (Backend health check)

## 7. Security Considerations

- ✅ HTTPS enforced with SSL certificates
- ✅ CORS properly configured
- ✅ Security headers added in Nginx
- ⚠️ Update default passwords and keys
- ⚠️ Configure firewall rules

## 8. Monitoring Setup

### Log Locations:
- Backend logs: `pm2 logs mall-pos-backend`
- Nginx logs: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- SSL renewal: `/var/log/letsencrypt/letsencrypt.log`

### Automated Certificate Renewal:
- Cron job added: `0 12 * * * /usr/bin/certbot renew --quiet`

## Troubleshooting

### Common Issues:
1. **DNS not propagated**: Wait up to 48 hours or use different DNS servers
2. **SSL certificate failed**: Ensure DNS is correct and port 80/443 are open
3. **Backend not accessible**: Check PM2 status and logs
4. **CORS errors**: Verify environment variables match domain

### Useful Commands:
```bash
# Check DNS propagation
nslookup bharatkitchenware.store 8.8.8.8

# Test SSL
openssl s_client -connect bharatkitchenware.store:443

# Check ports
netstat -tlnp | grep :80
netstat -tlnp | grep :443
netstat -tlnp | grep :3001
```