# Deploying: Netlify (frontend) + Railway (backend)

Netlify serves the React app as static files. Railway runs the Express
backend as an actual long-running server (needed for Google Sheets calls,
file uploads, and zipped payslip downloads).

Railway does **not** support uploading secret files like Render does, so
credentials are passed as a plain environment variable instead — the
backend already supports this (see `backend/src/config/sheets.js`):

- `GOOGLE_APPLICATION_CREDENTIALS` — path to a key file on disk (used
  locally, or on hosts that support secret files)
- `GOOGLE_SERVICE_ACCOUNT_JSON` — the **full contents** of the service
  account JSON key, pasted directly as an env var value (used on Railway)

If `GOOGLE_SERVICE_ACCOUNT_JSON` is set, it takes priority.

---

## 0. Push the project to GitHub

Railway and Netlify both deploy from a git repo.

```bash
cd hrm-payroll-system
git init
git add .
git commit -m "HRM payroll system"
```

Create a new repo on GitHub, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Because of `.gitignore`, your `.env` files and `service-account.json` will
NOT be pushed — good, they shouldn't be.

---

## 1. Deploy the backend to Railway

1. Go to [railway.app](https://railway.app) → sign in with GitHub →
   **New Project** → **Deploy from GitHub repo** → select your repo.
2. Railway will try to build from the repo root. Point it at the backend:
   - Click the new service → **Settings** → **Source** →
     set **Root Directory** to `backend`.
   - Under **Build**, it should auto-detect Node via Nixpacks (there's also
     a `backend/railway.json` in this repo that pins the start command to
     `npm start`).
3. Get your Google service account JSON key ready (see `backend/README.md`
   if you haven't created one yet — you need the whole file's contents).
4. Go to the service → **Variables** and add:

   | Key | Value |
   |---|---|
   | `SPREADSHEET_ID` | your Google Sheet ID |
   | `SHEET_NAME` | `Payroll` (or your tab name) |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | paste the **entire contents** of your service-account `.json` key file (Railway variables support multi-line values) |
   | `HEADER_ROW` | `2` (or `1` if your sheet has a single flat header row) |
   | `DATA_START_ROW` | `3` (or `2` to match `HEADER_ROW`) |
   | `COMPANY_NAME` | your company name |
   | `COMPANY_ADDRESS` | your company address |
   | `CORS_ORIGIN` | leave blank for now — you'll fill this in after step 2 |
   | `PORT` | `4000` (Railway usually injects its own `PORT` automatically — if it does, leave this one out; the app reads `process.env.PORT`) |

   For a logo on payslips: since there's no secret-file upload on Railway,
   either commit a real logo to `backend/assets/logo.png` in your repo (fine
   since it isn't sensitive), or skip it — a placeholder monogram is used
   when `COMPANY_LOGO_PATH` isn't set or the file isn't found.

5. Click **Deploy**. Once live, Railway gives you a public URL under
   **Settings → Networking → Generate Domain**, something like
   `https://hrm-payroll-backend-production.up.railway.app`.
6. Test it: `https://YOUR-RAILWAY-URL/api/health` should return
   `{"status":"ok"}`.

**Free tier note**: Railway's free/trial tier runs on usage-based credits
rather than spin-down-on-idle like Render, so there's no cold-start delay —
but check Railway's current pricing page, since free-tier terms change.

---

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
   | `VITE_API_BASE_URL` | `https://YOUR-RAILWAY-URL/api` (your Railway domain + `/api`) |

4. Deploy. Netlify gives you a URL like `https://your-site-name.netlify.app`
   (you can rename it or add a custom domain for free in Site settings).

---

## 3. Connect the two: update CORS

Go back to Railway → your backend service → **Variables** → set:

```
CORS_ORIGIN=https://your-site-name.netlify.app
```

Save — Railway redeploys automatically. This tells the backend to accept
requests from your live frontend (without it, the browser blocks the API
calls for security).

---

## 4. Verify

Open your Netlify URL. The dashboard should load your live Google Sheet
data. If you see a "Could not reach the backend API" message:

- Confirm `VITE_API_BASE_URL` on Netlify matches your Railway URL exactly
  (including `/api` at the end), then trigger a new Netlify deploy (env var
  changes require a rebuild since Vite bakes them in at build time)
- Confirm `CORS_ORIGIN` on Railway matches your Netlify URL exactly
- Check Railway's deploy logs for errors connecting to the Google Sheet
  (usually a sharing permission or spreadsheet-ID mismatch — the sheet must
  be shared with the service account's `client_email`, with Editor access —
  see `backend/README.md`)
- Check that `GOOGLE_SERVICE_ACCOUNT_JSON` was pasted as valid JSON with no
  extra line breaks stripped by the form — if Railway's variable editor
  mangles it, try pasting it as a single-line JSON string instead

---

## Redeploying after changes

Both platforms auto-deploy on every `git push` to your connected branch —
just commit and push, no manual redeploy needed.
