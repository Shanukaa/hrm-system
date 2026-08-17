import crypto from "crypto";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import {
  ROLES,
  BOOTSTRAP_ADMIN_NAME,
  BOOTSTRAP_ADMIN_EMAIL,
  BOOTSTRAP_ADMIN_PASSWORD,
} from "../config/auth.js";

const TABLE = "users";

/** Creates the users table if it doesn't exist yet. Safe to call on every startup. */
export async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      passwordHash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      createdBy VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function normalizeRow(row) {
  return { ...row, active: !!row.active };
}

/** Returns all users (including passwordHash — internal use only, never send this to the client as-is). */
export async function getAllUsersRaw() {
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} ORDER BY createdAt`);
  return rows.map(normalizeRow);
}

/** Strips sensitive fields for anything sent to the frontend. */
export function toPublicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

export async function getUserByEmail(email) {
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE email = ? LIMIT 1`, [email]);
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export async function getUserById(id) {
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? normalizeRow(rows[0]) : null;
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
  await pool.query(
    `INSERT INTO ${TABLE} (id, name, email, passwordHash, role, active, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user.id, user.name, user.email, user.passwordHash, user.role, true, user.createdBy]
  );
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

  await pool.query(`UPDATE ${TABLE} SET name = ?, role = ?, active = ?, passwordHash = ? WHERE id = ?`, [
    updated.name,
    updated.role,
    updated.active,
    updated.passwordHash,
    id,
  ]);
  return updated;
}

export async function deleteUser(id) {
  const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  if (result.affectedRows === 0) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
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
