# 🚀 0G Galileo Explorer Deployment Guide

## 📋 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ or similar Linux distribution
- **Node.js**: v18.0.0 or higher
- **RAM**: Minimum 4GB (8GB recommended)
- **CPU**: 2+ cores
- **Storage**: 10GB+ free space
- **Network**: Stable internet connection with open ports

### Required Software
```bash
# Check versions
node --version  # Should be v18+
npm --version   # Should be v8+
git --version   # Any recent version
```

## 🔧 Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/coinsspor/0g-galileo-explorer.git
cd 0g-galileo-explorer
```

### 2. Install Dependencies

#### Frontend Setup
```bash
cd frontend
npm install
```

#### Backend APIs Setup
```bash
# API 1 - Validator Service (Port 3001)
cd backend/api-validator
npm install

# API 2 - Blockchain Service (Port 3002)
cd backend/api-blockchain
npm install

# API 3 - Uptime Service (Port 3004)
cd backend/api-uptime
npm install
```

### 3. Configuration

#### Create Environment Variables
```bash
# In root directory
cp .env.example .env
```

#### Frontend Configuration (frontend/.env)
```env
# API Endpoints
VITE_API_URL_V1=http://localhost:3001
VITE_API_URL_V2=http://localhost:3002
VITE_UPTIME_API_URL=http://localhost:3004

# Network Configuration
VITE_CHAIN_ID=16600
VITE_CHAIN_NAME=0G Galileo Testnet
VITE_RPC_URL=https://0g-evmrpc-galileo.coinsspor.com/
```

#### Backend Configuration

**API 1 - Validator Service (backend/api-validator/.env)**
```env
# RPC Configuration
RPC_ENDPOINT=http://localhost:14545
STAKING_CONTRACT=0xea224dBB52F57752044c0C86aD50930091F561B9
DELEGATION_CONTRACT=0xE37bfc9e900bC5cC3279952B90f6Be9A53ED6949

# Service Configuration
PORT=3001
UPDATE_INTERVAL=45000
CACHE_DURATION=45000

# Network
CHAIN_ID=16600
```

**API 2 - Blockchain Service (backend/api-blockchain/.env)**
```env
# RPC Configuration
RPC_ENDPOINTS=["http://localhost:14545"]
CHAIN_ID=16600
CHAIN_NAME=0G Galileo Testnet

# Service Configuration
PORT=3002
NODE_ENV=production

# Cache Settings
CACHE_TTL_BLOCKS=30
CACHE_TTL_VALIDATORS=60
CACHE_TTL_DEFAULT=30

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**API 3 - Uptime Service (backend/api-uptime/.env)**
```env
# RPC Configuration
EVM_RPC_URL=https://0g-evmrpc-galileo.coinsspor.com/
VALIDATOR_API=http://localhost:3001/api/validators

# Service Configuration
PORT=3004
UPTIME_BLOCKS=100
UPDATE_INTERVAL=60000
CACHE_DURATION=120000

# Analysis Settings
MAX_BLOCK_ANALYSIS=50
RATE_LIMIT_DELAY=200
```

### 4. Start Development Servers

#### Option 1: Start All Services (Recommended)
```bash
# From root directory
npm run install:all  # Install all dependencies
npm run start:all    # Start all services

# Services will be available at:
# Frontend: http://localhost:5174
# API 1: http://localhost:3001
# API 2: http://localhost:3002
# API 3: http://localhost:3004
```

#### Option 2: Start Services Individually
```bash
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Validator API
cd backend/api-validator
node server.js

# Terminal 3 - Blockchain API
cd backend/api-blockchain
node server.js

# Terminal 4 - Uptime API
cd backend/api-uptime
node server.js
```

## 🏭 Production Deployment

### 1. Server Setup

#### Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Clone and Setup Application
```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/coinsspor/0g-galileo-explorer.git
sudo chown -R $USER:$USER 0g-galileo-explorer
cd 0g-galileo-explorer

# Install dependencies
npm run install:all

# Build frontend
cd frontend
npm run build
cd ..
```

### 3. PM2 Configuration

Create PM2 ecosystem file:
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: '0g-validator-api',
      script: './backend/api-validator/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/validator-error.log',
      out_file: './logs/validator-out.log',
      log_file: './logs/validator-combined.log',
      time: true
    },
    {
      name: '0g-blockchain-api',
      script: './backend/api-blockchain/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './logs/blockchain-error.log',
      out_file: './logs/blockchain-out.log',
      log_file: './logs/blockchain-combined.log',
      time: true
    },
    {
      name: '0g-uptime-api',
      script: './backend/api-uptime/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      error_file: './logs/uptime-error.log',
      out_file: './logs/uptime-out.log',
      log_file: './logs/uptime-combined.log',
      time: true
    }
  ]
};
```

Start with PM2:
```bash
# Create logs directory
mkdir -p logs

# Start all services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 4. Nginx Configuration

Create Nginx configuration:
```nginx
# /etc/nginx/sites-available/0g-explorer
server {
    listen 80;
    server_name 0ggalileoexplorer.coinsspor.com;
    
    # Force HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 0ggalileoexplorer.coinsspor.com;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/0ggalileoexplorer.coinsspor.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/0ggalileoexplorer.coinsspor.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1000;

    # Frontend - Serve static files
    root /var/www/0g-galileo-explorer/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 1 - Validator Service
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API 2 - Blockchain Service
    location /api/v2/ {
        proxy_pass http://localhost:3002/api/v2/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API 3 - Uptime Service (if needed externally)
    location /api/v2/uptime/ {
        proxy_pass http://localhost:3004/api/v2/uptime/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Enable configuration:
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/0g-explorer /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5. SSL Certificate Setup
```bash
# Get SSL certificate with Let's Encrypt
sudo certbot --nginx -d 0ggalileoexplorer.coinsspor.com

# Auto-renewal setup (already configured by certbot)
sudo certbot renew --dry-run
```

## 🐳 Docker Deployment (Alternative)

### Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  validator-api:
    build:
      context: ./backend/api-validator
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - ./logs/validator:/app/logs
    restart: unless-stopped
    networks:
      - 0g-network

  blockchain-api:
    build:
      context: ./backend/api-blockchain
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
    volumes:
      - ./logs/blockchain:/app/logs
    restart: unless-stopped
    networks:
      - 0g-network

  uptime-api:
    build:
      context: ./backend/api-uptime
      dockerfile: Dockerfile
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production
      - PORT=3004
      - VALIDATOR_API=http://validator-api:3001/api/validators
    volumes:
      - ./logs/uptime:/app/logs
    restart: unless-stopped
    depends_on:
      - validator-api
    networks:
      - 0g-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL_V1=http://validator-api:3001
        - VITE_API_URL_V2=http://blockchain-api:3002
        - VITE_UPTIME_API_URL=http://uptime-api:3004
    ports:
      - "5174:80"
    restart: unless-stopped
    depends_on:
      - validator-api
      - blockchain-api
      - uptime-api
    networks:
      - 0g-network

networks:
  0g-network:
    driver: bridge
```

### Dockerfile Examples

**Frontend Dockerfile**
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Backend API Dockerfile**
```dockerfile
# backend/api-validator/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### Deploy with Docker
```bash
# Build and start containers
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Check service status
pm2 status

# Check API health
curl http://localhost:3001/api/health
curl http://localhost:3002/health
curl http://localhost:3004/api/v2/uptime/health

# Check logs
pm2 logs --lines 100
```

### Log Rotation
```bash
# Install logrotate
sudo apt install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/0g-explorer
```

Add configuration:
```
/var/www/0g-galileo-explorer/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Backup Strategy
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/0g-explorer"
APP_DIR="/var/www/0g-galileo-explorer"

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz $APP_DIR \
    --exclude=$APP_DIR/node_modules \
    --exclude=$APP_DIR/frontend/node_modules \
    --exclude=$APP_DIR/backend/*/node_modules \
    --exclude=$APP_DIR/logs

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/app_$DATE.tar.gz"
```

### Update Procedure
```bash
# 1. Backup current version
./backup.sh

# 2. Pull latest changes
cd /var/www/0g-galileo-explorer
git pull origin main

# 3. Install new dependencies
npm run install:all

# 4. Build frontend
cd frontend
npm run build
cd ..

# 5. Restart services
pm2 restart all

# 6. Verify
pm2 status
curl http://localhost:3001/api/health
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :3001

# Kill process
sudo kill -9 <PID>
```

#### 2. Memory Issues
```bash
# Check memory usage
free -h
pm2 monit

# Restart services
pm2 restart all

# Increase memory limit in ecosystem.config.js
max_memory_restart: '2G'
```

#### 3. RPC Connection Issues
```bash
# Test RPC connection
curl -X POST http://localhost:14545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check network connectivity
ping 0g-evmrpc-galileo.coinsspor.com
```

#### 4. Frontend Build Issues
```bash
# Clear cache and rebuild
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

#### 5. Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 Security Checklist

- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured (only required ports open)
- [ ] Environment variables secured
- [ ] Regular security updates applied
- [ ] Backup strategy implemented
- [ ] Log rotation configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers in Nginx

## 📈 Performance Optimization

### Frontend Optimization
```bash
# Enable gzip in Nginx
gzip on;
gzip_types text/plain application/json application/javascript text/css;

# Set cache headers for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### Backend Optimization
```javascript
// Increase cache duration if stable
UPDATE_INTERVAL: 60000  // 60 seconds instead of 45

// Use PM2 cluster mode for APIs
instances: 2  // Run 2 instances
exec_mode: 'cluster'
```

### Database Optimization (Future)
```bash
# If using PostgreSQL/Redis in future
# Tune PostgreSQL
shared_buffers = 256MB
effective_cache_size = 1GB

# Redis configuration
maxmemory 512mb
maxmemory-policy allkeys-lru
```

## 📞 Support

For deployment issues:
- GitHub Issues: https://github.com/coinsspor/0g-galileo-explorer/issues
- Discord: 0G Labs Discord
- Documentation: This guide

## ✅ Deployment Checklist

### Development
- [ ] Node.js 18+ installed
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] All services running locally
- [ ] Frontend accessible at localhost:5174

### Production
- [ ] Server prerequisites met
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Frontend built
- [ ] PM2 services running
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Domain pointing to server
- [ ] Monitoring setup
- [ ] Backup configured
- [ ] Security measures applied

---

**Last Updated**: August 2025
**Version**: 1.0.0
