# VPS Deployment Checklist

## Prerequisites ✅
- [x] GitHub repository created and code pushed
- [x] GitHub Actions workflow configured
- [x] PM2 ecosystem configuration ready
- [x] VPS server access (SSH)

## Manual Steps to Execute on VPS

### 1. Initial Server Setup
```bash
# Connect to your VPS
ssh root@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required tools
sudo apt install -y git nginx certbot python3-certbot-nginx
npm install -g pm2

# Create deploy user
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo su - deploy
```

### 2. Clone Repository
```bash
# Clone your GitHub repository
cd /home/deploy
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git mall-pos
cd mall-pos
```

### 3. Configure Environment Variables

**Root .env:**
```bash
cp .env.example .env
nano .env
```
Update with:
```env
API_BASE_URL=https://yourdomain.com/api
VITE_API_URL=https://yourdomain.com/api
NODE_ENV=production
```

**Backend .env:**
```bash
cp backend/.env.example backend/.env
nano backend/.env
```
Update with your production values:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET
- FRONTEND_URL=https://yourdomain.com

**Frontend .env:**
```bash
cp frontend/.env.example frontend/.env
nano frontend/.env
```
Update with:
```env
VITE_API_URL=https://yourdomain.com/api
VITE_NODE_ENV=production
```

### 4. Install Dependencies and Build
```bash
# Backend dependencies
cd backend
npm install --production
cd ..

# Frontend build
cd frontend
npm install
npm run build
cd ..
```

### 5. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/mall-pos
```

Paste the Nginx configuration from `VPS_DEPLOYMENT_GUIDE.md`

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mall-pos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Start Application with PM2
```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Setup SSL Certificate
```bash
# Install SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test renewal
sudo certbot renew --dry-run
```

### 8. Configure Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 9. Setup GitHub Secrets
In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:

- `VPS_HOST`: Your VPS IP address
- `VPS_USERNAME`: `deploy`
- `VPS_SSH_KEY`: Your private SSH key content
- `VPS_PORT`: `22` (or your custom SSH port)

### 10. Test Deployment
```bash
# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check logs
pm2 logs mall-pos-backend
sudo tail -f /var/log/nginx/access.log
```

## Verification Steps

- [ ] Backend API responds at `https://yourdomain.com/api/health`
- [ ] Frontend loads at `https://yourdomain.com`
- [ ] SSL certificate is valid (green lock icon)
- [ ] GitHub Actions workflow runs successfully on push
- [ ] PM2 keeps backend running after server restart

## Quick Commands Reference

```bash
# Restart services
pm2 restart mall-pos-backend
sudo systemctl reload nginx

# View logs
pm2 logs mall-pos-backend --lines 50
sudo tail -f /var/log/nginx/error.log

# Manual deployment
cd /home/deploy/mall-pos
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart mall-pos-backend

# Check system resources
htop
df -h
free -h
```

## Troubleshooting

**502 Bad Gateway:**
- Check if backend is running: `pm2 status`
- Check backend logs: `pm2 logs mall-pos-backend`
- Restart backend: `pm2 restart mall-pos-backend`

**SSL Issues:**
- Renew certificate: `sudo certbot renew`
- Check certificate: `sudo certbot certificates`

**Permission Issues:**
- Fix ownership: `sudo chown -R deploy:deploy /home/deploy/mall-pos`
- Fix permissions: `chmod -R 755 /home/deploy/mall-pos`

---

🚀 **Your Mall POS system will be live at `https://yourdomain.com` after completing these steps!**