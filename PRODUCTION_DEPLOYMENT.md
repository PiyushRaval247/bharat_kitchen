# Production Deployment Guide for Hostinger VPS

This guide will help you deploy your Mall POS system to a Hostinger VPS with HTTPS support.

## 🚀 Pre-Deployment Checklist

### 1. Update Environment Variables

Before deploying, update these files with your actual domain:

**Root `.env` file:**
```bash
API_BASE_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com
```

**Frontend `.env` file:**
```bash
VITE_API_URL=https://yourdomain.com
```

**Backend `.env` file:**
```bash
FRONTEND_URL=https://yourdomain.com
```

### 2. SSL Certificate Setup

1. **Get SSL Certificate** from your domain provider or use Let's Encrypt
2. **Update nginx-https.conf** with your certificate paths:
   ```nginx
   ssl_certificate /path/to/your/certificate.crt;
   ssl_certificate_key /path/to/your/private.key;
   ```
3. **Replace yourdomain.com** with your actual domain in `nginx-https.conf`

## 🐳 Docker Deployment

### Option 1: Using Docker Compose (Recommended)

1. **Upload your project** to your Hostinger VPS
2. **Install Docker and Docker Compose** on your VPS
3. **Update environment variables** as mentioned above
4. **Deploy with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

### Option 2: Manual Docker Build

1. **Build backend image:**
   ```bash
   cd backend
   docker build -t mall-pos-backend .
   ```

2. **Build frontend image:**
   ```bash
   cd frontend
   docker build -t mall-pos-frontend .
   ```

3. **Run containers:**
   ```bash
   # Backend
   docker run -d --name mall-pos-backend -p 3001:3001 --env-file backend/.env mall-pos-backend
   
   # Frontend
   docker run -d --name mall-pos-frontend -p 80:80 --env-file frontend/.env mall-pos-frontend
   ```

## 🌐 Nginx Configuration

### For HTTPS Setup:

1. **Copy the HTTPS nginx configuration:**
   ```bash
   cp frontend/nginx-https.conf /etc/nginx/sites-available/mall-pos
   ln -s /etc/nginx/sites-available/mall-pos /etc/nginx/sites-enabled/
   ```

2. **Test and reload nginx:**
   ```bash
   nginx -t
   systemctl reload nginx
   ```

## 🔒 Security Considerations

1. **Firewall Setup:**
   - Allow ports 80 (HTTP) and 443 (HTTPS)
   - Allow port 3001 for backend API
   - Block unnecessary ports

2. **Database Security:**
   - Ensure SQLite database file has proper permissions
   - Regular backups of the database

3. **Environment Variables:**
   - Never commit actual production credentials to version control
   - Use strong passwords for Supabase and other services

## 📊 Monitoring and Maintenance

1. **Health Checks:**
   - Backend: `https://yourdomain.com/api/health`
   - Frontend: `https://yourdomain.com`

2. **Log Monitoring:**
   ```bash
   # View Docker logs
   docker logs mall-pos-backend
   docker logs mall-pos-frontend
   ```

3. **Database Backup:**
   ```bash
   # Backup SQLite database
   docker exec mall-pos-backend cp /app/db/pos.db /backup/pos-$(date +%Y%m%d).db
   ```

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Verify `FRONTEND_URL` in backend `.env`
   - Check that domain matches in all environment files

2. **SSL Certificate Issues:**
   - Verify certificate paths in nginx configuration
   - Check certificate validity: `openssl x509 -in certificate.crt -text -noout`

3. **API Connection Issues:**
   - Verify `VITE_API_URL` in frontend environment
   - Check that backend is accessible on port 3001

4. **Barcode Images Not Loading:**
   - Ensure static file serving is working: `/static/barcodes/` and `/static/qrcodes/`
   - Check that `VITE_API_URL` is correctly set for image paths

## 📞 Support

If you encounter issues:
1. Check Docker container logs
2. Verify all environment variables are set correctly
3. Ensure SSL certificates are properly configured
4. Test API endpoints manually

---

**Your Mall POS system is now ready for production deployment with HTTPS support!** 🎉