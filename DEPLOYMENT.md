# 🚀 SLRV BEAM: Live Deployment & Hosting
**Engineered by Swaraj, Laxmikant, Rahul, and Vaibhav**

### 🌐 Live Public Production URL (Active Now):
👉 **[https://establishment-describes-chocolate-specified.trycloudflare.com](https://establishment-describes-chocolate-specified.trycloudflare.com)**
- **Frontend App**: `https://establishment-describes-chocolate-specified.trycloudflare.com`
- **Signaling WebSocket**: `wss://establishment-describes-chocolate-specified.trycloudflare.com/ws`
- **Health API**: `https://establishment-describes-chocolate-specified.trycloudflare.com/api/health`

---

## 1. Deploy Signaling Server to Render

### Option A: Using Render Blueprint (`render.yaml` - Recommended)
1. Push your repository to **GitHub**.
2. Log into [dashboard.render.com](https://dashboard.render.com/).
3. Click **"New +"** ➔ **"Blueprint"**.
4. Connect your GitHub repository.
5. Render will automatically detect `render.yaml` and configure the **`slrv-beam-signaling`** web service.
6. Click **"Apply"** and wait for deployment to complete.
7. Note your Render service URL (e.g. `https://slrv-beam-signaling.onrender.com`).

### Option B: Manual Web Service Setup on Render
1. Click **"New +"** ➔ **"Web Service"** in Render.
2. Select your repository.
3. Configure the following settings:
   - **Name**: `slrv-signaling-server`
   - **Language**: `Node`
   - **Branch**: `main`
   - **Root Directory**: *(leave blank or set to `backend`)*
   - **Build Command**: `npm install --prefix backend && npm run build --prefix backend`
   - **Start Command**: `node backend/dist/server.js`
   - **Health Check Path**: `/api/health`
4. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `8080` (or leave default assigned by Render)
   - `CORS_ORIGIN` = `*`
   - `JWT_SECRET` = *(any secure random string)*
5. Click **"Create Web Service"**.
6. Once deployed, test your health check at: `https://your-service-name.onrender.com/api/health` (it should return status `"UP"`).

Your WebSocket signaling endpoint is:
`wss://your-service-name.onrender.com/ws`

---

## 2. Deploy Frontend to Vercel

1. Log into [vercel.com](https://vercel.com/) and click **"Add New..."** ➔ **"Project"**.
2. Import your GitHub repository.
3. In **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and select `frontend` (or leave root as `.` if using root `vercel.json`).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_SIGNALING_SERVER_URL` = `wss://your-service-name.onrender.com/ws`
   *(Replace with your actual Render URL)*
5. Click **"Deploy"**.

---

## 3. Verify Full-Mesh Operation

1. Open your Vercel URL (e.g. `https://slrv-protocol.vercel.app`) in two different browser windows / devices.
2. Look at the top right header:
   - You should see `SERVER ●` (green dot) confirming connection to your Render signaling server.
   - You can click `SERVER ●` anytime to inspect or change the signaling URL in real time.
3. Both browser tabs will discover each other under **NODES**.
4. Start sending files losslessly via direct WebRTC peer-to-peer!
