# 🚀 Oracle Cloud Deployment - Quick Reference

## ⚡ TL;DR - 5 Minute Deploy

### Prerequisites
1. Oracle Cloud account (free tier)
2. OCI Compute instance created (VM.Standard.E4.Flex, Ubuntu 22.04)
3. Security List allows ports: 80, 443, 8000
4. SSH key downloaded

### Deploy Commands
```bash
# 1. SSH into instance
ssh -i your-key.key ubuntu@<INSTANCE_IP>

# 2. Clone repo
git clone <your-repo-url>
cd <repo-name>

# 3. Run deployment script
chmod +x oci-deploy.sh
bash oci-deploy.sh

# 4. Enter your API keys when prompted
# 5. Wait 5-10 minutes
# 6. Done! Access: http://<INSTANCE_IP>
```

---

## 📦 What You Get

### ✅ **Frontend** (port 80)
- React + Vite SPA
- Served via Nginx
- Gzip compression enabled
- URL: `http://<INSTANCE_IP>/`

### ✅ **Backend** (port 8000)
- Python FastAPI
- Pipecat voice agent
- WebSocket support
- Managed by PM2 (auto-restart)
- URL: `http://<INSTANCE_IP>:8000/`

---

## 🔑 Required Environment Variables

```bash
AZURE_SPEECH_KEY=<your-key>
AZURE_SPEECH_REGION=<your-region>
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_ENDPOINT=<your-endpoint>
CARTESIA_API_KEY=<your-key>
```

---

## 🛠️ Essential Commands

### PM2 (Backend Management)
```bash
pm2 status                          # Check status
pm2 logs voice-agent-backend        # View logs
pm2 restart voice-agent-backend     # Restart
pm2 stop voice-agent-backend        # Stop
pm2 save                            # Save config
```

### Nginx (Frontend)
```bash
sudo systemctl status nginx         # Check status
sudo systemctl restart nginx        # Restart
sudo nginx -t                       # Test config
sudo tail -f /var/log/nginx/error.log  # View errors
```

### Docker (Alternative)
```bash
docker-compose ps                   # Status
docker-compose logs -f              # Logs
docker-compose restart              # Restart
docker-compose down                 # Stop all
docker-compose up -d --build        # Rebuild
```

### System Monitoring
```bash
htop                                # CPU/Memory usage
df -h                               # Disk usage
free -h                             # Memory usage
sudo netstat -tlnp                  # Listening ports
```

---

## 🔥 Common Issues & Quick Fixes

### Issue: Frontend not loading
```bash
# Check nginx
sudo systemctl status nginx
sudo systemctl restart nginx

# Check Security List allows port 80
```

### Issue: Backend not responding
```bash
# Check PM2
pm2 status
pm2 restart voice-agent-backend

# Check logs
pm2 logs voice-agent-backend

# Check Security List allows port 8000
```

### Issue: WebSocket connection fails
```bash
# Check backend URL in frontend
# Should be: http://<INSTANCE_IP>:8000

# Check CORS settings in backend
# Check browser console for errors

# Restart backend
pm2 restart voice-agent-backend
```

### Issue: Environment variables not loaded
```bash
# Check .env file exists
cat .env

# Restart backend
pm2 delete voice-agent-backend
# (deployment script will recreate it)
bash oci-deploy.sh
```

---

## 🔐 Security List Rules (OCI Firewall)

**Required Ingress Rules:**

| Description | Source | Protocol | Port |
|------------|--------|----------|------|
| HTTP | 0.0.0.0/0 | TCP | 80 |
| HTTPS | 0.0.0.0/0 | TCP | 443 |
| Backend API | 0.0.0.0/0 | TCP | 8000 |
| SSH | 0.0.0.0/0 | TCP | 22 |

**Add in:** OCI Console → Networking → Security Lists → Add Ingress Rule

---

## 📊 Deployment Architecture

```
┌─────────────────────────────────────────────┐
│          OCI Compute Instance               │
│         (VM.Standard.E4.Flex)               │
│                                             │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │   Nginx      │      │   Python        │ │
│  │   (Port 80)  │      │   FastAPI       │ │
│  │              │      │   (Port 8000)   │ │
│  │  Frontend    │◄────►│   Backend       │ │
│  │  React SPA   │      │   + Pipecat     │ │
│  └──────────────┘      └─────────────────┘ │
│                                             │
│  Public IP: <INSTANCE_IP>                   │
└─────────────────────────────────────────────┘
            ▲
            │
            │ Internet
            │
        ┌───┴───┐
        │ Users │
        └───────┘
```

---

## 💰 Cost Summary

### **Always Free Tier** (What you get FREE forever)
- ✅ 2x VM.Standard.E4.Flex instances (1 OCPU, 4GB RAM each)
- ✅ 200 GB Block Volume storage
- ✅ 10 TB monthly outbound data transfer
- ✅ Estimated cost: **$0/month** 🎉

**Your deployment uses:**
- 1 instance (1 OCPU, 4GB RAM) = **FREE**
- ~10 GB storage = **FREE**
- Data transfer (typical usage) = **FREE**

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `ORACLE_CLOUD_DEPLOYMENT.md` | Full deployment guide |
| `ORACLE_DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist |
| `Dockerfile.backend` | Backend container config |
| `Dockerfile.frontend` | Frontend container config |
| `docker-compose.yml` | Multi-container setup |
| `nginx.conf` | Nginx configuration |
| `oci-deploy.sh` | Automated deployment script |

---

## 🎯 Testing Your Deployment

### 1. Test Backend Health
```bash
curl http://<INSTANCE_IP>:8000/
# Expected: {"status":"ok","service":"Maya Voice Agent"}
```

### 2. Test Frontend
```bash
# Open in browser
http://<INSTANCE_IP>/

# Should load your portfolio
```

### 3. Test Voice Agent
1. Navigate to voice agent section
2. Click "Connect"
3. Grant microphone permission
4. Speak: "Hello"
5. Should get response

### 4. Check Logs
```bash
# Backend logs
pm2 logs voice-agent-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🚀 Deployment Options Comparison

| Feature | Compute Instance | Container Instances | Kubernetes (OKE) |
|---------|-----------------|---------------------|------------------|
| **Difficulty** | ⭐⭐ Easy | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ Hard |
| **Setup Time** | 10 min | 20 min | 60+ min |
| **Cost** | FREE | $10-30/month | $50+/month |
| **Scalability** | Manual | Auto | Auto |
| **Recommended** | ✅ **YES** | For production | Enterprise only |

---

## 📞 Quick Help

### Get Instance Info
```bash
# On instance
curl http://169.254.169.254/opc/v1/instance/
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild frontend
VITE_BACKEND_URL=http://<INSTANCE_IP>:8000 npm run build
sudo cp -r dist/* /var/www/html/

# Restart backend
pm2 restart voice-agent-backend
```

### View All Environment
```bash
# View .env file
cat .env

# View PM2 environment
pm2 env voice-agent-backend
```

---

## 🎓 Learning Resources

- **OCI Docs**: https://docs.oracle.com/en-us/iaas/
- **Free Tier**: https://www.oracle.com/cloud/free/
- **PM2 Docs**: https://pm2.keymetrics.io/
- **Nginx Docs**: https://nginx.org/en/docs/

---

## ✅ Deployment Checklist Summary

- [ ] OCI account created
- [ ] Compute instance running
- [ ] Security List configured
- [ ] SSH access working
- [ ] Repository cloned
- [ ] Deployment script run
- [ ] Backend accessible (port 8000)
- [ ] Frontend accessible (port 80)
- [ ] Voice agent tested
- [ ] PM2 monitoring backend

---

**🎉 You're done! Your Oracle Cloud deployment is complete!**

**URLs:**
- Frontend: `http://<INSTANCE_IP>/`
- Backend: `http://<INSTANCE_IP>:8000/`

**Next:**
1. Setup custom domain (optional)
2. Enable SSL with Let's Encrypt (optional)
3. Share with friends! 🚀
