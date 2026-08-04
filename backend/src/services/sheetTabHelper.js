import { getSheetsClient, SPREADSHEET_ID } from "../config/sheets.js";

/**
 * Ensures a tab with the given name exists in the spreadsheet (creating it
 * if missing), and that its first row matches `headers` (writing it if the
 * row is currently empty). Used for the auto-managed Users and Logs tabs,
 * which live alongside the Payroll tab in the same spreadsheet.
 */
export async function ensureTabWithHeaders(sheetName, headers) {
  const sheets = await getSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets.some((s) => s.properties.title === sheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:${colLetter(headers.length)}1`,
  });
  const existingHeaders = res.data.values?.[0];
  if (!existingHeaders || existingHeaders.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

export function colLetter(n) {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
