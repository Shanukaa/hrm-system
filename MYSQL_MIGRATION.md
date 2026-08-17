# Migrating to MySQL (Railway) from Google Sheets

Your backend now reads and writes a real MySQL database instead of Google
Sheets. The database itself lives on **Railway** (Render doesn't offer
managed MySQL); your backend keeps running on **Render** as before, and
just connects out to Railway's database over the network.

Three tables are created automatically the first time the backend starts:
`employees`, `users`, `logs` — same data, same shape as before, just in
proper database tables instead of spreadsheet tabs.

---

## 1. Create the MySQL database on Railway

1. Go to [railway.app](https://railway.app) → open (or create) a project.
2. Click **+ New** → **Database** → **Add MySQL**.
3. Once it's provisioned, click into the MySQL service → **Variables** tab.
   You'll see `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`,
   `MYSQLDATABASE` — but these are the **private** network values, only
   reachable by other services inside the same Railway project. Render is
   a separate host, so you need the **public** ones instead:
4. Go to the MySQL service → **Settings → Networking** → enable **TCP
   Proxy**. Railway will show you a public hostname and port (something
   like `containers-us-west-123.railway.app:6543`) — **use these**, not
   the private `mysql.railway.internal` ones.

## 2. Add the DB env vars to Render

Render → your backend service → **Environment**, add:

| Key | Value |
|---|---|
| `DB_HOST` | the public host Railway showed you (e.g. `containers-us-west-123.railway.app`) |
| `DB_PORT` | the public port Railway showed you (e.g. `6543`) — **not** 3306 |
| `DB_USER` | `MYSQLUSER` value from Railway (usually `root`) |
| `DB_PASSWORD` | `MYSQLPASSWORD` value from Railway |
| `DB_NAME` | `MYSQLDATABASE` value from Railway (usually `railway`) |
| `DB_SSL` | `false` (leave as-is unless Railway tells you SSL is required) |

You can now **remove** the old Google Sheets variables (`SPREADSHEET_ID`,
`SHEET_NAME`, `HEADER_ROW`, `DATA_START_ROW`, `GOOGLE_APPLICATION_CREDENTIALS`
/ `GOOGLE_SERVICE_ACCOUNT_JSON`) from Render — the live app no longer uses
them. Keep them only if you haven't run the migration below yet.

Save — Render redeploys automatically. Check `https://YOUR-RENDER-URL/api/health`
still returns `{"status":"ok"}`, and check the Render logs — on first boot
you should see the three tables get created with no errors.

## 3. Migrate your existing data from the Sheet

This is a **one-time script**, run from your own machine (not on Render),
that reads every row out of your Google Sheet and inserts it into the new
MySQL database.

1. In `backend/.env` **locally**, set **both** the old Google Sheets
   variables **and** the new `DB_*` variables at the same time (see
   `.env.example` — the bottom section is exactly for this). Point the
   `DB_*` values at the same public Railway host/port from step 1.
2. From the `backend/` folder:
   ```bash
   npm install
   npm run migrate-from-sheets
   ```
3. You'll see a line of dots as it copies each row, then a summary like:
   ```
   Done. Created 42, updated 0, failed 0 out of 42 rows.
   ```
4. Spot-check: log into your live app and confirm the employees show up
   correctly.

If a row fails (bad data, duplicate EMP NO, etc.), it's reported by name —
fix it in the Sheet and re-run the script; it's safe to run more than
once, since existing EMP NOs get updated rather than duplicated.

## 4. Clean up

Once you've confirmed everything migrated correctly:
- Remove the Google Sheets env vars from your local `.env` and from Render
  (if you hadn't already)
- Your Google Sheet itself is untouched and still there as a backup —
  keep it around for a while just in case, then archive/delete later

---

## What changed in the code

- `backend/src/services/employeeService.js` — new, replaces
  `sheetsService.js` (removed)
- `backend/src/services/userService.js` and `logService.js` — rewritten to
  use MySQL tables instead of Google Sheets tabs
- `backend/src/config/db.js` — new, the MySQL connection pool
- `backend/src/server.js` — now creates MySQL tables on startup instead of
  Google Sheets tabs
- `backend/scripts/migrate-from-sheets.mjs` — the one-time migration script
- `backend/src/config/sheets.js` is **kept** (only the migration script
  still uses it) — safe to delete once you're done migrating
