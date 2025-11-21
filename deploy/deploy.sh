#!/bin/bash

# Deployment Script for AI Calling Agent Dashboard
# This script pulls the latest code, builds, and deploys the application

set -e

APP_DIR="/var/www/ai-calling-agent-dashboard"
REPO_URL="https://github.com/troika-tech/Troika-Calling-Agent-Dashboard.git"
DOMAIN="ai-calling-agent.0804.in"

echo "🚀 Starting deployment..."

# Navigate to application directory
cd $APP_DIR

# Pull latest code from GitHub
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Install/update dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Build the application
echo "🔨 Building application..."
npm run build

# Note: We're serving static files directly with Nginx, so PM2 is not needed
# But we keep this section in case you want to use PM2 for serving
# For now, Nginx will serve the static files from the dist directory

echo "✅ Build completed. Nginx will serve the static files."

# Reload Nginx
echo "🔄 Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo ""
echo "Application is running at: https://$DOMAIN"
echo "Check status with: pm2 status"
echo "View logs with: pm2 logs ai-calling-agent-dashboard"

