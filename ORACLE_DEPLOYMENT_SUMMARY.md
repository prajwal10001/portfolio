# 📦 Oracle Cloud Deployment - Complete Package

## ✅ **YES, You Can Deploy to Oracle Cloud!**

Your **WebSocket Voice Agent** (frontend + backend) is **fully compatible** with Oracle Cloud Infrastructure (OCI). I've created a complete deployment package for you.

---

## 🎯 What's Been Prepared

### 📄 **Documentation Created**

1. **`ORACLE_CLOUD_DEPLOYMENT.md`** - Full deployment guide with 3 options:
   - Option 1: Container Instances
   - Option 2: Compute VM (Always Free) ⭐ **Recommended**
   - Option 3: Kubernetes (OKE)

2. **`ORACLE_DEPLOYMENT_CHECKLIST.md`** - Step-by-step checklist:
   - Pre-deployment setup
   - Instance creation
   - Security configuration
   - Deployment verification
   - Troubleshooting guide

3. **`ORACLE_QUICK_REFERENCE.md`** - Quick reference card:
   - 5-minute deploy commands
   - Essential commands (PM2, Nginx, Docker)
   - Common issues & fixes
   - Cost summary

### 🐳 **Docker Files Created**

1. **`Dockerfile.backend`** - Python FastAPI backend container
2. **`Dockerfile.frontend`** - React frontend with Nginx
3. **`docker-compose.yml`** - Run both together locally or on OCI
4. **`nginx.conf`** - Nginx configuration for SPA

### 🚀 **Deployment Scripts**

1. **`oci-deploy.sh`** - Automated deployment script:
   - Installs all dependencies
   - Configures services
   - Sets up PM2 and Nginx
   - Deploys frontend and backend

### 🔐 **Security Updates**

1. **`.gitignore`** - Updated to exclude:
   - SSH keys (*.pem, *.key, *.ppk)
   - Environment files
   - Sensitive configuration

---

## 🚀 Deployment Options Overview

### **Option 1: Quick Deploy (Compute Instance) - RECOMMENDED** ⭐

**Perfect for:** Your use case - cost-effective and Always Free eligible

**Cost:** $0/month (Always Free tier)

**Steps:**
1. Create OCI Compute Instance (VM.Standard.E4.Flex, 1 OCPU, 4GB RAM)
2. Configure Security List (allow ports 80, 443, 8000)
3. SSH into instance
4. Run: `bash oci-deploy.sh`
5. Done! 🎉

**Time:** 10-15 minutes

---

### **Option 2: Docker Compose**

**Perfect for:** Same machine deployment with container isolation

**Cost:** $0/month (uses same Compute Instance)

**Steps:**
1. Create OCI Compute Instance
2. Install Docker and Docker Compose
3. Run: `docker-compose up -d --build`
4. Done! 🎉

**Time:** 15-20 minutes

---

### **Option 3: Container Instances**

**Perfect for:** Serverless containers without managing VMs

**Cost:** ~$10-30/month

**Steps:**
1. Build Docker images
2. Push to Oracle Container Registry (OCIR)
3. Create Container Instances
4. Done! 🎉

**Time:** 20-30 minutes

---

## 📊 Your Application Architecture on OCI

```
┌─────────────────────────────────────────────────────┐
│        Oracle Cloud Infrastructure (OCI)           │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │    OCI Compute Instance (Always Free)        │  │
│  │    VM.Standard.E4.Flex (1 OCPU, 4GB RAM)     │  │
│  │                                              │  │
│  │  ┌────────────┐        ┌─────────────────┐  │  │
│  │  │  Nginx     │        │  Python FastAPI │  │  │
│  │  │  Port 80   │◄──────►│  Port 8000      │  │  │
│  │  │            │        │                 │  │  │
│  │  │  React     │        │  Pipecat AI     │  │  │
│  │  │  Frontend  │        │  Voice Agent    │  │  │
│  │  │            │        │  + WebSocket    │  │  │
│  │  └────────────┘        └─────────────────┘  │  │
│  │                                              │  │
│  │  Managed by:           Managed by:          │  │
│  │  systemd               PM2 (auto-restart)   │  │
│  │                                              │  │
│  │  Public IP: xx.xx.xx.xx                      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Security List (Firewall)                    │  │
│  │  - Port 80  (HTTP)         ✅ Open           │  │
│  │  - Port 443 (HTTPS)        ✅ Open           │  │
│  │  - Port 8000 (Backend API) ✅ Open           │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ▲
                        │
                    Internet
                        │
                   ┌────┴────┐
                   │  Users  │
                   └─────────┘
```

---

## 💰 Cost Breakdown

### **Always Free Tier Includes:**

| Resource | Limit | Your Usage | Cost |
|----------|-------|------------|------|
| VM Instances | 2x E4.Flex (1 OCPU, 4GB each) | 1 instance | **$0** |
| Block Storage | 200 GB | ~10 GB | **$0** |
| Outbound Transfer | 10 TB/month | ~100 GB/month | **$0** |
| **Total** | | | **$0/month** 🎉 |

**Oracle Cloud Always Free tier is PERMANENT** - it won't expire!

---

## 🔧 Technology Stack

### **Frontend**
- **Framework:** React 19 + Vite
- **UI Library:** Radix UI + Tailwind CSS
- **WebRTC:** Pipecat Small WebRTC Transport
- **Transport:** WebSocket
- **Server:** Nginx (on OCI)
- **Port:** 80 (HTTP), 443 (HTTPS with SSL)

### **Backend**
- **Framework:** FastAPI (Python 3.11)
- **Voice AI:** Pipecat AI
- **TTS:** Cartesia
- **STT:** Azure Speech Services
- **LLM:** Azure OpenAI
- **Transport:** WebSocket
- **Process Manager:** PM2
- **Port:** 8000

### **DevOps**
- **Container Runtime:** Docker (optional)
- **Orchestration:** Docker Compose (optional)
- **CI/CD:** Git + Manual deploy / GitHub Actions (future)
- **Monitoring:** PM2, OCI Monitoring
- **Logs:** PM2 logs, Nginx logs

---

## 🎓 Step-by-Step Deployment Instructions

### **Prerequisites**

1. **Oracle Cloud Account:**
   - Sign up: https://www.oracle.com/cloud/free/
   - Verify email
   - Complete account setup (credit card required but NOT charged for free tier)

2. **Required API Keys:**
   - Azure Speech Service (Key + Region)
   - Azure OpenAI (API Key + Endpoint)
   - Cartesia API Key

3. **Your Repository:**
   - Code pushed to GitHub
   - All deployment files committed

---

### **Recommended Deployment Path: Compute Instance**

#### **Step 1: Create OCI Account** (5 minutes)
- Visit: https://www.oracle.com/cloud/free/
- Click "Start for free"
- Complete registration
- Login to OCI Console: https://cloud.oracle.com/

#### **Step 2: Create Compute Instance** (5 minutes)
1. OCI Console → Compute → Instances → Create Instance
2. Configure:
   - **Name:** `voice-agent-server`
   - **Image:** Ubuntu 22.04
   - **Shape:** VM.Standard.E4.Flex (1 OCPU, 4-6 GB RAM)
   - **Network:** Create VCN or use existing (enable public IP)
   - **SSH:** Generate or upload key (SAVE THE PRIVATE KEY!)
3. Click Create
4. Wait for instance to be **Running**
5. **Copy the Public IP address**

#### **Step 3: Configure Security List** (3 minutes)
1. Click instance → Subnet → Default Security List
2. Add Ingress Rules:
   - Port 80 (HTTP): Source 0.0.0.0/0
   - Port 443 (HTTPS): Source 0.0.0.0/0
   - Port 8000 (Backend): Source 0.0.0.0/0

#### **Step 4: SSH and Deploy** (5 minutes)

**Windows (PowerShell):**
```powershell
# Set permissions on SSH key
icacls .\ssh-key-*.key /inheritance:r /grant:r "$($env:USERNAME):(R)"

# Connect
ssh -i .\ssh-key-*.key ubuntu@<YOUR_PUBLIC_IP>
```

**Mac/Linux:**
```bash
chmod 400 ssh-key-*.key
ssh -i ssh-key-*.key ubuntu@<YOUR_PUBLIC_IP>
```

#### **Step 5: Run Deployment Script** (5-10 minutes)
```bash
# Clone repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# Run deployment
chmod +x oci-deploy.sh
bash oci-deploy.sh

# Enter your API keys when prompted
# Wait for deployment to complete
```

#### **Step 6: Access Your Application** (Immediate!)
- **Frontend:** `http://<YOUR_PUBLIC_IP>/`
- **Backend API:** `http://<YOUR_PUBLIC_IP>:8000/`
- **Test Voice Agent:** Click "Connect" and speak!

---

## ✅ Verification Checklist

After deployment, verify everything works:

### **Backend Health Check**
```bash
curl http://<YOUR_IP>:8000/
# Expected: {"status":"ok","service":"Maya Voice Agent"}
```

### **Frontend Loading**
- Open: `http://<YOUR_IP>/`
- Should see: Your portfolio website
- No 404 errors

### **PM2 Status**
```bash
pm2 status
# Should show: voice-agent-backend | online
```

### **Voice Agent Test**
1. Navigate to voice agent section
2. Click "Connect"
3. Grant microphone permission
4. Speak: "Hello"
5. Should receive voice response

---

## 🐛 Common Issues & Solutions

### **1. Frontend Shows "Cannot Connect to Backend"**

**Cause:** Backend URL incorrect or backend not running

**Fix:**
```bash
# Check backend is running
pm2 status

# Restart backend
pm2 restart voice-agent-backend

# Check backend URL in frontend build
# Should be: http://<YOUR_IP>:8000
```

### **2. "Connection Refused" on Port 8000**

**Cause:** Security List doesn't allow port 8000

**Fix:**
1. OCI Console → Networking → Security Lists
2. Add Ingress Rule: TCP port 8000 from 0.0.0.0/0

### **3. WebSocket Connection Fails**

**Cause:** CORS or WebSocket configuration issue

**Fix:**
```bash
# Check backend logs
pm2 logs voice-agent-backend

# Check browser console (F12)
# Look for CORS or WebSocket errors
```

### **4. Frontend Shows 404**

**Cause:** Nginx not configured correctly

**Fix:**
```bash
# Check nginx status
sudo systemctl status nginx

# Restart nginx
sudo systemctl restart nginx

# Check files exist
ls /var/www/html/
# Should show: index.html, assets/, etc.
```

---

## 📞 Support Resources

### **Documentation**
- [ORACLE_CLOUD_DEPLOYMENT.md](ORACLE_CLOUD_DEPLOYMENT.md) - Full guide
- [ORACLE_DEPLOYMENT_CHECKLIST.md](ORACLE_DEPLOYMENT_CHECKLIST.md) - Checklist
- [ORACLE_QUICK_REFERENCE.md](ORACLE_QUICK_REFERENCE.md) - Quick ref

### **OCI Resources**
- [OCI Free Tier](https://www.oracle.com/cloud/free/)
- [OCI Documentation](https://docs.oracle.com/en-us/iaas/)
- [OCI Compute Docs](https://docs.oracle.com/en-us/iaas/Content/Compute/home.htm)

### **Your Technology Stack**
- [Pipecat AI Docs](https://docs.pipecat.ai/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [PM2 Docs](https://pm2.keymetrics.io/)
- [Nginx Docs](https://nginx.org/en/docs/)

---

## 🚀 Next Steps

### **Immediate (After Deployment)**
1. ✅ Test all functionality
2. ✅ Verify voice agent works
3. ✅ Check PM2 is running
4. ✅ Review logs for errors

### **Short Term (This Week)**
1. 🌐 Setup custom domain (optional)
2. 🔐 Enable SSL with Let's Encrypt (recommended)
3. 📊 Configure monitoring
4. 💾 Enable automatic backups

### **Long Term (This Month)**
1. 📈 Optimize performance
2. 🔄 Setup CI/CD pipeline
3. 📱 Add mobile responsiveness improvements
4. 🎨 Enhance UI/UX

---

## 🎉 Summary

### **What You Have Now:**

✅ **Complete deployment package** for Oracle Cloud  
✅ **3 deployment options** (Compute VM recommended)  
✅ **All Docker files** created and ready  
✅ **Automated deployment script** (oci-deploy.sh)  
✅ **Comprehensive documentation** (3 guides)  
✅ **Always Free tier eligible** ($0/month forever!)  
✅ **WebSocket + WebRTC support** fully configured  
✅ **Production-ready** architecture  

### **Deployment Time:** 20-30 minutes total

### **Cost:** $0/month (Always Free tier)

---

## 🎯 Quick Start Command

```bash
# On your OCI instance:
git clone <your-repo>
cd <your-repo>
bash oci-deploy.sh
# Enter API keys when prompted
# Done! 🚀
```

---

**🎊 Your voice agent is ready to deploy to Oracle Cloud!**

**Questions?** Check the documentation files or OCI support resources.

**Ready to deploy?** Follow the checklist in `ORACLE_DEPLOYMENT_CHECKLIST.md`

**Need quick reference?** See `ORACLE_QUICK_REFERENCE.md`

---

## 📦 Files Summary

| File | Purpose | Size |
|------|---------|------|
| `ORACLE_CLOUD_DEPLOYMENT.md` | Full deployment guide | Comprehensive |
| `ORACLE_DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist | Detailed |
| `ORACLE_QUICK_REFERENCE.md` | Quick reference card | Concise |
| `Dockerfile.backend` | Backend container | Production-ready |
| `Dockerfile.frontend` | Frontend container | Production-ready |
| `docker-compose.yml` | Multi-container setup | Ready to use |
| `nginx.conf` | Nginx configuration | Optimized |
| `oci-deploy.sh` | Automated deployment | Fully automated |
| `.gitignore` | Updated exclusions | Secured |

**Total:** 9 files created/updated for Oracle Cloud deployment! 🎉
