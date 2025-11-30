# 🚀 Railway Deployment Guide - Two Services Setup

## 📋 Overview
This app uses **2 separate Railway services**:
1. **Backend Service** - Python FastAPI (Port 8000)
2. **Frontend Service** - React with Nginx (Port 80)

---

## 🛠️ Step-by-Step Deployment

### Step 1: Push Code to GitHub ✅

```powershell
git add .
git commit -m "Add Docker configuration for Railway"
git push origin main
```

### Step 2: Create Backend Service 🔧

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your **PaymentAI** repository
5. Railway will create the first service

**Configure Backend:**
- Click on the service
- Go to **Settings** → **General**
- Set **Name**: `paymentai-backend`
- Go to **Settings** → **Source**
- Set **Root Directory**: `/` (leave empty or use root)
- Set **Dockerfile Path**: `Dockerfile.backend`
- Go to **Variables** tab
- Add environment variable:
  ```
  GROQ_API_KEY=your_groq_api_key_here
  ```
- Go to **Settings** → **Networking**
- Click **"Generate Domain"**
- **Copy the backend URL** (e.g., `https://paymentai-backend.up.railway.app`)

### Step 3: Create Frontend Service 🎨

1. In the same Railway project, click **"+ New"**
2. Select **"GitHub Repo"** again
3. Choose the same **PaymentAI** repository
4. This creates a second service

**Configure Frontend:**
- Click on the new service
- Go to **Settings** → **General**
- Set **Name**: `paymentai-frontend`
- Go to **Settings** → **Source**
- Set **Root Directory**: `/` (leave empty or use root)
- Set **Dockerfile Path**: `Dockerfile.frontend`
- Go to **Variables** tab
- Add environment variable:
  ```
  VITE_API_URL=https://your-backend-url.up.railway.app
  ```
  (Use the backend URL from Step 2)
- Go to **Settings** → **Networking**
- Click **"Generate Domain"**
- **This is your main app URL!** 🎉

### Step 4: Update Frontend API URL 🔗

You need to update the frontend to use the Railway backend URL:

1. Go to Variables in Frontend service
2. Set: `VITE_API_URL=https://your-backend-domain.up.railway.app`
3. Redeploy the frontend service

### Step 5: Test Your Deployment ✅

1. Open your **frontend URL** (from Step 3)
2. You should see the PaymentAI login page
3. Try logging in with demo account:
   - Email: `alice@mail.com`
   - Password: `alice123`
4. Test the AI assistant
5. Test making purchases

---

## 🔍 Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Ensure both Dockerfiles are present
- Verify requirements.txt and package.json are correct

### Backend Won't Start
- Check that `GROQ_API_KEY` is set correctly
- View logs: Railway dashboard → Backend service → Deployments → Logs

### Frontend Can't Connect to Backend
- Verify `VITE_API_URL` points to your backend domain
- Check CORS settings in backend (already configured)
- Make sure both services are deployed successfully

### CORS Errors
- Backend already allows Railway domains in CORS settings
- Check `backend/app/main.py` if you need to add specific domains

---

## 📊 Service Architecture

```
┌─────────────────────────────────────────────┐
│           Railway Project                   │
│                                             │
│  ┌─────────────────┐  ┌──────────────────┐ │
│  │  Backend Service│  │ Frontend Service │ │
│  │                 │  │                  │ │
│  │  FastAPI        │←─│  React + Nginx   │ │
│  │  Port: 8000     │  │  Port: 80        │ │
│  │  Python 3.11    │  │  Node 18 + Nginx │ │
│  └─────────────────┘  └──────────────────┘ │
│         ↓                      ↓            │
│  backend.railway.app    frontend.railway   │
└─────────────────────────────────────────────┘
```

---

## 💰 Cost

- **Railway Free Tier**: $5 worth of credits/month
- **2 Services**: Each service uses credits independently
- **Hobby Plan**: $5/month for unlimited usage

---

## 🔄 Updating Your App

After making code changes:

```powershell
git add .
git commit -m "Your changes"
git push origin main
```

Both services will automatically redeploy! ⚡

---

## 📱 Demo Accounts

| User  | Email              | Password  | Balance  |
|-------|--------------------|-----------|----------|
| Alice | alice@mail.com     | alice123  | $15,000  |
| Bob   | bob@mail.com       | bob123    | $8,000   |
| Carol | carol@mail.com     | carol123  | $12,000  |

---

## ✅ Checklist

- [ ] Both services created in Railway
- [ ] Backend GROQ_API_KEY added
- [ ] Backend domain generated
- [ ] Frontend VITE_API_URL set to backend domain
- [ ] Frontend domain generated
- [ ] Both services deployed successfully
- [ ] Tested login and AI assistant

---

**Your PaymentAI is now live with 2 services! 🚀**
