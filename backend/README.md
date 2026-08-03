# HRM Payroll — Backend

Node.js/Express API that reads and writes payroll data to a Google Sheet
using a service account, calculates payroll fields, and generates PDF
payslips.

## 1. Set up the Google Sheets connection

1. Go to the [Google Cloud Console](https://console.cloud.google.com/), create
   a project (or use an existing one).
2. Enable the **Google Sheets API** for that project (APIs & Services → Enable
   APIs → search "Google Sheets API" → Enable).
3. Create a **Service Account**: APIs & Services → Credentials → Create
   Credentials → Service account. Give it any name, e.g. `hrm-payroll-bot`.
4. Open the service account → **Keys** tab → Add Key → Create new key → JSON.
   This downloads a `.json` key file.
5. Move that file into `backend/` and name it `service-account.json` (or
   point `GOOGLE_APPLICATION_CREDENTIALS` in `.env` to wherever you keep it —
   never commit this file to git).
6. Open the downloaded JSON and copy the `client_email` value
   (looks like `hrm-payroll-bot@your-project.iam.gserviceaccount.com`).
7. Open **your** Google Sheet, click **Share**, and add that email as an
   **Editor**.
8. Copy your spreadsheet ID from its URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

## 2. Make sure your sheet's headers match

This system supports a **two-row header layout** — a group-label row (e.g.
"Company Contribution" spanning the EPF 12% / ETF 3% columns) sitting above
the specific column titles the backend actually reads. Set this up with
`HEADER_ROW` / `DATA_START_ROW` in `.env` (see step 3).

**Row 2** (the row `HEADER_ROW` points to) must contain these exact
headers, in this order, in columns A–V (edit `src/config/columns.js` if your
sheet uses different wording):

```
EMP NO | EPF No | Employee Name | NIC NO | Designation | Cost Centre |
Basic Salary | Operational Allowance | Attendence Allowance | Traget Allowance |
Nopay Amount | Adjusted Basic | OT Pay | Total OT Pay | Gross Salary |
Employee EPF (8%) | EPF 12% | ETF 3% | Apit |
Deductions | Net Salary | Cost to company
```

**Row 1** (optional) can hold group labels — "OT Pay" over columns M–N, and
"Company Contribution" over columns Q–R — purely for readability. The
backend ignores row 1 entirely when `HEADER_ROW=2`; it only ever reads row 2
for column matching and row 3 onward for employee data.

If you only have one flat header row with no grouping, set `HEADER_ROW=1`
and `DATA_START_ROW=2` instead (the defaults), and use
`Company Contribution EPF 12%` as the header text for that column, or edit
`src/config/columns.js` to whatever single-row header text you're using.

If the header row is empty, the server auto-creates it (and the group row,
if `HEADER_ROW` > 1) for you on first run.

## 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in:
- `SPREADSHEET_ID` — from step 1.8
- `SHEET_NAME` — the tab name inside your spreadsheet (default `Payroll`)
- `HEADER_ROW` / `DATA_START_ROW` — set to `2` / `3` if your sheet has a
  group-label row above the real headers (see step 2), or leave the
  defaults `1` / `2` for a single flat header row
- `GOOGLE_APPLICATION_CREDENTIALS` — path to the JSON key file
- `COMPANY_NAME` / `COMPANY_ADDRESS` — shown on payslip letterhead
- `COMPANY_LOGO_PATH` — optional path to a PNG/JPG logo (put the file in
  `backend/assets/logo.png`); if missing, a placeholder monogram is drawn
  instead

## 4. Install and run

```bash
npm install
npm run dev      # auto-restarts on change
# or
npm start
```

The API runs at `http://localhost:4000` by default. Health check:
`GET http://localhost:4000/api/health`

## API reference

| Method | Endpoint                          | Purpose                                   |
|--------|------------------------------------|--------------------------------------------|
| GET    | `/api/employees`                   | List all employees                        |
| GET    | `/api/employees/:empNo`            | Get one employee                          |
| POST   | `/api/employees`                   | Create employee (auto-calculates fields)  |
| PUT    | `/api/employees/:empNo`            | Update employee (recalculates fields)     |
| DELETE | `/api/employees/:empNo`            | Delete employee                           |
| POST   | `/api/import` (multipart `file`)   | Bulk import from CSV/XLSX                 |
| GET    | `/api/payslips/:empNo?period=`     | Download one payslip PDF                  |
| GET    | `/api/payslips?empNos=A,B&period=` | Download a zip of payslips (all if no filter) |
| GET    | `/api/dashboard/summary`           | Aggregate totals for the dashboard cards  |

## Deployment

This is a standard Express app — deploy it anywhere that runs Node 18+
(Render, Railway, Fly.io, an EC2/VPS box, etc.). Set the same environment
variables there, and upload the service account JSON as a secret file rather
than committing it to your repo.
