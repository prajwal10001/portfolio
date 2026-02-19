# Oracle Cloud Infrastructure (OCI) Deployment Guide

## 🎯 Overview
This guide shows you how to deploy your **WebSocket Voice Agent** (frontend + backend) to Oracle Cloud Infrastructure.

## 📦 Your Application Stack
- **Frontend**: React + Vite + TypeScript + Pipecat Small WebRTC
- **Backend**: Python FastAPI + Pipecat AI + WebSocket support
- **Requirements**: Persistent WebSocket connections, WebRTC support, environment variables

---

## 🚀 Deployment Options for Oracle Cloud

### **Option 1: OCI Container Instances (Recommended) ⭐**
Best for: Quick deployment, serverless containers, minimal management

#### **1.1 Deploy Backend (Python FastAPI)**

**Step 1: Create Dockerfile for Backend**
```dockerfile
# Create file: Dockerfile.backend
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY custom_stt_server_websocket.py .
COPY pipecat_server.py .
COPY .env .

# Expose port
EXPOSE 8000

# Start server
CMD ["uvicorn", "custom_stt_server_websocket:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 2: Build and Push to OCI Registry (OCIR)**
```bash
# Login to OCI Registry
docker login <region-key>.ocir.io -u '<tenancy-namespace>/<username>' -p '<auth-token>'

# Build image
docker build -f Dockerfile.backend -t <region-key>.ocir.io/<tenancy-namespace>/voice-agent-backend:latest .

# Push to OCIR
docker push <region-key>.ocir.io/<tenancy-namespace>/voice-agent-backend:latest
```

**Step 3: Create Container Instance**
```bash
oci container-instances container-instance create \
  --compartment-id <compartment-ocid> \
  --availability-domain <AD-name> \
  --shape CI.Standard.E4.Flex \
  --shape-config '{"ocpus":1.0,"memoryInGBs":4.0}' \
  --containers '[{
    "displayName": "voice-agent-backend",
    "imageUrl": "<region-key>.ocir.io/<tenancy-namespace>/voice-agent-backend:latest",
    "environmentVariables": {
      "AZURE_SPEECH_KEY": "<your-key>",
      "AZURE_SPEECH_REGION": "<your-region>",
      "AZURE_OPENAI_API_KEY": "<your-key>",
      "AZURE_OPENAI_ENDPOINT": "<your-endpoint>",
      "CARTESIA_API_KEY": "<your-key>"
    }
  }]' \
  --vnics '[{
    "subnetId": "<subnet-ocid>",
    "isPublicIpAssigned": true
  }]'
```

**Step 4: Get Public IP**
```bash
# Get the container instance public IP
oci container-instances container-instance list \
  --compartment-id <compartment-ocid> \
  --lifecycle-state ACTIVE
```

#### **1.2 Deploy Frontend (React + Vite)**

**Step 1: Create Dockerfile for Frontend**
```dockerfile
# Create file: Dockerfile.frontend
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build argument for backend URL
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build for production
RUN npm run build

# Production image with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Step 2: Create nginx.conf**
```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

**Step 3: Build and Deploy**
```bash
# Build with backend URL
docker build -f Dockerfile.frontend \
  --build-arg VITE_BACKEND_URL=http://<backend-public-ip>:8000 \
  -t <region-key>.ocir.io/<tenancy-namespace>/voice-agent-frontend:latest .

# Push to OCIR
docker push <region-key>.ocir.io/<tenancy-namespace>/voice-agent-frontend:latest

# Create container instance for frontend
oci container-instances container-instance create \
  --compartment-id <compartment-ocid> \
  --availability-domain <AD-name> \
  --shape CI.Standard.E4.Flex \
  --containers '[{
    "displayName": "voice-agent-frontend",
    "imageUrl": "<region-key>.ocir.io/<tenancy-namespace>/voice-agent-frontend:latest"
  }]' \
  --vnics '[{
    "subnetId": "<subnet-ocid>",
    "isPublicIpAssigned": true
  }]'
```

---

### **Option 2: OCI Compute Instance (VM)**
Best for: Full control, long-running services, cost-effective

#### **2.1 Create Compute Instance**

1. **Go to OCI Console** → Compute → Instances
2. **Create Instance**:
   - **Name**: `voice-agent-server`
   - **Image**: Ubuntu 22.04 or Oracle Linux 8
   - **Shape**: VM.Standard.E4.Flex (1 OCPU, 4GB RAM) - **Always Free** eligible
   - **Networking**: Create or select VCN with public subnet
   - **Public IP**: Assign public IP
   - **SSH Keys**: Upload your SSH public key

#### **2.2 Setup Backend**

```bash
# SSH into instance
ssh -i <your-key.pem> ubuntu@<instance-public-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Node.js (for frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone your repository
git clone https://github.com/<your-username>/portfolio.git
cd portfolio

# Setup backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
AZURE_SPEECH_KEY=<your-key>
AZURE_SPEECH_REGION=<your-region>
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_ENDPOINT=<your-endpoint>
CARTESIA_API_KEY=<your-key>
EOF

# Install PM2 for process management
sudo npm install -g pm2

# Start backend with PM2
pm2 start "uvicorn custom_stt_server_websocket:app --host 0.0.0.0 --port 8000" --name voice-agent-backend
pm2 save
pm2 startup
```

#### **2.3 Setup Frontend**

```bash
# Build frontend
npm install
VITE_BACKEND_URL=http://<instance-public-ip>:8000 npm run build

# Install nginx
sudo apt install -y nginx

# Copy build to nginx
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

# Configure nginx
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    root /var/www/html;
    index index.html;
    
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
    }
}
EOF

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### **2.4 Configure Firewall**

```bash
# Allow HTTP, HTTPS, and custom ports
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# In OCI Console, create Security List rules:
# - Ingress: 0.0.0.0/0 → TCP 80 (HTTP)
# - Ingress: 0.0.0.0/0 → TCP 443 (HTTPS)
# - Ingress: 0.0.0.0/0 → TCP 8000 (Backend WebSocket)
```

---

### **Option 3: OCI Kubernetes Engine (OKE)**
Best for: Scalable deployments, production-grade, microservices

#### **3.1 Create Kubernetes Manifests**

**Backend Deployment** (`k8s/backend-deployment.yaml`):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: voice-agent-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: voice-agent-backend
  template:
    metadata:
      labels:
        app: voice-agent-backend
    spec:
      containers:
      - name: backend
        image: <region-key>.ocir.io/<tenancy-namespace>/voice-agent-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: AZURE_SPEECH_KEY
          valueFrom:
            secretKeyRef:
              name: voice-agent-secrets
              key: azure-speech-key
        - name: AZURE_OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: voice-agent-secrets
              key: azure-openai-key
        - name: CARTESIA_API_KEY
          valueFrom:
            secretKeyRef:
              name: voice-agent-secrets
              key: cartesia-key
---
apiVersion: v1
kind: Service
metadata:
  name: voice-agent-backend-service
spec:
  type: LoadBalancer
  selector:
    app: voice-agent-backend
  ports:
  - port: 8000
    targetPort: 8000
```

**Frontend Deployment** (`k8s/frontend-deployment.yaml`):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: voice-agent-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: voice-agent-frontend
  template:
    metadata:
      labels:
        app: voice-agent-frontend
    spec:
      containers:
      - name: frontend
        image: <region-key>.ocir.io/<tenancy-namespace>/voice-agent-frontend:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: voice-agent-frontend-service
spec:
  type: LoadBalancer
  selector:
    app: voice-agent-frontend
  ports:
  - port: 80
    targetPort: 80
```

**Create Secrets**:
```bash
kubectl create secret generic voice-agent-secrets \
  --from-literal=azure-speech-key='<your-key>' \
  --from-literal=azure-openai-key='<your-key>' \
  --from-literal=cartesia-key='<your-key>'
```

**Deploy**:
```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Get external IPs
kubectl get services
```

---

## 💰 **Cost Comparison**

| Option | Monthly Cost (Estimate) | Free Tier |
|--------|------------------------|-----------|
| **Container Instances** | $10-30 | ❌ No |
| **Compute VM (E4.Flex)** | $0 (1 OCPU, 4GB) | ✅ Always Free |
| **OKE (Kubernetes)** | $50-100+ | ❌ No |
| **Render.com (Current)** | $0 (with sleep) | ✅ Free Tier |

**⭐ Recommendation**: Use **Option 2 (Compute VM)** for cost-effective, Always Free deployment!

---

## 🔧 **Quick Setup Commands**

### **Create All Files at Once**:

```bash
# Navigate to portfolio
cd c:\Users\prajw\Desktop\portfolio

# Create Dockerfile for backend
# (Copy content from Option 1.1 above)

# Create Dockerfile for frontend
# (Copy content from Option 1.2 above)

# Create nginx.conf
# (Copy content from Option 1.2 above)
```

---

## 🌐 **DNS & SSL Setup (Optional)**

### **1. Add Custom Domain**
```bash
# In OCI Console: Networking → DNS Zone Management
# Add A record: @ → <instance-public-ip>
```

### **2. Setup SSL with Let's Encrypt**
```bash
# On compute instance
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renew
sudo certbot renew --dry-run
```

---

## ✅ **Testing Your Deployment**

### **1. Test Backend**
```bash
curl http://<backend-ip>:8000/
# Expected: {"status": "ok", "service": "Maya Voice Agent"}
```

### **2. Test Frontend**
```bash
# Open browser
http://<frontend-ip>

# Check WebSocket connection in console:
# Should show: "WebSocket connected"
```

### **3. Test Voice Agent**
- Click "Connect" button
- Grant microphone permissions
- Speak to test voice agent functionality

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: WebSocket connection refused**
**Solution**: Check Security List allows port 8000
```bash
# In OCI Console: Networking → Security Lists
# Add Ingress Rule: TCP 8000 from 0.0.0.0/0
```

### **Issue 2: CORS errors**
**Solution**: Update backend CORS settings in `custom_stt_server_websocket.py`
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://<frontend-ip>"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **Issue 3: Container won't start**
**Solution**: Check environment variables are set correctly
```bash
# View container logs
oci container-instances container-instance list-container-logs \
  --container-instance-id <instance-ocid>
```

---

## 📚 **Useful OCI CLI Commands**

```bash
# List all container instances
oci container-instances container-instance list --compartment-id <compartment-ocid>

# Stop container instance
oci container-instances container-instance stop --container-instance-id <instance-ocid>

# Delete container instance
oci container-instances container-instance delete --container-instance-id <instance-ocid>

# List compute instances
oci compute instance list --compartment-id <compartment-ocid>
```

---

## 🎯 **Next Steps**

1. ✅ **Choose deployment option** (Recommended: Option 2 - Compute VM)
2. ✅ **Create OCI account** (if you don't have one)
3. ✅ **Set up OCI CLI** or use OCI Console
4. ✅ **Create required Docker files** (if using containers)
5. ✅ **Deploy backend first**, then frontend
6. ✅ **Test WebSocket connection**
7. ✅ **Setup custom domain + SSL** (optional)

---

## 📞 **Support Resources**

- [OCI Documentation](https://docs.oracle.com/en-us/iaas/)
- [OCI Container Instances](https://docs.oracle.com/en-us/iaas/Content/container-instances/home.htm)
- [OCI Compute](https://docs.oracle.com/en-us/iaas/Content/Compute/home.htm)
- [OCI Free Tier](https://www.oracle.com/cloud/free/)

---

**Status**: ✅ Ready to deploy to Oracle Cloud!  
**Recommended**: Start with **Option 2 (Compute VM)** for Always Free deployment.
