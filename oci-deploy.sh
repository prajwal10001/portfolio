#!/bin/bash

# Oracle Cloud Quick Deployment Script
# This script helps you deploy your voice agent to OCI Compute Instance (Always Free Tier)

echo "🚀 Oracle Cloud Voice Agent Deployment Script"
echo "=============================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on OCI instance
if [ ! -f /etc/oracle-cloud-agent/agent_config.yaml ]; then
    echo -e "${RED}❌ This script should be run on an OCI Compute Instance${NC}"
    echo "Please follow these steps first:"
    echo "1. Create an OCI Compute Instance (VM.Standard.E4.Flex - Always Free)"
    echo "2. SSH into the instance"
    echo "3. Clone your repository: git clone <your-repo-url>"
    echo "4. Run this script: bash oci-deploy.sh"
    exit 1
fi

echo -e "${GREEN}✅ Running on OCI Compute Instance${NC}"
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
echo "🐍 Installing Python 3.11..."
sudo apt install -y python3.11 python3.11-venv python3-pip git

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Install PM2
echo "⚙️ Installing PM2..."
sudo npm install -g pm2

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo "🔐 Please provide your environment variables:"
echo ""

# Prompt for environment variables
read -p "Azure Speech Key: " AZURE_SPEECH_KEY
read -p "Azure Speech Region: " AZURE_SPEECH_REGION
read -p "Azure OpenAI API Key: " AZURE_OPENAI_API_KEY
read -p "Azure OpenAI Endpoint: " AZURE_OPENAI_ENDPOINT
read -p "Cartesia API Key: " CARTESIA_API_KEY

# Create .env file
cat > .env << EOF
AZURE_SPEECH_KEY=$AZURE_SPEECH_KEY
AZURE_SPEECH_REGION=$AZURE_SPEECH_REGION
AZURE_OPENAI_API_KEY=$AZURE_OPENAI_API_KEY
AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_DEPLOYMENT=gpt-35-turbo
AZURE_OPENAI_API_VERSION=2024-02-15-preview
CARTESIA_API_KEY=$CARTESIA_API_KEY
CARTESIA_VOICE_ID=f786b574-daa5-4673-aa0c-cbe3e8534c02
EOF

echo -e "${GREEN}✅ Created .env file${NC}"

# Setup Python virtual environment
echo ""
echo "🐍 Setting up Python virtual environment..."
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Get instance public IP
INSTANCE_IP=$(curl -s http://169.254.169.254/opc/v1/instance/metadata | grep -oP '"publicIp"\s*:\s*"\K[^"]+')

if [ -z "$INSTANCE_IP" ]; then
    echo -e "${YELLOW}⚠️ Could not detect public IP automatically${NC}"
    read -p "Please enter your OCI instance public IP: " INSTANCE_IP
fi

echo -e "${GREEN}✅ Instance IP: $INSTANCE_IP${NC}"

# Build frontend
echo ""
echo "🏗️ Building frontend..."
npm install
VITE_BACKEND_URL="http://$INSTANCE_IP:8000" npm run build

# Setup nginx
echo "🌐 Configuring Nginx..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

# Create nginx config with WebSocket proxy
sudo tee /etc/nginx/sites-available/default > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name _;
    
    root /var/www/html;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    
    # Serve frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy WebSocket connections to backend
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Proxy API calls to backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

# Test nginx config
sudo nginx -t

# Restart nginx
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configure firewall
echo "🔥 Configuring firewall..."
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT

# Save iptables rules
sudo mkdir -p /etc/iptables
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# Start backend with PM2
echo ""
echo "🚀 Starting backend with PM2..."
cd "$SCRIPT_DIR"
source venv/bin/activate
pm2 delete voice-agent-backend 2>/dev/null || true
pm2 start "uvicorn custom_stt_server_websocket:app --host 0.0.0.0 --port 8000" --name voice-agent-backend
pm2 save
pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "🌐 Frontend URL: http://$INSTANCE_IP"
echo "🔌 Backend URL: http://$INSTANCE_IP:8000"
echo ""
echo "📋 Next Steps:"
echo "1. Open http://$INSTANCE_IP in your browser"
echo "2. Test the voice agent by clicking 'Connect'"
echo "3. Check backend status: pm2 status"
echo "4. View backend logs: pm2 logs voice-agent-backend"
echo ""
echo -e "${YELLOW}⚠️ Important: Configure OCI Security List to allow ports 80, 443, and 8000${NC}"
echo ""
echo "In OCI Console:"
echo "1. Go to Networking → Virtual Cloud Networks"
echo "2. Select your VCN → Security Lists"
echo "3. Add Ingress Rules:"
echo "   - Source: 0.0.0.0/0, Protocol: TCP, Port: 80"
echo "   - Source: 0.0.0.0/0, Protocol: TCP, Port: 443"
echo "   - Source: 0.0.0.0/0, Protocol: TCP, Port: 8000"
echo ""
echo "🎉 Happy deploying!"
