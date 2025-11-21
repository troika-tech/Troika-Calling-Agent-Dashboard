# Deployment Guide for AI Calling Agent Dashboard

This guide will help you deploy the dashboard to AWS EC2 instance at `https://ai-calling-agent.0804.in`

## Prerequisites

- AWS EC2 instance running Ubuntu (IP: 52.66.245.126)
- SSH access with key: `C:\Users\USER\.ssh\troika-calling-dashboard.pem`
- Domain DNS configured: `ai-calling-agent.0804.in` → `52.66.245.126`
- GitHub repository access

## Step 1: SSH into the Server

```bash
ssh -i "C:\Users\USER\.ssh\troika-calling-dashboard.pem" ubuntu@52.66.245.126
```

## Step 2: Initial Server Setup

Once connected to the server, run the setup script:

```bash
# Clone the repository first
git clone https://github.com/troika-tech/Troika-Calling-Agent-Dashboard.git /var/www/ai-calling-agent-dashboard

# Navigate to the project directory
cd /var/www/ai-calling-agent-dashboard

# Make scripts executable
chmod +x deploy/setup-server.sh
chmod +x deploy/deploy.sh
chmod +x deploy/setup-ssl.sh

# Run the server setup script
./deploy/setup-server.sh
```

This will install:
- Node.js 20.x
- npm
- PM2 (process manager)
- Nginx (web server)
- Git

## Step 3: Configure Nginx

```bash
# Copy the Nginx configuration
sudo cp deploy/nginx.conf /etc/nginx/sites-available/ai-calling-agent.0804.in

# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/ai-calling-agent.0804.in /etc/nginx/sites-enabled/

# Remove default Nginx site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

## Step 4: Deploy the Application

```bash
# Run the deployment script
cd /var/www/ai-calling-agent-dashboard
./deploy/deploy.sh
```

This script will:
1. Pull the latest code from GitHub
2. Install dependencies
3. Build the production bundle
4. Start the application with PM2
5. Reload Nginx

## Step 5: Setup SSL Certificate (Recommended)

For production, you should set up SSL certificates using Let's Encrypt:

```bash
# Run the SSL setup script
./deploy/setup-ssl.sh
```

Or manually:

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d ai-calling-agent.0804.in

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 6: Configure Firewall

Make sure your EC2 security group allows:
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS)

```bash
# On the server, configure UFW if needed
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Managing the Application

### Check Application Status
```bash
pm2 status
pm2 logs ai-calling-agent-dashboard
```

### Restart Application
```bash
pm2 restart ai-calling-agent-dashboard
```

### Stop Application
```bash
pm2 stop ai-calling-agent-dashboard
```

### View Nginx Logs
```bash
sudo tail -f /var/log/nginx/ai-calling-agent-access.log
sudo tail -f /var/log/nginx/ai-calling-agent-error.log
```

## Updating the Application

To update the application with new code:

```bash
cd /var/www/ai-calling-agent-dashboard
./deploy/deploy.sh
```

Or manually:

```bash
cd /var/www/ai-calling-agent-dashboard
git pull origin main
npm ci
npm run build
pm2 restart ai-calling-agent-dashboard
```

## Troubleshooting

### Application not starting
```bash
# Check PM2 logs
pm2 logs ai-calling-agent-dashboard --lines 50

# Check if port 3001 is in use
sudo netstat -tulpn | grep 3001
```

### Nginx not working
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Build errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Environment Variables

If you need to set environment variables, create a `.env` file in the project root:

```bash
cd /var/www/ai-calling-agent-dashboard
nano .env
```

Then update the build process if needed to use these variables.

## Monitoring

PM2 provides monitoring capabilities:

```bash
# Monitor in real-time
pm2 monit

# View detailed information
pm2 show ai-calling-agent-dashboard
```

## Backup

Regular backups are recommended:

```bash
# Backup the application
tar -czf ~/backup-$(date +%Y%m%d).tar.gz /var/www/ai-calling-agent-dashboard
```

