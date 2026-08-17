/**
 * One-time migration: copies every employee row from your existing Google
 * Sheet into the new MySQL `employees` table.
 *
 * Requires BOTH your old Google Sheets env vars (SPREADSHEET_ID, SHEET_NAME,
 * and either GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON)
 * AND your new MySQL env vars (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD,
 * DB_NAME) to be set at the same time — put them all in backend/.env
 * temporarily, run this once, then remove the Google ones if you like.
 *
 * Run from the backend/ folder:
 *   npm run migrate-from-sheets
 */
import dotenv from "dotenv";
dotenv.config();

import { getSheetsClient, SPREADSHEET_ID, SHEET_NAME, DATA_START_ROW } from "../src/config/sheets.js";
import { rowArrayToObject, COLUMNS } from "../src/config/columns.js";
import {
  ensureEmployeesTable,
  getEmployeeByEmpNo,
  createEmployee,
  updateEmployee,
} from "../src/services/employeeService.js";

const QUOTED_SHEET_NAME = `'${SHEET_NAME.trim().replace(/'/g, "''")}'`;
const RANGE_ALL = `${QUOTED_SHEET_NAME}!A${DATA_START_ROW}:Z`;

async function main() {
  if (!SPREADSHEET_ID) {
    console.error("SPREADSHEET_ID is not set — add your old Google Sheets env vars to backend/.env and try again.");
    process.exit(1);
  }
  if (!process.env.DB_HOST) {
    console.error("DB_HOST is not set — add your MySQL env vars to backend/.env and try again.");
    process.exit(1);
  }

  console.log(`Reading employee rows from Google Sheet "${SHEET_NAME}"...`);
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE_ALL });
  const rows = res.data.values || [];
  const records = rows
    .filter((r) => r.some((cell) => cell !== undefined && cell !== ""))
    .map(rowArrayToObject);

  console.log(`Found ${records.length} employee row(s) in the sheet.`);
  if (records.length === 0) {
    console.log("Nothing to migrate.");
    process.exit(0);
  }

  console.log("Setting up the MySQL `employees` table (if it doesn't exist yet)...");
  await ensureEmployeesTable();

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const record of records) {
    // Coerce numeric fields — sheet values come back as strings.
    COLUMNS.forEach((c) => {
      if (c.type === "number") record[c.key] = Number(record[c.key]) || 0;
    });

    if (!record.empNo) {
      console.warn("Skipping a row with no EMP NO.");
      failed++;
      continue;
    }

    try {
      const existing = await getEmployeeByEmpNo(record.empNo);
      if (existing) {
        await updateEmployee(record.empNo, record);
        updated++;
      } else {
        await createEmployee(record);
        created++;
      }
      process.stdout.write(".");
    } catch (err) {
      failed++;
      console.error(`\nFailed to migrate employee "${record.empNo}": ${err.message}`);
    }
  }

  console.log(`\n\nDone. Created ${created}, updated ${updated}, failed ${failed} out of ${records.length} rows.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
