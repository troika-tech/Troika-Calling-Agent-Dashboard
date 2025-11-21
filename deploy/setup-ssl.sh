#!/bin/bash

# SSL Setup Script using Let's Encrypt
# Run this after initial deployment to set up proper SSL certificates

set -e

DOMAIN="ai-calling-agent.0804.in"

echo "🔒 Setting up SSL certificates for $DOMAIN..."

# Install Certbot
echo "📦 Installing Certbot..."
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@0804.in

# Test auto-renewal
echo "🔄 Testing certificate auto-renewal..."
sudo certbot renew --dry-run

echo "✅ SSL setup completed!"
echo ""
echo "Certificate will auto-renew. Check renewal with: sudo certbot renew --dry-run"

