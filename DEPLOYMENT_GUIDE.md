# ATİS Production Deployment Guide

## 🚀 Production Deployment Checklist

### Prerequisites
- [ ] Ubuntu 20.04+ / CentOS 8+ server
- [ ] Docker & Docker Compose installed
- [ ] Domain name configured (atis.edu.az)
- [ ] SSL certificate obtained
- [ ] 8GB+ RAM, 4+ CPU cores
- [ ] 100GB+ SSD storage

### Step 1: Server Setup
```bash
# Update server
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 2: Application Deployment
```bash
# Clone repository
git clone <repository-url> /opt/atis
cd /opt/atis

# Setup production environment
cp backend/.env.production.example backend/.env
cp frontend/.env.production.example frontend/.env

# Update environment variables
sudo nano backend/.env  # Update DB_PASSWORD, APP_KEY, etc.
sudo nano frontend/.env  # Update API URLs

# Generate Laravel key
docker-compose -f docker-compose.prod.yml run backend php artisan key:generate
```

### Step 3: Database Setup
```bash
# Start database services
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Run migrations
docker-compose -f docker-compose.prod.yml run backend php artisan migrate --force

# Seed initial data
docker-compose -f docker-compose.prod.yml run backend php artisan db:seed --class=SuperAdminSeeder
docker-compose -f docker-compose.prod.yml run backend php artisan db:seed --class=InstitutionHierarchySeeder
```

### Step 4: SSL Certificate Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d atis.edu.az -d www.atis.edu.az
```

### Step 5: Start Production Services
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify services
docker-compose -f docker-compose.prod.yml ps
curl -k https://atis.edu.az/api/health
```

### Step 6: Monitoring Setup
```bash
# Setup log rotation
sudo nano /etc/logrotate.d/atis

# Setup automated backups
crontab -e
# Add: 0 2 * * * /opt/atis/scripts/backup.sh
```

## 🔧 Post-Deployment Configuration

### Performance Optimization
- [ ] Enable OPcache for PHP
- [ ] Configure Redis memory limits
- [ ] Set up CDN for static assets
- [ ] Configure database connection pooling

### Security Hardening
- [ ] Configure firewall rules
- [ ] Set up fail2ban
- [ ] Enable audit logging
- [ ] Configure backup encryption

### Monitoring & Alerts
- [ ] Setup health check endpoints
- [ ] Configure error logging
- [ ] Set up performance monitoring
- [ ] Create alerting rules

## 📊 Production Endpoints

- **Frontend**: https://atis.edu.az
- **API**: https://atis.edu.az/api
- **Health Check**: https://atis.edu.az/api/health
- **Admin Panel**: https://atis.edu.az/admin

## 🆘 Troubleshooting

### Common Issues
1. **Database Connection Failed**
   ```bash
   # Check database logs
   docker-compose -f docker-compose.prod.yml logs postgres
   
   # Verify connection
   docker-compose -f docker-compose.prod.yml exec postgres psql -U atis_user -d atis_production
   ```

2. **Frontend Build Failed**
   ```bash
   # Rebuild frontend
   docker-compose -f docker-compose.prod.yml build frontend --no-cache
   ```

3. **SSL Certificate Issues**
   ```bash
   # Renew certificate
   sudo certbot renew --dry-run
   ```

## 📞 Emergency Contacts

- **System Admin**: admin@atis.edu.az
- **Database Admin**: dba@atis.edu.az  
- **Security Team**: security@atis.edu.az

---
**Last Updated**: August 2025
**Version**: 1.0.0
