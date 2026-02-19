# 🚀 Deploy to Oracle Cloud - Complete Guide

## ✅ YES, You Can Deploy Your Voice Agent to Oracle Cloud!

Your **WebSocket-based Real-time Voice AI Agent** is **fully compatible** with Oracle Cloud Infrastructure (OCI) and can be deployed using the **Always Free Tier** ($0/month forever!).

---

## 📦 What's Included

This package contains everything you need to deploy your portfolio (frontend + backend) to Oracle Cloud:

### 📚 **Documentation** (5 Files)

| File | Description | When to Use |
|------|-------------|-------------|
| **[ORACLE_DEPLOYMENT_SUMMARY.md](ORACLE_DEPLOYMENT_SUMMARY.md)** | Overview & quick start | Start here! 📍 |
| **[ORACLE_CLOUD_DEPLOYMENT.md](ORACLE_CLOUD_DEPLOYMENT.md)** | Complete deployment guide | Full instructions |
| **[ORACLE_DEPLOYMENT_CHECKLIST.md](ORACLE_DEPLOYMENT_CHECKLIST.md)** | Step-by-step checklist | Follow along |
| **[ORACLE_QUICK_REFERENCE.md](ORACLE_QUICK_REFERENCE.md)** | Commands cheat sheet | After deployment |
| **[ORACLE_DEPLOYMENT_FLOWCHART.md](ORACLE_DEPLOYMENT_FLOWCHART.md)** | Visual process flow | Understand architecture |

### 🐳 **Docker Files** (4 Files)

| File | Purpose |
|------|---------|
| `Dockerfile.backend` | Backend container configuration |
| `Dockerfile.frontend` | Frontend container configuration |
| `docker-compose.yml` | Run both containers together |
| `nginx.conf` | Nginx web server configuration |

### 🤖 **Automation** (1 File)

| File | Purpose |
|------|---------|
| `oci-deploy.sh` | Automated deployment script |

---

## ⚡ Quick Start (5 Steps)

### 1️⃣ Create OCI Account
- Visit: https://www.oracle.com/cloud/free/
- Sign up for Always Free tier
- Time: 5 minutes

### 2️⃣ Create Compute Instance
- **Shape**: VM.Standard.E4.Flex (1 OCPU, 4GB RAM)
- **Image**: Ubuntu 22.04
- **Network**: Enable public IP
- **Security**: Allow ports 80, 443, 8000
- Time: 5 minutes

### 3️⃣ SSH into Instance
```bash
ssh -i your-key.pem ubuntu@<INSTANCE_PUBLIC_IP>
```

### 4️⃣ Clone & Deploy
```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
chmod +x oci-deploy.sh
bash oci-deploy.sh
```
- Enter your API keys when prompted
- Time: 10 minutes

### 5️⃣ Access Your App! 🎉
- **Frontend**: `http://<INSTANCE_IP>/`
- **Backend**: `http://<INSTANCE_IP>:8000/`

**Total Time: ~25 minutes** | **Cost: $0/month**

---

## 🎯 Deployment Options

### **Option 1: Compute Instance** ⭐ **RECOMMENDED**
- **Cost**: FREE (Always Free Tier)
- **Difficulty**: Easy
- **Time**: 25 minutes
- **Best for**: Your use case!

### **Option 2: Docker Compose**
- **Cost**: FREE (uses same VM)
- **Difficulty**: Medium
- **Time**: 30 minutes
- **Best for**: Container isolation

### **Option 3: Container Instances**
- **Cost**: $10-30/month
- **Difficulty**: Medium
- **Time**: 30 minutes
- **Best for**: Serverless architecture

---

## 💡 Why Oracle Cloud?

### ✅ **Advantages**
- **Always Free Tier** - No time limit!
- **2 VMs FREE forever** (1 OCPU, 4GB RAM each)
- **WebSocket support** - Perfect for your voice agent
- **Global infrastructure** - Fast worldwide
- **No credit card charges** for free tier

### 📊 **What You Get FREE**
- 2x VM.Standard.E4.Flex instances
- 200 GB Block Volume storage
- 10 TB monthly outbound transfer
- **Perfect for your voice agent!** 🎤

---

## 🏗️ Architecture on Oracle Cloud

```
┌─────────────────────────────────────────┐
│    OCI Compute Instance (Always Free)   │
│                                         │
│  ┌────────────┐      ┌───────────────┐ │
│  │  Nginx     │      │  Python       │ │
│  │  Port 80   │◄────►│  FastAPI      │ │
│  │            │      │  Port 8000    │ │
│  │  React     │      │  Pipecat AI   │ │
│  │  Frontend  │      │  + WebSocket  │ │
│  └────────────┘      └───────────────┘ │
│                                         │
│  Public IP: xx.xx.xx.xx                 │
└─────────────────────────────────────────┘
```

---

## 📋 Prerequisites

### **Before You Start**
- [ ] Oracle Cloud account (sign up: free)
- [ ] GitHub repository with your code
- [ ] Azure Speech Service credentials
- [ ] Azure OpenAI credentials
- [ ] Cartesia API key

### **What Gets Installed Automatically**
- ✅ Python 3.11
- ✅ Node.js 20
- ✅ Nginx web server
- ✅ PM2 process manager
- ✅ All dependencies

---

## 🔐 Security

### **What's Protected**
- ✅ `.env` file (not committed to git)
- ✅ SSH keys (not committed to git)
- ✅ API credentials (environment variables)

### **Firewall Configuration**
- Port 80: HTTP (frontend)
- Port 443: HTTPS (SSL - optional)
- Port 8000: Backend API
- Port 22: SSH (for management)

---

## ✅ Post-Deployment

### **Verify Everything Works**
```bash
# Test backend
curl http://<YOUR_IP>:8000/
# Expected: {"status":"ok"}

# Check backend status
pm2 status
# Should show: voice-agent-backend | online
```

### **View Logs**
```bash
# Backend logs
pm2 logs voice-agent-backend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### **Restart Services**
```bash
# Restart backend
pm2 restart voice-agent-backend

# Restart nginx
sudo systemctl restart nginx
```

---

## 🚨 Common Issues

### **Frontend Not Loading**
```bash
sudo systemctl restart nginx
```

### **Backend Not Responding**
```bash
pm2 restart voice-agent-backend
pm2 logs voice-agent-backend
```

### **WebSocket Connection Fails**
- Check Security List allows port 8000
- Verify backend URL in frontend build
- Check browser console for errors

### **Port 8000 Blocked**
- OCI Console → Networking → Security Lists
- Add Ingress Rule: TCP port 8000 from 0.0.0.0/0

---

## 🎓 Learning Path

### **First Time Deploying?**
1. Read: [ORACLE_DEPLOYMENT_SUMMARY.md](ORACLE_DEPLOYMENT_SUMMARY.md)
2. Follow: [ORACLE_DEPLOYMENT_CHECKLIST.md](ORACLE_DEPLOYMENT_CHECKLIST.md)
3. Reference: [ORACLE_QUICK_REFERENCE.md](ORACLE_QUICK_REFERENCE.md)

### **Experienced with Cloud?**
1. Create OCI Compute Instance
2. Run: `bash oci-deploy.sh`
3. Done! 🚀

### **Want to Use Docker?**
1. Read: [ORACLE_CLOUD_DEPLOYMENT.md](ORACLE_CLOUD_DEPLOYMENT.md) - Option 2
2. Install Docker on OCI
3. Run: `docker-compose up -d --build`

---

## 📞 Support & Resources

### **Documentation**
- All guides are in this repository
- Start with: `ORACLE_DEPLOYMENT_SUMMARY.md`

### **OCI Resources**
- [OCI Free Tier](https://www.oracle.com/cloud/free/)
- [OCI Documentation](https://docs.oracle.com/en-us/iaas/)
- [OCI Compute](https://docs.oracle.com/en-us/iaas/Content/Compute/home.htm)

### **Technology Stack**
- [Pipecat AI](https://docs.pipecat.ai/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [PM2](https://pm2.keymetrics.io/)

---

## 🎯 Next Steps

### **Option A: Deploy Now** 🚀
1. Follow the Quick Start above
2. Deploy in 25 minutes
3. Share with the world!

### **Option B: Read First** 📚
1. Read [ORACLE_DEPLOYMENT_SUMMARY.md](ORACLE_DEPLOYMENT_SUMMARY.md)
2. Review [ORACLE_DEPLOYMENT_CHECKLIST.md](ORACLE_DEPLOYMENT_CHECKLIST.md)
3. Deploy with confidence!

### **Option C: Test Locally First** 🧪
1. Test with: `docker-compose up`
2. Verify everything works
3. Deploy to Oracle Cloud

---

## 💰 Cost Summary

| Resource | Oracle Cloud | Current (Render.com) |
|----------|--------------|----------------------|
| Backend VM | **$0** (Free Tier) | $0 (with sleep) |
| Frontend Hosting | **$0** (Free Tier) | $0 (Netlify) |
| Storage | **$0** (Free Tier) | $0 |
| Data Transfer | **$0** (10TB free) | Limited |
| **Total** | **$0/month** ✅ | $0/month |

**Advantage**: No sleep/cold starts on Oracle Cloud for free tier! 🎉

---

## 🎉 Summary

### **What You Have**
✅ Complete deployment package for Oracle Cloud  
✅ 5 comprehensive documentation files  
✅ All Docker configurations  
✅ Automated deployment script  
✅ Production-ready architecture  
✅ **Always Free tier eligible** ($0/month)  

### **What You Need to Do**
1. Create Oracle Cloud account (5 min)
2. Create Compute Instance (5 min)
3. Run deployment script (15 min)
4. **Done!** 🚀

### **Deployment Time**
- **Beginner**: 30-40 minutes
- **Experienced**: 15-20 minutes

### **Monthly Cost**
- **$0** (Always Free Tier) 🎊

---

## 📂 File Manifest

```
Portfolio/
├── README_ORACLE_DEPLOYMENT.md                 ← You are here!
│
├── Documentation/
│   ├── ORACLE_DEPLOYMENT_SUMMARY.md            ← Start here
│   ├── ORACLE_CLOUD_DEPLOYMENT.md              ← Full guide
│   ├── ORACLE_DEPLOYMENT_CHECKLIST.md          ← Step-by-step
│   ├── ORACLE_QUICK_REFERENCE.md               ← Commands
│   └── ORACLE_DEPLOYMENT_FLOWCHART.md          ← Visual guide
│
├── Docker/
│   ├── Dockerfile.backend                      ← Backend container
│   ├── Dockerfile.frontend                     ← Frontend container
│   ├── docker-compose.yml                      ← Both containers
│   └── nginx.conf                              ← Nginx config
│
└── Scripts/
    └── oci-deploy.sh                          ← Deployment automation
```

---

## 🚀 Ready to Deploy?

### **Recommended Path:**
1. ✅ Read this file (you're doing it!)
2. ✅ Review [ORACLE_DEPLOYMENT_SUMMARY.md](ORACLE_DEPLOYMENT_SUMMARY.md)
3. ✅ Follow [ORACLE_DEPLOYMENT_CHECKLIST.md](ORACLE_DEPLOYMENT_CHECKLIST.md)
4. ✅ Deploy with `bash oci-deploy.sh`
5. ✅ Celebrate! 🎉

### **Quick Deploy (Experienced Users):**
```bash
# Create OCI instance → SSH in → Run:
git clone <your-repo>
cd <your-repo>
bash oci-deploy.sh
# Enter API keys → Wait 10 min → Done!
```

---

**🎊 Your voice agent is ready for Oracle Cloud deployment!**

**Questions?** Check the documentation files.  
**Issues?** See the troubleshooting sections.  
**Ready?** Start with `ORACLE_DEPLOYMENT_SUMMARY.md`!

---

**Made with ❤️ for Oracle Cloud Always Free Tier**  
**Deployment Time: ~25 minutes | Cost: $0/month**
