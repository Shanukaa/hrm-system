import { getSheetsClient, SPREADSHEET_ID, SHEET_NAME, HEADER_ROW, DATA_START_ROW } from "../config/sheets.js";
import { HEADERS, GROUP_HEADERS, COLUMNS, rowArrayToObject, objectToRowArray } from "../config/columns.js";

// Google's A1 range syntax requires the sheet/tab name to be single-quoted
// whenever it contains anything other than plain letters/digits/underscores
// (spaces, punctuation, etc.) — and any literal single quote inside the name
// must itself be escaped as '' . Quoting unconditionally here means the app
// keeps working no matter what the tab is named, including stray whitespace
// picked up from copy-pasting the env var into a hosting dashboard.
const QUOTED_SHEET_NAME = `'${SHEET_NAME.trim().replace(/'/g, "''")}'`;

const RANGE_ALL = `${QUOTED_SHEET_NAME}!A${DATA_START_ROW}:Z`;

/**
 * Ensures the header row exists at HEADER_ROW and matches expected columns;
 * creates it (and an optional group-label row above it) if missing.
 */
export async function ensureHeaders() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${QUOTED_SHEET_NAME}!A${HEADER_ROW}:Z${HEADER_ROW}`,
  });
  const existing = res.data.values?.[0];
  if (!existing || existing.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${QUOTED_SHEET_NAME}!A${HEADER_ROW}`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
    // If there's a row above the specific headers (HEADER_ROW > 1), and it's
    // empty, populate it with group labels like "OT Pay" / "Company Contribution".
    if (HEADER_ROW > 1) {
      const groupRow = HEADER_ROW - 1;
      const groupRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${QUOTED_SHEET_NAME}!A${groupRow}:Z${groupRow}`,
      });
      if (!groupRes.data.values?.[0]?.length) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${QUOTED_SHEET_NAME}!A${groupRow}`,
          valueInputOption: "RAW",
          requestBody: { values: [GROUP_HEADERS] },
        });
      }
    }
  }
}

/** Fetches all employee rows as objects, keyed by field name. */
export async function getAllEmployees() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE_ALL,
  });
  const rows = res.data.values || [];
  return rows
    .filter((r) => r.some((cell) => cell !== undefined && cell !== ""))
    .map((r, i) => ({ ...rowArrayToObject(r), _row: i + DATA_START_ROW })); // absolute sheet row number
}

export async function getEmployeeByEmpNo(empNo) {
  const all = await getAllEmployees();
  return all.find((e) => e.empNo === empNo) || null;
}

/** Appends a new employee row. Throws if EMP NO already exists. */
export async function createEmployee(data) {
  const existing = await getEmployeeByEmpNo(data.empNo);
  if (existing) {
    const err = new Error(`Employee with EMP NO "${data.empNo}" already exists`);
    err.status = 409;
    throw err;
  }
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE_ALL,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [objectToRowArray(data)] },
  });
  return data;
}

/** Updates an existing employee row (matched by EMP NO). */
export async function updateEmployee(empNo, data) {
  const existing = await getEmployeeByEmpNo(empNo);
  if (!existing) {
    const err = new Error(`Employee with EMP NO "${empNo}" not found`);
    err.status = 404;
    throw err;
  }
  const sheets = await getSheetsClient();
  const rowNum = existing._row;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${QUOTED_SHEET_NAME}!A${rowNum}:${colLetter(COLUMNS.length)}${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [objectToRowArray({ ...existing, ...data, empNo })] },
  });
  return { ...existing, ...data, empNo };
}

/** Deletes an employee row (matched by EMP NO). */
export async function deleteEmployee(empNo) {
  const existing = await getEmployeeByEmpNo(empNo);
  if (!existing) {
    const err = new Error(`Employee with EMP NO "${empNo}" not found`);
    err.status = 404;
    throw err;
  }
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find((s) => s.properties.title === SHEET_NAME.trim());
  if (!sheet) throw new Error(`Sheet tab "${SHEET_NAME}" not found`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: "ROWS",
              startIndex: existing._row - 1,
              endIndex: existing._row,
            },
          },
        },
      ],
    },
  });
}

/** Bulk upsert used by the CSV/Excel import flow. Creates new rows or updates existing ones by EMP NO. */
export async function upsertEmployees(records) {
  const existingAll = await getAllEmployees();
  const existingByEmpNo = new Map(existingAll.map((e) => [e.empNo, e]));
  const sheets = await getSheetsClient();

  const toAppend = [];
  const updates = [];

  for (const record of records) {
    const existing = existingByEmpNo.get(record.empNo);
    if (existing) {
      updates.push({
        range: `${QUOTED_SHEET_NAME}!A${existing._row}:${colLetter(COLUMNS.length)}${existing._row}`,
        values: [objectToRowArray(record)],
      });
    } else {
      toAppend.push(objectToRowArray(record));
    }
  }

  if (updates.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: "USER_ENTERED", data: updates },
    });
  }
  if (toAppend.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE_ALL,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: toAppend },
    });
  }

  return { created: toAppend.length, updated: updates.length };
}

function colLetter(n) {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
