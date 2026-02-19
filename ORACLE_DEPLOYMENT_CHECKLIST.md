# ✅ Oracle Cloud Deployment Checklist

This checklist will guide you through deploying your voice agent to Oracle Cloud Infrastructure step by step.

---

## 📋 Pre-Deployment Checklist

### 1. Oracle Cloud Account Setup
- [ ] Create Oracle Cloud account at https://www.oracle.com/cloud/free/
- [ ] Verify email address
- [ ] Complete account setup with payment information (free tier doesn't charge)
- [ ] Login to OCI Console: https://cloud.oracle.com/

### 2. Required Information
Gather the following information before starting:
- [ ] Azure Speech Service Key
- [ ] Azure Speech Service Region
- [ ] Azure OpenAI API Key
- [ ] Azure OpenAI Endpoint
- [ ] Cartesia API Key
- [ ] GitHub repository URL (if using)

### 3. Local Development Environment
- [ ] Code pushed to GitHub repository
- [ ] All files committed (docker-compose.yml, Dockerfile.backend, Dockerfile.frontend, nginx.conf)
- [ ] `.env` file created locally for testing (don't commit it!)
- [ ] Test locally with: `docker-compose up`

---

## 🚀 Deployment Steps

### Option A: Quick Deploy with Compute Instance (Recommended - Always Free)

#### Step 1: Create OCI Compute Instance
- [ ] Login to OCI Console
- [ ] Navigate to: **Menu** → **Compute** → **Instances**
- [ ] Click **Create Instance**
- [ ] Configure instance:
  - [ ] Name: `voice-agent-server`
  - [ ] Placement: Select availability domain
  - [ ] Image: **Ubuntu 22.04** (Oracle Linux 8 also works)
  - [ ] Shape: Click "Change Shape"
    - [ ] Shape Series: **AMD** or **Ampere**
    - [ ] Shape Name: **VM.Standard.E4.Flex** (Always Free eligible)
    - [ ] OCPUs: **1**
    - [ ] Memory (GB): **4** or **6**
  - [ ] Networking:
    - [ ] Create new VCN or select existing
    - [ ] Create public subnet or select existing
    - [ ] **Assign a public IPv4 address**: ✅ YES
  - [ ] SSH Keys:
    - [ ] Generate new key pair (download both) OR
    - [ ] Upload your existing public key
- [ ] Click **Create**
- [ ] Wait for instance to be **Running** (provisioning takes 1-2 minutes)
- [ ] **Copy the Public IP address** - you'll need this!

#### Step 2: Configure Security List (Firewall Rules)
- [ ] In the instance details page, click on your subnet name
- [ ] Click on the **Default Security List**
- [ ] Click **Add Ingress Rules**
- [ ] Add Rule 1 (HTTP):
  - [ ] Source CIDR: `0.0.0.0/0`
  - [ ] Destination Port: `80`
  - [ ] Description: `HTTP for frontend`
- [ ] Add Rule 2 (HTTPS):
  - [ ] Source CIDR: `0.0.0.0/0`
  - [ ] Destination Port: `443`
  - [ ] Description: `HTTPS for SSL`
- [ ] Add Rule 3 (Backend WebSocket):
  - [ ] Source CIDR: `0.0.0.0/0`
  - [ ] Destination Port: `8000`
  - [ ] Description: `Backend WebSocket API`
- [ ] Click **Add Ingress Rules**

#### Step 3: Connect to Instance
- [ ] Open terminal/PowerShell on your local machine
- [ ] Navigate to where you saved the SSH key
- [ ] Connect via SSH:

**On Windows (PowerShell):**
```powershell
# Set correct permissions on private key (if needed)
icacls .\ssh-key-*.key /inheritance:r /grant:r "$($env:USERNAME):(R)"

# Connect to instance
ssh -i .\ssh-key-*.key ubuntu@<YOUR_INSTANCE_PUBLIC_IP>
```

**On Mac/Linux:**
```bash
# Set correct permissions
chmod 400 ssh-key-*.key

# Connect
ssh -i ssh-key-*.key ubuntu@<YOUR_INSTANCE_PUBLIC_IP>
```

- [ ] Accept fingerprint (type `yes`)
- [ ] Verify you're connected (you should see `ubuntu@voice-agent-server:~$`)

#### Step 4: Clone Repository and Run Deployment Script
```bash
# Clone your repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# Make script executable
chmod +x oci-deploy.sh

# Run deployment script
bash oci-deploy.sh
```

- [ ] Script is running
- [ ] Enter Azure Speech Key when prompted
- [ ] Enter Azure Speech Region when prompted
- [ ] Enter Azure OpenAI API Key when prompted
- [ ] Enter Azure OpenAI Endpoint when prompted
- [ ] Enter Cartesia API Key when prompted
- [ ] Wait for deployment to complete (5-10 minutes)

#### Step 5: Verify Deployment
- [ ] Backend is running: Visit `http://<YOUR_PUBLIC_IP>:8000/` in browser
  - [ ] Should see: `{"status":"ok","service":"Maya Voice Agent"}`
- [ ] Frontend is running: Visit `http://<YOUR_PUBLIC_IP>/` in browser
  - [ ] Should see your portfolio website
- [ ] Check backend is managed by PM2:
  ```bash
  pm2 status
  # Should show: voice-agent-backend | online
  ```
- [ ] Check backend logs:
  ```bash
  pm2 logs voice-agent-backend --lines 50
  ```

#### Step 6: Test Voice Agent
- [ ] Open frontend: `http://<YOUR_PUBLIC_IP>/`
- [ ] Navigate to Voice Agent section
- [ ] Click **Connect** button
- [ ] Grant microphone permissions when prompted
- [ ] Speak to test: "Hello, can you hear me?"
- [ ] Verify you receive a response
- [ ] Check browser console (F12) for any errors

---

### Option B: Deploy with Docker Compose

#### Step 1: Install Docker on OCI Instance
```bash
# SSH into your instance
ssh -i ssh-key-*.key ubuntu@<YOUR_PUBLIC_IP>

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again
exit
```

- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] User added to docker group (logout and login required)

#### Step 2: Clone and Configure
```bash
# SSH back in
ssh -i ssh-key-*.key ubuntu@<YOUR_PUBLIC_IP>

# Clone repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# Create .env file
nano .env
```

- [ ] Create `.env` file with your keys:
```
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=your_region_here
AZURE_OPENAI_API_KEY=your_key_here
AZURE_OPENAI_ENDPOINT=your_endpoint_here
CARTESIA_API_KEY=your_key_here
```

- [ ] Save and exit (Ctrl+X, Y, Enter)

#### Step 3: Start Services
```bash
# Build and start containers
docker-compose up -d --build
```

- [ ] Containers building (this takes 5-10 minutes first time)
- [ ] Containers running:
  ```bash
  docker-compose ps
  # Should show both frontend and backend as "Up"
  ```

#### Step 4: Verify
- [ ] Check logs:
  ```bash
  docker-compose logs backend
  docker-compose logs frontend
  ```
- [ ] Test backend: `http://<YOUR_PUBLIC_IP>:8000/`
- [ ] Test frontend: `http://<YOUR_PUBLIC_IP>/`

---

## 🔧 Post-Deployment Tasks

### 1. Setup Custom Domain (Optional)
- [ ] Register domain or use existing
- [ ] In OCI Console: **Menu** → **Networking** → **DNS Management**
- [ ] Click **Create Zone**
- [ ] Add A record pointing to your instance IP
- [ ] Wait for DNS propagation (5-30 minutes)

### 2. Setup SSL/HTTPS (Optional but Recommended)
```bash
# SSH into instance
ssh -i ssh-key-*.key ubuntu@<YOUR_PUBLIC_IP>

# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

- [ ] SSL certificate obtained
- [ ] Site accessible via HTTPS
- [ ] Auto-renewal configured

### 3. Monitoring Setup
- [ ] Check PM2 status regularly: `pm2 status`
- [ ] Setup PM2 monitoring (optional):
  ```bash
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 7
  ```
- [ ] Consider setting up OCI monitoring in console

### 4. Backup Strategy
- [ ] Enable automatic backups in OCI:
  - [ ] Go to instance details
  - [ ] Click **Boot Volume**
  - [ ] Click **Boot Volume Backups**
  - [ ] Enable automatic backups
- [ ] Backup your `.env` file securely (not in git!)

---

## 🐛 Troubleshooting Checklist

### Frontend Issues
- [ ] **Website not loading:**
  - [ ] Check Security List has port 80 open
  - [ ] Check nginx status: `sudo systemctl status nginx`
  - [ ] Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
  
- [ ] **Static files not loading:**
  - [ ] Check build directory: `ls /var/www/html/`
  - [ ] Rebuild frontend: `VITE_BACKEND_URL=http://<IP>:8000 npm run build`
  - [ ] Copy to nginx: `sudo cp -r dist/* /var/www/html/`

### Backend Issues
- [ ] **Backend not responding:**
  - [ ] Check PM2 status: `pm2 status`
  - [ ] Check backend logs: `pm2 logs voice-agent-backend`
  - [ ] Restart backend: `pm2 restart voice-agent-backend`
  
- [ ] **Connection refused:**
  - [ ] Check Security List has port 8000 open
  - [ ] Check backend is listening: `sudo netstat -tlnp | grep 8000`
  - [ ] Check firewall: `sudo iptables -L -n | grep 8000`

### WebSocket Issues
- [ ] **WebSocket connection fails:**
  - [ ] Check browser console for errors
  - [ ] Check CORS settings in backend
  - [ ] Verify VITE_BACKEND_URL is correct
  - [ ] Test WebSocket directly: `wscat -c ws://<IP>:8000/ws`

### Docker Issues (if using Docker)
- [ ] **Containers not starting:**
  - [ ] Check logs: `docker-compose logs`
  - [ ] Check resources: `docker stats`
  - [ ] Rebuild: `docker-compose down && docker-compose up -d --build`
  
- [ ] **Environment variables not working:**
  - [ ] Verify `.env` file exists
  - [ ] Check file contents: `cat .env`
  - [ ] Restart containers: `docker-compose restart`

---

## 📊 Performance Optimization

### 1. Frontend Optimization
- [ ] Enable HTTP/2 in nginx
- [ ] Configure browser caching
- [ ] Minify and compress assets
- [ ] Use CDN for static assets (optional)

### 2. Backend Optimization
- [ ] Increase PM2 instances if needed:
  ```bash
  pm2 scale voice-agent-backend +2
  ```
- [ ] Monitor resource usage: `htop` or `pm2 monit`
- [ ] Configure log rotation

### 3. Database (if applicable)
- [ ] Setup connection pooling
- [ ] Configure query caching
- [ ] Regular backups

---

## 💰 Cost Monitoring

### Always Free Tier Limits
- [ ] 2 VM instances (VM.Standard.E4.Flex with 1 OCPU, 4GB RAM each)
- [ ] Verify you're within limits:
  - [ ] Check instances: OCI Console → Compute → Instances
  - [ ] Check you're using eligible shape (E4.Flex)
  - [ ] Total OCPUs ≤ 2
- [ ] Set up billing alerts in OCI Console

---

## ✅ Final Deployment Checklist

- [ ] ✅ OCI account created and setup
- [ ] ✅ Compute instance created and running
- [ ] ✅ Security list configured (ports 80, 443, 8000)
- [ ] ✅ SSH access working
- [ ] ✅ Backend deployed and running
- [ ] ✅ Frontend deployed and running
- [ ] ✅ Voice agent tested and working
- [ ] ✅ Environment variables set correctly
- [ ] ✅ PM2 configured for auto-restart
- [ ] ✅ Firewall rules configured
- [ ] ✅ (Optional) Custom domain configured
- [ ] ✅ (Optional) SSL certificate installed
- [ ] ✅ (Optional) Monitoring setup
- [ ] ✅ (Optional) Backups enabled

---

## 📞 Support & Resources

### Official Documentation
- [ ] [OCI Free Tier](https://www.oracle.com/cloud/free/)
- [ ] [OCI Compute Documentation](https://docs.oracle.com/en-us/iaas/Content/Compute/home.htm)
- [ ] [OCI Networking](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/overview.htm)

### Useful Commands Reference
```bash
# PM2 Commands
pm2 status                          # Check status
pm2 logs voice-agent-backend        # View logs
pm2 restart voice-agent-backend     # Restart backend
pm2 stop voice-agent-backend        # Stop backend
pm2 save                            # Save PM2 configuration

# Nginx Commands
sudo systemctl status nginx         # Check status
sudo systemctl restart nginx        # Restart nginx
sudo nginx -t                       # Test config
sudo tail -f /var/log/nginx/error.log  # View logs

# Docker Commands (if using)
docker-compose ps                   # Check containers
docker-compose logs -f              # Follow logs
docker-compose restart              # Restart all
docker-compose down                 # Stop all
docker-compose up -d --build        # Rebuild and start

# System Commands
htop                                # Monitor resources
df -h                               # Check disk space
free -h                             # Check memory
sudo netstat -tlnp                  # Check listening ports
```

---

**🎉 Congratulations! Your voice agent is now deployed on Oracle Cloud!**

**Access your application:**
- Frontend: `http://<YOUR_PUBLIC_IP>/`
- Backend API: `http://<YOUR_PUBLIC_IP>:8000/`

**Next Steps:**
1. Test thoroughly
2. Setup custom domain
3. Enable SSL
4. Share with users!
