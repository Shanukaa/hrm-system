import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getSheetsClient, SPREADSHEET_ID } from "../config/sheets.js";
import { ensureTabWithHeaders, colLetter } from "./sheetTabHelper.js";
import {
  USERS_SHEET_NAME,
  ROLES,
  BOOTSTRAP_ADMIN_NAME,
  BOOTSTRAP_ADMIN_EMAIL,
  BOOTSTRAP_ADMIN_PASSWORD,
} from "../config/auth.js";

// id | name | email | passwordHash | role | active | createdAt | createdBy
const HEADERS = ["id", "name", "email", "passwordHash", "role", "active", "createdAt", "createdBy"];
const RANGE_ALL = `${USERS_SHEET_NAME}!A2:${colLetter(HEADERS.length)}`;

export async function ensureUsersSheet() {
  await ensureTabWithHeaders(USERS_SHEET_NAME, HEADERS);
}

function rowToUser(row, i) {
  return {
    id: row[0] || "",
    name: row[1] || "",
    email: row[2] || "",
    passwordHash: row[3] || "",
    role: row[4] || "",
    active: row[5] !== "false",
    createdAt: row[6] || "",
    createdBy: row[7] || "",
    _row: i + 2,
  };
}

function userRowArray(u) {
  return [u.id, u.name, u.email, u.passwordHash, u.role, String(u.active), u.createdAt, u.createdBy];
}

/** Returns all users (including passwordHash — internal use only, never send this to the client as-is). */
export async function getAllUsersRaw() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RANGE_ALL });
  const rows = res.data.values || [];
  return rows
    .filter((r) => r.some((cell) => cell !== undefined && cell !== ""))
    .map(rowToUser);
}

/** Strips sensitive fields for anything sent to the frontend. */
export function toPublicUser(u) {
  const { passwordHash, _row, ...rest } = u;
  return rest;
}

export async function getUserByEmail(email) {
  const all = await getAllUsersRaw();
  return all.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

export async function getUserById(id) {
  const all = await getAllUsersRaw();
  return all.find((u) => u.id === id) || null;
}

export async function createUser({ name, email, password, role, createdBy }) {
  if (!name || !email || !password || !role) {
    const err = new Error("name, email, password and role are all required");
    err.status = 400;
    throw err;
  }
  if (!ROLES.includes(role)) {
    const err = new Error(`role must be one of: ${ROLES.join(", ")}`);
    err.status = 400;
    throw err;
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    const err = new Error(`A user with email "${email}" already exists`);
    err.status = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    role,
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: createdBy || "",
  };
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE_ALL,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [userRowArray(user)] },
  });
  return user;
}

export async function updateUser(id, data) {
  const existing = await getUserById(id);
  if (!existing) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  if (data.role && !ROLES.includes(data.role)) {
    const err = new Error(`role must be one of: ${ROLES.join(", ")}`);
    err.status = 400;
    throw err;
  }
  const updated = { ...existing };
  if (data.name !== undefined) updated.name = data.name;
  if (data.role !== undefined) updated.role = data.role;
  if (data.active !== undefined) updated.active = !!data.active;
  if (data.password) updated.passwordHash = await bcrypt.hash(data.password, 10);

  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${USERS_SHEET_NAME}!A${existing._row}:${colLetter(HEADERS.length)}${existing._row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [userRowArray(updated)] },
  });
  return updated;
}

export async function deleteUser(id) {
  const existing = await getUserById(id);
  if (!existing) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find((s) => s.properties.title === USERS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet tab "${USERS_SHEET_NAME}" not found`);

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

/**
 * If no users exist yet, creates one admin account from the
 * BOOTSTRAP_ADMIN_* env vars so there's a way to log in for the first time.
 * Safe to call on every startup — it's a no-op once any user exists.
 */
export async function bootstrapAdminIfNeeded() {
  const all = await getAllUsersRaw();
  if (all.length > 0) return;

  if (!BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) {
    console.warn(
      "No users exist yet and BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD are not set — " +
        "set them in your environment and restart to create the first admin account."
    );
    return;
  }

  await createUser({
    name: BOOTSTRAP_ADMIN_NAME,
    email: BOOTSTRAP_ADMIN_EMAIL,
    password: BOOTSTRAP_ADMIN_PASSWORD,
    role: "admin",
    createdBy: "system-bootstrap",
  });
  console.log(`Created initial admin account for ${BOOTSTRAP_ADMIN_EMAIL}. Log in and change the password.`);
}
