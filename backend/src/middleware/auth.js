import jwt from "jsonwebtoken";
import { JWT_SECRET, can } from "../config/auth.js";

/** Verifies the Bearer token and attaches { id, name, email, role } to req.user. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid, please log in again" });
  }
}

/** Use after requireAuth. Rejects unless req.user.role is one of the given roles. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that" });
    }
    next();
  };
}

/** Use after requireAuth. Rejects unless can(role, area, action) is true. */
export function requirePermission(area, action) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!can(req.user.role, area, action)) {
      return res.status(403).json({ error: "You don't have permission to do that" });
    }
    next();
  };
}
