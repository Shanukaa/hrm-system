# Fresh Deployment Guide

This is the complete, current version of the project — MySQL database,
login with roles (Admin / HR Manager / HR Executive), audit logging, two
payslip formats, and the HairSkiin Sri Lanka branding all included and
tested together. This guide sets it up from scratch: GitHub → Railway
(MySQL) → Render (backend) → Netlify (frontend).

---

## 0. Push to GitHub

```bash
cd hrm-payroll-system
git init
git add .
git commit -m "Fresh deploy: MySQL, auth, roles, audit log, branding"
```

Create a new empty repo on GitHub, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 1. Create the MySQL database (Railway)

1. [railway.app](https://railway.app) → **New Project** → **+ New** →
   **Database** → **Add MySQL**.
2. Open the MySQL service → **Settings → Networking** → enable **TCP
   Proxy**. This gives you a public host/port — Render is a separate host
   from Railway, so it can only reach the database through this proxy, not
   the private `*.railway.internal` address.
3. Note down the public host, port, user, password, and database name
   from the service's **Variables** tab (you'll need the `MYSQLHOST` /
   `MYSQLPORT` shown next to the TCP Proxy, plus `MYSQLUSER`,
   `MYSQLPASSWORD`, `MYSQLDATABASE`).

## 2. Deploy the backend (Render)

1. [render.com](https://render.com) → **New** → **Web Service** → connect
   your GitHub repo.
2. Root directory: `backend`. Build command: `npm install`. Start
   command: `npm start`.
3. Add these environment variables:

   | Key | Value |
   |---|---|
   | `DB_HOST` | Railway's public MySQL host |
   | `DB_PORT` | Railway's public MySQL port (from the TCP Proxy, not 3306) |
   | `DB_USER` | Railway `MYSQLUSER` (usually `root`) |
   | `DB_PASSWORD` | Railway `MYSQLPASSWORD` |
   | `DB_NAME` | Railway `MYSQLDATABASE` (usually `railway`) |
   | `DB_SSL` | `false` |
   | `JWT_SECRET` | long random string — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `8h` |
   | `BOOTSTRAP_ADMIN_NAME` | your name |
   | `BOOTSTRAP_ADMIN_EMAIL` | the email you'll log in with |
   | `BOOTSTRAP_ADMIN_PASSWORD` | a temporary password (change after first login) |
   | `COMPANY_NAME` | HairSkiin Sri Lanka |
   | `COMPANY_ADDRESS` | your business address |
   | `COMPANY_LOGO_PATH` | `./assets/logo.png` |
   | `CORS_ORIGIN` | leave blank for now — fill in after step 3 |

4. Deploy. Once live, check `https://YOUR-RENDER-URL/api/health` returns
   `{"status":"ok"}`. Check the Render logs — on first boot it should
   create the `employees`, `users`, and `logs` tables automatically and
   print a line confirming your bootstrap admin account was created.

## 3. Deploy the frontend (Netlify)

1. [netlify.com](https://netlify.com) → **Add new site → Import an
   existing project** → same repo.
2. Build settings (should auto-read from `netlify.toml`): base `frontend`,
   build command `npm run build`, publish `dist`.
3. Environment variable:
   ```
   VITE_API_BASE_URL=https://YOUR-RENDER-URL/api
   ```
4. Deploy — you'll get a `.netlify.app` URL.

## 4. Connect them

Back in Render, set:
```
CORS_ORIGIN=https://your-site-name.netlify.app
```
Save — Render redeploys automatically.

## 5. First login

Open your Netlify URL, log in with the `BOOTSTRAP_ADMIN_EMAIL` /
`BOOTSTRAP_ADMIN_PASSWORD` you set in step 2. From **Users**, create
accounts for your team (Admin / HR Manager / HR Executive), then change
your own password.

## 6. Add your employee data

Either:
- Add employees manually through the **Add Employee** form, or
- If you have existing data in a Google Sheet from before, see
  `MYSQL_MIGRATION.md` for the one-time import script — run it locally,
  pointed at this same Railway database.

---

## What's included in this build

- **Auth & roles** — login, JWT sessions, Admin / HR Manager / HR
  Executive permission levels, user management page
- **Audit log** — every login, employee change, import, and payslip
  download recorded with who/when
- **MySQL storage** — `employees`, `users`, `logs` tables, auto-created on
  first boot
- **Two payslip formats** — the original detailed payslip, and a simpler
  bank-advice-style payslip (with Nopay Amount and a fixed Rs. 25 Stamp
  Duty under Deductions, bank name/account credit line)
- **HairSkiin Sri Lanka branding** — navy + gold theme, logo on the
  sidebar, login page, and payslip letterhead
