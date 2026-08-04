import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

export const USERS_SHEET_NAME = process.env.USERS_SHEET_NAME || "Users";
export const LOGS_SHEET_NAME = process.env.LOGS_SHEET_NAME || "Logs";

export const BOOTSTRAP_ADMIN_NAME = process.env.BOOTSTRAP_ADMIN_NAME || "Admin";
export const BOOTSTRAP_ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || "";
export const BOOTSTRAP_ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";

// The three account types this system supports.
export const ROLES = ["admin", "hr_manager", "hr_executive"];

export const ROLE_LABELS = {
  admin: "Admin",
  hr_manager: "HR Manager",
  hr_executive: "HR Executive",
};

/**
 * Single source of truth for what each role can do. Adjust here to change
 * permissions anywhere in the app — routes and the frontend both read from
 * (a copy of) this shape rather than hardcoding role checks all over.
 */
export const PERMISSIONS = {
  admin: {
    employees: { view: true, create: true, edit: true, delete: true },
    import: true,
    payslips: true,
    users: { view: true, create: true, edit: true, delete: true },
    logs: true,
  },
  hr_manager: {
    employees: { view: true, create: true, edit: true, delete: true },
    import: true,
    payslips: true,
    users: { view: false, create: false, edit: false, delete: false },
    logs: true,
  },
  hr_executive: {
    employees: { view: true, create: true, edit: true, delete: false },
    import: false,
    payslips: true,
    users: { view: false, create: false, edit: false, delete: false },
    logs: false,
  },
};

export function can(role, area, action) {
  const areaPerms = PERMISSIONS[role]?.[area];
  if (typeof areaPerms === "boolean") return areaPerms;
  if (!areaPerms) return false;
  return !!areaPerms[action];
}
