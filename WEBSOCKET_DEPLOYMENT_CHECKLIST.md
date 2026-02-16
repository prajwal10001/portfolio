# WebSocket Deployment - Quick Checklist ✅

## ⚠️ IMPORTANT: Your app uses **WebSocket** (not WebRTC)
All fixes preserve your WebSocket implementation!

---

## The Problem
❌ **Netlify** cannot host WebSocket servers (they sleep/timeout)  
✅ **Render.com** can host persistent WebSocket servers  

**Solution**: Deploy backend to Render.com, frontend to Netlify

---

## Step 1: Deploy Backend (WebSocket Server) to Render.com

### Quick Deploy (5 minutes):
1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo: `prajwal10001/portfolio`
4. Configure:
   ```
   Name: portfolio-websocket-backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn custom_stt_server_websocket:app --host 0.0.0.0 --port $PORT
   ```
5. Add **Environment Variables** (click "Add Environment Variable"):
   ```
   AZURE_SPEECH_KEY = <your-key>
   AZURE_SPEECH_REGION = <your-region>
   AZURE_OPENAI_API_KEY = <your-key>
   AZURE_OPENAI_ENDPOINT = <your-endpoint>
   AZURE_OPENAI_DEPLOYMENT = gpt-35-turbo
   AZURE_OPENAI_API_VERSION = 2024-02-15-preview
   CARTESIA_API_KEY = <your-key>
   CARTESIA_VOICE_ID = f786b574-daa5-4673-aa0c-cbe3e8534c02
   ```
6. Click **"Create Web Service"**
7. Wait for deployment (2-3 minutes)
8. **COPY YOUR URL**: `https://portfolio-websocket-backend-xxxx.onrender.com`

### Test Backend:
Open: `https://your-render-url.onrender.com/`

Expected response:
```json
{
  "status": "ok",
  "service": "Maya Voice Agent (WebSocket)",
  "transport": "WebSocket"
}
```

✅ If you see this, backend is working!

---

## Step 2: Connect Frontend to Backend

### Update Netlify Environment:
1. Go to https://app.netlify.com/
2. Select your **portfolio** site
3. **Site Settings** → **Environment Variables**
4. Click **"Add a variable"**
   ```
   Key: VITE_BACKEND_URL
   Value: https://your-render-url.onrender.com
   ```
5. **Important**: Use `https://` (NOT `http://`)

### Trigger Redeploy:
1. **Deploys** tab → **"Trigger deploy"** → **"Clear cache and deploy site"**
2. Wait for build to complete

---

## Step 3: Test WebSocket Connection

### Test in Browser:
1. Open your Netlify site
2. Open **DevTools** (F12) → **Console** tab
3. Click the **Voice Agent** button
4. Click **"Connect"**
5. Look for logs:
   ```
   [WebSocket] Connected
   [WebSocket] User started speaking
   ```

✅ If you see these logs, **WebSocket is working!**

---

## Verification Checklist

- [ ] Backend deployed to Render.com
- [ ] Backend health check returns `"transport": "WebSocket"`
- [ ] `VITE_BACKEND_URL` set in Netlify to Render.com URL
- [ ] Frontend redeployed with new env variable
- [ ] Browser console shows `[WebSocket] Connected`
- [ ] Can speak and hear responses

---

## Current Files (All WebSocket ✅)

| File | WebSocket Component |
|------|---------------------|
| `custom_stt_server_websocket.py` | FastAPI WebSocket server |
| `VoiceAgentWebSocket.tsx` | Pipecat WebSocket client |
| `requirements.txt` | `pipecat-ai[websocket]` ✅ |
| `package.json` | `@pipecat-ai/websocket-transport` ✅ |
| `render.yaml` | Render.com config for WebSocket |

---

## Common Issues

### Issue: "Failed to connect"
**Fix**: Check `VITE_BACKEND_URL` is set correctly in Netlify

### Issue: "Connection timeout"
**Fix**: Render.com free tier has cold start. Wait 30-60 seconds first connection.

### Issue: Backend showing "Not Found"
**Fix**: Make sure Start Command in Render.com is:
```
uvicorn custom_stt_server_websocket:app --host 0.0.0.0 --port $PORT
```

---

## 🚀 You're Ready!

**Technologies confirmed**:
- ✅ WebSocket (NOT WebRTC)
- ✅ FastAPI WebSocket server
- ✅ Pipecat WebSocket transport
- ✅ Render.com deployment

**Next action**: Deploy backend to Render.com using Step 1 above!
