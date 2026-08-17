import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

/**
 * Connection pool to your MySQL database. Works with any MySQL host —
 * Railway's MySQL plugin, PlanetScale, a self-hosted instance, etc.
 *
 * Required env vars: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 * Optional: DB_SSL=true if your host requires an SSL connection (some
 * hosts use certificates that Node won't recognize by default, so this
 * uses rejectUnauthorized: false rather than failing the connection).
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export default pool;
