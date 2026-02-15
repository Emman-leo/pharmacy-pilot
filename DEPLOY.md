# Deployment Guide (Vercel + Render)

## Backend (Render)

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo, select `pharmacy-pilot`
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance:** Free
4. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_URL` = `https://your-app.vercel.app` (set after frontend deploy)
5. Deploy → copy the service URL (e.g. `https://pharmacy-pilot-api.onrender.com`)

## Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your `pharmacy-pilot` repo
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (auto-detected)
4. Add environment variable:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api` (include `/api`)
5. Deploy → copy the Vercel URL

## Update CORS

After frontend is live, go back to Render → your backend service → **Environment** → set:

- `FRONTEND_URL` = your Vercel URL (e.g. `https://pharmacy-pilot.vercel.app`)

Save to trigger a redeploy.
