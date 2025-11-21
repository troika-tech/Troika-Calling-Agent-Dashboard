# Quick Start Deployment Guide

## 🚀 Deploy to AWS EC2 in 5 Steps

### Step 1: SSH into your server
```bash
ssh -i "C:\Users\USER\.ssh\troika-calling-dashboard.pem" ubuntu@52.66.245.126
```

### Step 2: Clone the repository
```bash
sudo mkdir -p /var/www/ai-calling-agent-dashboard
sudo chown -R ubuntu:ubuntu /var/www/ai-calling-agent-dashboard
git clone https://github.com/troika-tech/Troika-Calling-Agent-Dashboard.git /var/www/ai-calling-agent-dashboard
cd /var/www/ai-calling-agent-dashboard
```

### Step 3: Run the quick deployment script
```bash
chmod +x deploy/quick-deploy.sh
./deploy/quick-deploy.sh
```

This will:
- Install Node.js, Nginx, PM2
- Configure Nginx
- Build and deploy the application

### Step 4: Setup SSL (Optional but Recommended)
```bash
chmod +x deploy/setup-ssl.sh
./deploy/setup-ssl.sh
```

Or manually:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ai-calling-agent.0804.in
```

### Step 5: Verify deployment
Visit: https://ai-calling-agent.0804.in

---

## 📝 Manual Deployment (Alternative)

If you prefer step-by-step:

1. **Setup server:**
   ```bash
   ./deploy/setup-server.sh
   ```

2. **Configure Nginx:**
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/ai-calling-agent.0804.in
   sudo ln -s /etc/nginx/sites-available/ai-calling-agent.0804.in /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Deploy:**
   ```bash
   ./deploy/deploy.sh
   ```

---

## 🔄 Updating the Application

To update with new code:
```bash
cd /var/www/ai-calling-agent-dashboard
./deploy/deploy.sh
```

---

## 🛠️ Useful Commands

- Check application status: `pm2 status`
- View logs: `pm2 logs ai-calling-agent-dashboard`
- Restart: `pm2 restart ai-calling-agent-dashboard`
- Nginx logs: `sudo tail -f /var/log/nginx/ai-calling-agent-error.log`

---

## ⚠️ Important Notes

1. **SSL Certificate**: The Nginx config includes placeholder SSL paths. You need to either:
   - Run `./deploy/setup-ssl.sh` for Let's Encrypt
   - Or update the SSL paths in `/etc/nginx/sites-available/ai-calling-agent.0804.in`

2. **Firewall**: Ensure your EC2 security group allows:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)

3. **DNS**: Verify your DNS record is pointing to `52.66.245.126`

