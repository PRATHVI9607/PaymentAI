# ⚡ QUICK SETUP - Railway with Docker (2 Services)

## 🎯 What You'll Deploy
- **Service 1**: Backend (FastAPI) → `backend.railway.app`
- **Service 2**: Frontend (React) → `frontend.railway.app`

---

## 🚀 Steps (10 minutes)

### 1️⃣ Create Backend Service
1. Go to https://railway.app → **New Project**
2. Select **"Deploy from GitHub repo"** → Choose `PaymentAI`
3. Railway creates first service
4. **Settings** → **Source**:
   - Dockerfile Path: `Dockerfile.backend`
5. **Variables** tab:
   ```
   GROQ_API_KEY=your_key_here
   ```
6. **Settings** → **Networking** → **Generate Domain**
7. **📝 COPY THE URL** (e.g., `paymentai-backend-xxx.up.railway.app`)

### 2️⃣ Create Frontend Service
1. In same project, click **"+ New"** → **GitHub Repo**
2. Select same `PaymentAI` repo (creates 2nd service)
3. **Settings** → **Source**:
   - Dockerfile Path: `Dockerfile.frontend`
4. **Variables** tab:
   ```
   VITE_API_URL=https://[YOUR-BACKEND-URL-FROM-STEP-1]
   ```
5. **Settings** → **Networking** → **Generate Domain**
6. **🎉 This is your app URL!**

### 3️⃣ Wait for Build
- Both services build independently (5-8 minutes each)
- Watch logs in Railway dashboard
- ✅ Status should show "Success"

### 4️⃣ Test It
- Open frontend URL
- Login: `alice@mail.com` / `alice123`
- Try: "show me laptops"

---

## 🔧 Important Notes

**Backend must be deployed first!** Frontend needs backend URL.

**If builds fail:**
- Click service → Deployments → View Logs
- Common issue: Wrong Dockerfile path
- Solution: Settings → Source → Set correct path

**Environment Variables:**
- Backend needs: `GROQ_API_KEY`
- Frontend needs: `VITE_API_URL` (backend domain)

---

## 📂 Files Created

✅ `Dockerfile.backend` - Backend container
✅ `Dockerfile.frontend` - Frontend container  
✅ `nginx.conf` - Frontend web server
✅ `docker-compose.yml` - Local testing
✅ `.dockerignore` - Exclude files from build

---

## 🧪 Test Locally (Optional)

```powershell
# Create .env file first
echo "GROQ_API_KEY=your_key" > .env

# Run both services
docker-compose up

# Backend: http://localhost:8000
# Frontend: http://localhost:80
```

---

## 🆘 Quick Fixes

**Build stuck?**
→ Redeploy: Service → Deployments → ⋮ → Redeploy

**Frontend can't reach backend?**
→ Check VITE_API_URL has correct backend domain

**Backend crashes?**
→ Check GROQ_API_KEY is set correctly

---

**Need detailed help?** → Open `RAILWAY_DOCKER_GUIDE.md`

**Done!** Your app is live at the frontend Railway URL 🎉
