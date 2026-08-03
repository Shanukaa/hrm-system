import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let sheetsClient = null;

/**
 * Returns a cached, authenticated Google Sheets API client.
 *
 * Two ways to provide the service account credentials:
 *  1. GOOGLE_APPLICATION_CREDENTIALS - path to a key file on disk
 *     (used on Render via a Secret File, or locally).
 *  2. GOOGLE_SERVICE_ACCOUNT_JSON - the full JSON key pasted directly as
 *     an env var value (used on hosts like Railway that don't support
 *     uploading secret files - paste the whole .json file's contents in).
 *
 * Share your spreadsheet with the service account's email address
 * (Editor access) or none of this works.
 */
export async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const authOptions = { scopes: SCOPES };

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    authOptions.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else {
    authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  const auth = new google.auth.GoogleAuth(authOptions);

  const authClient = await auth.getClient();
  sheetsClient = google.sheets({ version: "v4", auth: authClient });
  return sheetsClient;
}

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
export const SHEET_NAME = process.env.SHEET_NAME || "Payroll";

// Which row holds the specific column titles our backend matches against
// (e.g. "OT Pay", "EPF 12%"). Set HEADER_ROW=2 if row 1 is a merged group
// label row ("Company Contribution" etc.) sitting above the real headers.
export const HEADER_ROW = parseInt(process.env.HEADER_ROW || "1", 10);

// The first row that contains actual employee data. Defaults to right
// after HEADER_ROW, but can be set explicitly if there's a gap.
export const DATA_START_ROW = parseInt(
  process.env.DATA_START_ROW || String(HEADER_ROW + 1),
  10
);
