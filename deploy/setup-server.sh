#!/bin/bash

# Server Setup Script for AWS EC2
# This script installs all necessary dependencies for deploying the dashboard

set -e

echo "🚀 Starting server setup..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
echo "✅ Node.js version: $node_version"
echo "✅ npm version: $npm_version"

# Install PM2 globally
echo "📦 Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Install Nginx
echo "📦 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
fi

# Install Git (if not already installed)
echo "📦 Installing Git..."
sudo apt-get install -y git

# Create application directory
echo "📁 Creating application directory..."
APP_DIR="/var/www/ai-calling-agent-dashboard"
sudo mkdir -p $APP_DIR
sudo chown -R ubuntu:ubuntu $APP_DIR

# Setup PM2 startup script
echo "⚙️ Setting up PM2 startup..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "✅ Server setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Clone your repository: git clone https://github.com/troika-tech/Troika-Calling-Agent-Dashboard.git $APP_DIR"
echo "2. Run the deployment script: ./deploy/deploy.sh"

