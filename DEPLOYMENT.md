# Deploying for free: Netlify (frontend) + Render (backend)

Netlify serves the React app as static files. Render runs the Express
backend as an actual long-running server (needed for Google Sheets calls,
file uploads, and zipped payslip downloads) — both have free tiers.

## 0. Push the project to GitHub

Both Netlify and Render deploy from a git repo.

```bash
cd hrm-payroll-system
git init
git add .
git commit -m "HRM payroll system"
```
Create a new repo on GitHub and push to it (`git remote add origin …` then
`git push -u origin main`). Because of `.gitignore`, your `.env` files and
`service-account.json` will NOT be pushed — good, they shouldn't be.

## 1. Deploy the backend to Render

1. Go to [render.com](https://render.com) → sign up (free) → **New +** →
   **Web Service** → connect your GitHub repo.
2. Render should detect `render.yaml` and offer to use it as a **Blueprint**.
   If not, configure manually:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
3. Add your secret files (Render dashboard → your service → **Environment**
   → **Secret Files**):
   - Filename: `/etc/secrets/service-account.json` → paste the contents of
     your Google service-account JSON key
   - (optional) Filename: `/etc/secrets/logo.png` → upload your company logo
4. Set environment variables (Environment → **Environment Variables**):
   | Key | Value |
   |---|---|
   | `SPREADSHEET_ID` | your Google Sheet ID |
   | `SHEET_NAME` | `Payroll` (or your tab name) |
   | `GOOGLE_APPLICATION_CREDENTIALS` | `/etc/secrets/service-account.json` |
   | `COMPANY_NAME` | your company name |
   | `COMPANY_ADDRESS` | your company address |
   | `COMPANY_LOGO_PATH` | `/etc/secrets/logo.png` (skip if no logo) |
   | `CORS_ORIGIN` | leave blank for now — you'll fill this in after step 2 |
5. Deploy. Once live, Render gives you a URL like
   `https://hrm-payroll-backend.onrender.com`. Test it:
   `https://hrm-payroll-backend.onrender.com/api/health` should return
   `{"status":"ok"}`.

**Free tier note**: Render's free web services spin down after 15 minutes of
inactivity. The first request after idling takes ~30–50 seconds to wake back
up — normal for free hosting, just not instant.

## 2. Deploy the frontend to Netlify

1. Go to [netlify.com](https://netlify.com) → sign up (free) → **Add new
   site** → **Import an existing project** → connect the same GitHub repo.
2. Netlify should read `netlify.toml` automatically (base: `frontend`,
   build: `npm run build`, publish: `frontend/dist`). If asked manually, use
   those same values.
3. Before deploying, add an environment variable (Site configuration →
   **Environment variables**):
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://hrm-payroll-backend.onrender.com/api` (your Render URL + `/api`) |
4. Deploy. Netlify gives you a URL like `https://your-site-name.netlify.app`
   (you can rename it or add a custom domain for free in Site settings).

## 3. Connect the two: update CORS

Go back to Render → your backend service → Environment Variables → set:
```
CORS_ORIGIN=https://your-site-name.netlify.app
```
Save — Render redeploys automatically. This tells the backend to accept
requests from your live frontend (without it, the browser blocks the API
calls for security).

## 4. Verify

Open your Netlify URL. The dashboard should load your live Google Sheet
data. If you see the "Could not reach the backend API" message:
- Confirm `VITE_API_BASE_URL` on Netlify matches your Render URL exactly
  (including `/api` at the end), then trigger a new Netlify deploy (env var
  changes require a rebuild since Vite bakes them in at build time)
- Confirm `CORS_ORIGIN` on Render matches your Netlify URL exactly
- Check Render's logs for errors connecting to the Google Sheet (usually a
  sharing or spreadsheet-ID mismatch — see `backend/README.md`)

## Redeploying after changes

Both platforms auto-deploy on every `git push` to your connected branch —
just commit and push, no manual redeploy needed.
