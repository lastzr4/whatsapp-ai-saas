# WhatsApp AI SaaS 🤖

Multi-tenant WhatsApp AI Bot platform powered by Claude AI.

---

## 🏗️ Architecture

```
[Browser] → [Railway: Express + React] → [Claude API]
                     ↓
              [SQLite on Volume]
              [WhatsApp Sessions]
              [Uploaded QR Images]
```

Single Railway service serves both the React frontend and the Node.js API.
Persistent data (database, sessions, uploads) stored on Railway Volume at `/data`.

---

## 🚀 Deploy to Railway (Step by Step)

### Prerequisites
- GitHub account
- Railway account (railway.app) — sign up with GitHub
- Anthropic API key (console.anthropic.com)

---

### Step 1 — Push to GitHub

```bash
# In your project folder
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com then:
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-ai-saas.git
git push -u origin main
```

---

### Step 2 — Create Railway Project

1. Go to **railway.app** → **New Project**
2. Select **Deploy from GitHub repo**
3. Select your `whatsapp-ai-saas` repo
4. Railway will auto-detect and start building

---

### Step 3 — Add Persistent Volume

This is critical — without a volume, all WhatsApp sessions and data reset on every deploy.

1. In your Railway project → click your service
2. Go to **Settings** → **Volumes**
3. Click **Add Volume**
4. Set **Mount Path**: `/data`
5. Size: 5GB is enough to start
6. Click **Create**

---

### Step 4 — Set Environment Variables

In Railway → your service → **Variables** tab, add these:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ANTHROPIC_API_KEY` | Your key from console.anthropic.com |
| `DATA_PATH` | `/data` |
| `ALLOWED_ORIGINS` | `https://YOUR-APP.up.railway.app` (fill after first deploy) |

---

### Step 5 — Get your URL & Update CORS

1. After deploy, Railway gives you a URL like `https://whatsapp-ai-saas-production.up.railway.app`
2. Copy that URL
3. Go back to **Variables** → update `ALLOWED_ORIGINS` with that URL
4. Railway will auto-redeploy

---

### Step 6 — Create Admin Account

Open Railway → your service → **Shell** tab (or use Railway CLI):

```bash
node backend/create-admin.js admin@yourdomain.com YourPassword123 "Your Name"
```

Or use Railway CLI locally:
```bash
npm install -g @railway/cli
railway login
railway run node backend/create-admin.js admin@example.com password123 "Admin"
```

---

### Step 7 — Done! 🎉

Visit your Railway URL → register → connect WhatsApp → you're live!

---

## 💻 Local Development

```bash
# Install all dependencies
npm install --prefix backend
npm install --prefix frontend

# Start backend (terminal 1)
cd backend && npm start

# Start frontend dev server (terminal 2)
cd frontend && npm run dev
```

Frontend runs on http://localhost:3000
Backend API on http://localhost:3001

---

## 🔧 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Random string for signing JWT tokens |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `DATA_PATH` | Production | Path for persistent data (Railway volume) |
| `ALLOWED_ORIGINS` | Production | Your app URL for CORS |
| `PORT` | Auto | Set by Railway automatically |
| `NODE_ENV` | Optional | Set to `production` |

---

## 📁 Data Structure (on Volume)

```
/data/
├── data/
│   └── saas.db          ← SQLite database
├── uploads/
│   └── {userId}/
│       └── payment-qr.jpg
└── sessions/
    └── {userId}/         ← WhatsApp session files
```

---

## 🔄 Updating Your App

```bash
git add .
git commit -m "Your changes"
git push
```

Railway auto-deploys on every push to `main`. Zero downtime.

---

## 💰 Railway Pricing

| Plan | Cost | Notes |
|------|------|-------|
| Hobby | ~$5/month | Pay per usage, good for starting |
| Pro | $20/month | Better for production |
| Volume (5GB) | ~$0.25/month | Almost free |

Estimated total: **~$5-6/month** for a small SaaS.

---

## 🛠️ Troubleshooting

**Bot not connecting after deploy**
- Check Railway logs for errors
- Make sure Volume is mounted at `/data`
- Verify `DATA_PATH=/data` is set in Variables

**QR code not showing**
- Wait 30-60 seconds after clicking "Hidupkan Bot"
- Check Railway logs for Puppeteer errors

**"JWT_SECRET missing" in logs**
- Make sure environment variable is set in Railway Variables tab
- Redeploy after adding variables

**Puppeteer crashes**
- Railway containers support Chrome — should work out of the box
- If crashing, check if Volume has enough space
