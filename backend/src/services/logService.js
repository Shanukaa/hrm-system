import { getSheetsClient, SPREADSHEET_ID } from "../config/sheets.js";
import { ensureTabWithHeaders, colLetter } from "./sheetTabHelper.js";
import { LOGS_SHEET_NAME } from "../config/auth.js";

// timestamp | userEmail | userRole | action | details | ip
const HEADERS = ["timestamp", "userEmail", "userRole", "action", "details", "ip"];
const RANGE_ALL = `${LOGS_SHEET_NAME}!A2:${colLetter(HEADERS.length)}`;

export async function ensureLogsSheet() {
  await ensureTabWithHeaders(LOGS_SHEET_NAME, HEADERS);
}

/** Appends one audit log entry. Never throws — logging failures shouldn't break the request. */
export async function addLog({ userEmail, userRole, action, details, ip }) {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE_ALL,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[new Date().toISOString(), userEmail || "", userRole || "", action || "", details || "", ip || ""]],
      },
    });
  } catch (err) {
    console.error("Failed to write audit log entry:", err.message);
  }
}

/** Returns log entries, most recent first, optionally capped to `limit`. */
export async function getLogs({ limit } = {}) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE_ALL });
  const rows = res.data.values || [];
  const entries = rows
    .filter((r) => r.some((cell) => cell !== undefined && cell !== ""))
    .map((r) => ({
      timestamp: r[0] || "",
      userEmail: r[1] || "",
      userRole: r[2] || "",
      action: r[3] || "",
      details: r[4] || "",
      ip: r[5] || "",
    }))
    .reverse();
  return limit ? entries.slice(0, limit) : entries;
}
