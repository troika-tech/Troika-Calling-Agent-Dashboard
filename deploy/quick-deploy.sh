#!/bin/bash

# Quick deployment script - combines setup and deployment
# Use this if you're setting up for the first time

set -e

APP_DIR="/var/www/ai-calling-agent-dashboard"
REPO_URL="https://github.com/troika-tech/Troika-Calling-Agent-Dashboard.git"

echo "🚀 Quick Deployment Script"
echo "=========================="

# Check if directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "📁 Cloning repository..."
    sudo mkdir -p $APP_DIR
    sudo chown -R ubuntu:ubuntu $APP_DIR
    git clone $REPO_URL $APP_DIR
fi

cd $APP_DIR

# Run setup if needed
if ! command -v node &> /dev/null || ! command -v nginx &> /dev/null || ! command -v pm2 &> /dev/null; then
    echo "⚙️ Running server setup..."
    chmod +x deploy/setup-server.sh
    ./deploy/setup-server.sh
fi

# Setup Nginx
if [ ! -f "/etc/nginx/sites-enabled/ai-calling-agent.0804.in" ]; then
    echo "⚙️ Configuring Nginx..."
    sudo cp deploy/nginx.conf /etc/nginx/sites-available/ai-calling-agent.0804.in
    sudo ln -sf /etc/nginx/sites-available/ai-calling-agent.0804.in /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
fi

# Deploy
echo "🚀 Deploying application..."
chmod +x deploy/deploy.sh
./deploy/deploy.sh

echo ""
echo "✅ Quick deployment completed!"
echo "🌐 Your application should be available at: https://ai-calling-agent.0804.in"
echo ""
echo "Next steps:"
echo "1. Setup SSL: ./deploy/setup-ssl.sh"
echo "2. Check status: pm2 status"
echo "3. View logs: pm2 logs ai-calling-agent-dashboard"

