# HRM Payroll System

A payroll management system with:
- **Backend**: Node.js/Express API using **Google Sheets** as the database
  (via a service account), with automatic payroll calculations and PDF
  payslip generation.
- **Frontend**: React (Vite + Tailwind) dashboard for managing employees,
  importing CSV/Excel data, and downloading payslips.

```
hrm-payroll-system/
├── backend/     Express API (Google Sheets + PDF generation)
└── frontend/    React dashboard (Vite)
```

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env      # then fill in SPREADSHEET_ID etc. — see backend/README.md
npm install
npm run dev
```
Follow **backend/README.md** for the full Google Cloud service-account setup
(creating credentials, sharing the sheet, matching header names).

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # points at the backend API URL
npm install
npm run dev
```
Open the URL Vite prints (default `http://localhost:5173`).

## What's included

- **Dashboard** — live summary cards (headcount, gross/net/cost-to-company
  totals) and a searchable, sortable employee ledger table pulled straight
  from the Google Sheet.
- **Add / Edit Employee form** — manual entry with a live-calculating side
  panel (Gross Salary, EPF, ETF, Net Salary, Cost to Company update as you
  type). Calculated fields are locked to prevent accidental mismatches with
  the formulas.
- **CSV / Excel import** — drag-and-drop a `.csv` or `.xlsx` file; rows are
  matched to existing employees by EMP NO (update) or added as new rows
  (create), with calculated fields re-computed automatically.
- **Payslips** — download a single employee's payslip as a letterheaded PDF,
  or generate a zip of every payslip (or a selected subset) in one click.

## Your sheet layout (two header rows)

This project is configured for a sheet with a group-label row above the
real column titles, matching a typical payroll layout:

| Row | Columns A–L | M | N | O–P | Q | R | S–V |
|---|---|---|---|---|---|---|---|
| 1 (group labels, optional) | *(blank)* | OT Pay | OT Pay | *(blank)* | Company Contribution | Company Contribution | *(blank)* |
| 2 (real headers) | EMP NO … Adjusted Basic | OT Pay | Total OT Pay | Gross Salary, Employee EPF (8%) | EPF 12% | ETF 3% | Apit … Cost to company |
| 3+ | employee data | | | | | | |

`backend/.env` has `HEADER_ROW=2` and `DATA_START_ROW=3` set for this. If
your sheet only has one flat header row instead, set `HEADER_ROW=1` and
`DATA_START_ROW=2`. Full column list is in `backend/README.md`.

## Payroll formulas

Implemented identically on both the backend (source of truth, used when
saving) and frontend (for the live preview):

```
Adjusted Basic     = Basic Salary − Nopay Amount
Total OT Pay       = OT Pay
Gross Salary       = Adjusted Basic + Operational Allowance + Attendance Allowance
                     + Target Allowance + Total OT Pay
Employee EPF (8%)  = Adjusted Basic × 8%
Company EPF (12%)  = Adjusted Basic × 12%
ETF (3%)           = Adjusted Basic × 3%
Net Salary         = Gross Salary − Employee EPF (8%) − Apit − Deductions
Cost to Company    = Gross Salary + Company EPF (12%) + ETF (3%)
```

`Apit` (PAYE tax) and `Deductions` (loans/advances/etc.) are manual entries,
since APIT depends on a tax table specific to each employee's situation.
Edit `backend/src/services/payrollCalc.js` (and the mirrored function in
`frontend/src/api/fields.js`) if your organization uses different rules.

## Deployment (free): Netlify + Render

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step guide.
Short version: Netlify only serves static sites, so the frontend deploys
there for free, while the backend (which needs to stay running to talk to
Google Sheets, handle file uploads, and stream zip downloads) deploys to
Render's free web-service tier. `netlify.toml` and `render.yaml` in this
repo are already configured for that split — connect your GitHub repo to
both and follow the guide.

- Put a real logo at `backend/assets/logo.png` (locally) or upload it as a
  Render secret file (see DEPLOYMENT.md) and set `COMPANY_LOGO_PATH` to have
  it appear on payslips; otherwise a placeholder monogram is used.
