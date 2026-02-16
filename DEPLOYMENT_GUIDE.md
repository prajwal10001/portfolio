# WebSocket Voice Agent Deployment Guide

## Problem Identified
Your portfolio has a WebSocket voice agent that requires a persistent backend server, but Netlify (where you're deploying the frontend) **doesn't support persistent WebSocket connections**. You need to deploy the backend separately.

## Architecture Overview
```
Frontend (React/Vite) → Netlify (Static Hosting)
         ↓ WebSocket Connection
Backend (Python FastAPI) → Render.com (Persistent Server)
```

## Deployment Steps

### 1. Deploy Backend to Render.com ✅

#### Option A: Using render.yaml (Recommended)
1. Go to [Render.com Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Add your environment variables:
   - `AZURE_SPEECH_KEY`
   - `AZURE_SPEECH_REGION`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_ENDPOINT`
   - `CARTESIA_API_KEY`
6. Click "Apply" to deploy
7. **Copy your Render.com URL** (e.g., `https://portfolio-voice-agent.onrender.com`)

#### Option B: Manual Web Service
1. Go to [Render.com Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `portfolio-voice-agent`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn custom_stt_server_websocket:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
5. Add environment variables (same as above)
6. Click "Create Web Service"
7. **Copy your Render.com URL**

### 2. Update Frontend Configuration ✅

#### Update Netlify Environment Variables
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Select your portfolio site
3. Go to **Site Settings** → **Environment Variables**
4. Add new variable:
   - **Key**: `VITE_BACKEND_URL`
   - **Value**: `https://your-render-app-name.onrender.com` (your Render.com URL from step 1)
5. **Important**: Update `netlify.toml` as well (already done in this fix)

#### Or update netlify.toml directly
Edit line 9 in `netlify.toml`:
```toml
VITE_BACKEND_URL = "https://your-actual-render-url.onrender.com"
```

### 3. Redeploy Frontend ✅
1. Push changes to GitHub
2. Netlify will auto-deploy
3. Or manually trigger deploy from Netlify dashboard

## Testing Your Deployment

### 1. Test Backend (Render.com)
Visit: `https://your-render-app-name.onrender.com/`

Expected response:
```json
{
  "status": "ok",
  "service": "Maya Voice Agent (WebSocket)",
  "transport": "WebSocket"
}
```

### 2. Test Frontend (Netlify)
1. Open your portfolio on Netlify
2. Click the voice agent button
3. Click "Connect"
4. Check browser console for WebSocket connection logs
5. Test speaking to the agent

## Common Issues & Solutions

### Issue 1: "Failed to connect" error
**Cause**: Backend URL not configured or incorrect  
**Solution**: 
- Check `VITE_BACKEND_URL` env variable in Netlify
- Ensure it starts with `https://` (not `http://`)
- Verify Render.com app is running

### Issue 2: WebSocket connection refused
**Cause**: Render.com free tier cold start (sleeps after 15 min inactivity)  
**Solution**: 
- Wait 30-60 seconds for server to wake up
- Or upgrade to paid plan for always-on service
- First connection might take longer

### Issue 3: CORS errors
**Cause**: Backend CORS not configured for frontend domain  
**Solution**: Already handled in `custom_stt_server_websocket.py` (line 62):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
)
```

### Issue 4: Environment variables missing
**Cause**: Azure/Cartesia API keys not set in Render.com  
**Solution**: Add all required env vars in Render.com dashboard

### Issue 5: Import errors on Render.com
**Cause**: Old pipecat version or missing dependencies  
**Solution**: Already fixed in `requirements.txt` - uses WebSocket instead of WebRTC

## Architecture Notes

### Why This Approach?
- **Netlify**: Best for static React sites (free, fast CDN, auto-deploy)
- **Render.com**: Best for persistent Python servers (free tier, WebSocket support, auto-deploy)
- **Separation**: Frontend and backend can scale independently

### Alternative Platforms

If Render.com doesn't work:
1. **Railway.app** - Similar to Render, good WebSocket support
2. **Fly.io** - Global edge deployment, excellent for WebSockets
3. **DigitalOcean App Platform** - Managed platform with WebSocket support
4. **AWS EC2 + Elastic IP** - Full control but more complex

### Why NOT Netlify for Backend?
- Netlify Functions have 10-second timeout (WebSocket needs persistent connection)
- No persistent process support
- Designed for serverless, not stateful connections

### Why NOT Vercel for Backend?
- Similar to Netlify - serverless functions only
- 10-second timeout on free tier
- No WebSocket support in serverless functions

## Files Modified

1. ✅ `render.yaml` - Render.com deployment config (NEW)
2. ✅ `requirements.txt` - Updated pipecat dependencies for WebSocket
3. ✅ `netlify.toml` - Added VITE_BACKEND_URL environment variable
4. ✅ `DEPLOYMENT_GUIDE.md` - This file (NEW)

## Next Steps

1. **Deploy backend to Render.com** using the steps above
2. **Copy your Render.com URL**
3. **Update VITE_BACKEND_URL** in Netlify settings
4. **Test the connection** using the testing steps above
5. **Monitor logs** in Render.com dashboard for any errors

## Questions?

- Check Render.com logs: Dashboard → Your Service → Logs
- Check Netlify logs: Dashboard → Your Site → Deploys → Deploy log
- Check browser console: F12 → Console tab
- Check Network tab: F12 → Network → WS filter

---

**Current Status**: ✅ Files configured, ready to deploy!
**Action Required**: Deploy backend to Render.com and update VITE_BACKEND_URL
