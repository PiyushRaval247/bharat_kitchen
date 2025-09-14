# Deploy Mall POS to VPS (194.238.17.11)

## Quick Start Commands

### 1. Connect to Your VPS
```bash
ssh root@194.238.17.11
```

### 2. Initial Server Setup (Run these commands on VPS)

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install required tools
apt install -y git nginx certbot python3-certbot-nginx ufw

# Install PM2 globally
npm install -g pm2

# Create deploy user
adduser deploy
usermod -aG sudo deploy

# Switch to deploy user
su - deploy
```

### 3. Clone Your Repository
```bash
# Make sure you're in deploy user home
cd /home/deploy

# Clone your GitHub repository (replace with your actual repo URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git mall-pos
cd mall-pos
```

### 4. Configure Environment Variables

**Create Root .env:**
```bash
cp .env.example .env
nano .env
```

Add this content (replace yourdomain.com with your actual domain or IP):
```env
# Production Configuration
API_BASE_URL=http://194.238.17.11/api
VITE_API_URL=http://194.238.17.11/api
NODE_ENV=production
```

**Create Backend .env:**
```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Add this content:
```env
# Server Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://194.238.17.11

# Database Configuration (Update with your Supabase credentials)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_here_make_it_long_and_random

# CORS Configuration
CORS_ORIGIN=http://194.238.17.11
```

**Create Frontend .env:**
```bash
cp frontend/.env.example frontend/.env
nano frontend/.env
```

Add this content:
```env
# Production Configuration
VITE_API_URL=http://194.238.17.11/api
VITE_NODE_ENV=production
```

### 5. Install Dependencies and Build
```bash
# Install backend dependencies
cd backend
npm install --production
cd ..

# Install frontend dependencies and build
cd frontend
npm install
npm run build
cd ..
```

### 6. Configure Nginx
```bash
# Switch back to root user
exit  # This exits from deploy user back to root

# Create Nginx configuration
nano /etc/nginx/sites-available/mall-pos
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name 194.238.17.11;
    
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

```bash
# Enable the site
ln -s /etc/nginx/sites-available/mall-pos /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### 7. Start Application with PM2
```bash
# Switch back to deploy user
su - deploy
cd /home/deploy/mall-pos

# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions that PM2 shows (copy and run the command as root)
```

### 8. Configure Firewall
```bash
# Switch back to root
exit

# Configure UFW firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

### 9. Test Your Deployment

Open your browser and visit:
- **Frontend:** http://194.238.17.11
- **API Health Check:** http://194.238.17.11/api/health (if you have a health endpoint)

### 10. Verify Everything is Working

```bash
# Check PM2 status
su - deploy
pm2 status
pm2 logs mall-pos-backend

# Check Nginx status
exit  # Back to root
systemctl status nginx

# Check if ports are listening
netstat -tlnp | grep :80
netstat -tlnp | grep :3001
```

## Quick Commands for Management

### Restart Services
```bash
# Restart backend
su - deploy
pm2 restart mall-pos-backend

# Restart Nginx
exit
systemctl restart nginx
```

### View Logs
```bash
# Backend logs
su - deploy
pm2 logs mall-pos-backend --lines 50

# Nginx logs
exit
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Update Deployment
```bash
su - deploy
cd /home/deploy/mall-pos
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart mall-pos-backend
```

## Troubleshooting

### If you get "502 Bad Gateway":
```bash
# Check if backend is running
su - deploy
pm2 status

# If not running, start it
pm2 start ecosystem.config.js

# Check logs for errors
pm2 logs mall-pos-backend
```

### If frontend doesn't load:
```bash
# Check Nginx configuration
nginx -t

# Check if build directory exists
ls -la /home/deploy/mall-pos/frontend/dist/

# Rebuild frontend if needed
su - deploy
cd /home/deploy/mall-pos/frontend
npm run build
```

### Check system resources:
```bash
# Check memory and CPU
htop

# Check disk space
df -h

# Check running processes
ps aux | grep node
```

## 🎉 Success!

If everything is working, your Mall POS system should be accessible at:
**http://194.238.17.11**

## Next Steps (Optional)

1. **Get a Domain Name** and point it to 194.238.17.11
2. **Setup SSL Certificate** with Let's Encrypt for HTTPS
3. **Configure GitHub Actions** for automatic deployment
4. **Setup Monitoring** and backups

---

**Need Help?** Check the logs and error messages, most issues are related to:
- Environment variables not set correctly
- Supabase credentials missing or incorrect
- Firewall blocking connections
- PM2 process not running