# VPS Deployment Guide - Mall POS System

This guide will help you deploy your Mall POS system from GitHub to a VPS (Virtual Private Server) like Hostinger, DigitalOcean, or AWS.

## Prerequisites

- ✅ GitHub repository with your Mall POS code
- VPS server (Ubuntu 20.04+ recommended)
- Domain name (optional but recommended)
- SSH access to your VPS

## Step 1: Initial VPS Setup

### Connect to your VPS
```bash
ssh root@your-server-ip
# or
ssh username@your-server-ip
```

### Update system packages
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js (v18+)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install additional tools
```bash
sudo apt install -y git nginx certbot python3-certbot-nginx pm2
npm install -g pm2
```

### Create deployment user (recommended)
```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo su - deploy
```

## Step 2: Clone and Setup Project

### Clone your GitHub repository
```bash
cd /home/deploy
git clone https://github.com/yourusername/your-repo-name.git mall-pos
cd mall-pos
```

### Create production environment files
```bash
# Root .env
cp .env.example .env
nano .env
```

**Root .env configuration:**
```env
# Production Configuration
API_BASE_URL=https://yourdomain.com/api
VITE_API_URL=https://yourdomain.com/api
NODE_ENV=production
```

```bash
# Backend .env
cp backend/.env.example backend/.env
nano backend/.env
```

**Backend .env configuration:**
```env
# Production Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_here

# Security
CORS_ORIGIN=https://yourdomain.com
```

```bash
# Frontend .env
cp frontend/.env.example frontend/.env
nano frontend/.env
```

**Frontend .env configuration:**
```env
# Production Configuration
VITE_API_URL=https://yourdomain.com/api
VITE_NODE_ENV=production
```

## Step 3: Install Dependencies and Build

### Install backend dependencies
```bash
cd backend
npm install --production
cd ..
```

### Install and build frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

## Step 4: Configure Nginx

### Create Nginx configuration
```bash
sudo nano /etc/nginx/sites-available/mall-pos
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Frontend (React build)
    location / {
        root /home/deploy/mall-pos/frontend/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files (QR codes, barcodes)
    location /static {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/mall-pos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: Setup SSL Certificate

### Install SSL certificate with Certbot
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Test SSL renewal
```bash
sudo certbot renew --dry-run
```

## Step 6: Setup Process Manager (PM2)

### Create PM2 ecosystem file
```bash
nano ecosystem.config.js
```

**PM2 configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'mall-pos-backend',
    script: './backend/server.js',
    cwd: '/home/deploy/mall-pos',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

### Create logs directory and start application
```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 7: Setup Automatic Deployment with GitHub Actions

### Create GitHub Actions workflow
Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        script: |
          cd /home/deploy/mall-pos
          git pull origin main
          cd backend
          npm install --production
          cd ../frontend
          npm install
          npm run build
          cd ..
          pm2 restart mall-pos-backend
          sudo systemctl reload nginx
```

### Setup GitHub Secrets
In your GitHub repository, go to Settings > Secrets and add:
- `HOST`: Your VPS IP address
- `USERNAME`: Your VPS username (deploy)
- `KEY`: Your private SSH key

## Step 8: Firewall Configuration

### Configure UFW firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Step 9: Monitoring and Maintenance

### Monitor PM2 processes
```bash
pm2 status
pm2 logs
pm2 monit
```

### Monitor Nginx
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Update deployment
```bash
cd /home/deploy/mall-pos
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart mall-pos-backend
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if backend is running: `pm2 status`
   - Check backend logs: `pm2 logs mall-pos-backend`
   - Restart backend: `pm2 restart mall-pos-backend`

2. **SSL Certificate Issues**
   - Renew certificate: `sudo certbot renew`
   - Check certificate status: `sudo certbot certificates`

3. **Permission Issues**
   - Fix ownership: `sudo chown -R deploy:deploy /home/deploy/mall-pos`
   - Fix permissions: `chmod -R 755 /home/deploy/mall-pos`

4. **Database Connection Issues**
   - Verify Supabase credentials in backend/.env
   - Check network connectivity to Supabase

### Useful Commands

```bash
# Check system resources
htop
df -h
free -h

# Check running processes
ps aux | grep node
netstat -tlnp | grep :3001

# Restart services
sudo systemctl restart nginx
pm2 restart all

# View logs
journalctl -u nginx -f
pm2 logs --lines 100
```

## Security Best Practices

1. **Regular Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Backup Strategy**
   - Regular database backups
   - Code repository backups
   - Server configuration backups

3. **Monitor Access**
   - Review access logs regularly
   - Set up fail2ban for SSH protection
   - Use strong passwords and SSH keys

4. **Environment Security**
   - Keep .env files secure
   - Use strong JWT secrets
   - Regular security audits

## Performance Optimization

1. **Enable Gzip Compression**
   Add to Nginx config:
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   ```

2. **Database Optimization**
   - Regular database maintenance
   - Optimize queries
   - Use connection pooling

3. **Caching Strategy**
   - Static file caching
   - API response caching
   - CDN for static assets

Your Mall POS system should now be successfully deployed and running on your VPS! 🚀