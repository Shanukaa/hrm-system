import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { getUserByEmail, isLocked, recordFailedLogin, resetFailedLogins } from "../services/userService.js";
import { addLog } from "../services/logService.js";
import { requireAuth } from "../middleware/auth.js";
import { JWT_SECRET, JWT_EXPIRES_IN, parseDurationMs } from "../config/auth.js";

const router = Router();

// Throttles login attempts by IP, independent of the per-account lockout in
// userService — this covers the "many accounts, one attacker" case that
// per-account lockout alone doesn't.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts from this network. Please wait a few minutes and try again." },
});

const isProduction = process.env.NODE_ENV === "production";

// When the frontend and backend are on different domains (e.g. Netlify +
// Render), the browser treats every XHR/fetch as cross-site and silently
// drops SameSite=Lax cookies. SameSite=None + Secure is the correct fix;
// Secure is enforced by the browser for None anyway, and both Netlify and
// Render serve over HTTPS, so this is safe in production.
// In local dev (same-origin localhost) we keep Lax so you don't need HTTPS.
const isCrossOrigin = isProduction && !!process.env.CORS_ORIGIN &&
  !process.env.CORS_ORIGIN.includes("localhost");

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isCrossOrigin ? "none" : "lax",
    maxAge: parseDurationMs(JWT_EXPIRES_IN),
    path: "/",
  };
}

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await getUserByEmail(email);

    if (user && isLocked(user)) {
      await addLog({
        userEmail: email,
        userRole: "",
        action: "login_blocked",
        details: "account temporarily locked after repeated failed attempts",
        ip: req.ip,
      });
      return res.status(423).json({
        error: "This account is temporarily locked after several failed attempts. Try again in a few minutes.",
      });
    }

    const valid = user && user.active && (await bcrypt.compare(password, user.passwordHash));

    if (!valid) {
      if (user) await recordFailedLogin(email);
      await addLog({
        userEmail: email,
        userRole: "",
        action: "login_failed",
        details: user ? (user.active ? "wrong password" : "account inactive") : "unknown email",
        ip: req.ip,
      });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await resetFailedLogins(user.id);

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, empNo: user.empNo || null };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    await addLog({ userEmail: user.email, userRole: user.role, action: "login", details: "", ip: req.ip });

    // Set the httpOnly cookie for browsers that support cross-site cookies
    // (Chrome/Firefox with SameSite=None). Also include the token in the
    // response body so Safari/iOS — which blocks third-party cookies via ITP
    // — can store it and send it as an Authorization header instead.
    res.cookie("token", token, cookieOptions());
    res.json({ user: payload, token });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await addLog({ userEmail: req.user.email, userRole: req.user.role, action: "logout", details: "", ip: req.ip });
    res.clearCookie("token", { ...cookieOptions(), maxAge: undefined });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
