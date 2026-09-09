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

function cookieOptions() {
  return {
    httpOnly: true,
    // Frontend and backend are deployed as separate services on different
    // origins, so this cookie has to survive a cross-site fetch/XHR request
    // on every API call — not just a top-level page navigation. SameSite=Lax
    // (the previous setting) does NOT get sent on those cross-origin
    // fetch/XHR requests by real browsers (curl doesn't enforce this, which
    // is how this slipped through testing) — only SameSite=None does, and
    // that requires Secure. Secure cookies work over plain http://localhost
    // too (browsers special-case localhost as a secure context), so this
    // doesn't break local dev.
    secure: true,
    sameSite: "none",
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

    // The cookie is still set and remains the preferred mechanism — it
    // works transparently in most browsers. But Safari (iOS in particular)
    // fully blocks third-party cookies between different root domains
    // regardless of SameSite/Secure, which a split frontend+backend
    // deployment runs into. Returning the token here too lets the frontend
    // fall back to an Authorization header on browsers where the cookie
    // never gets stored, at the cost of the token being briefly readable
    // by JS (kept out of localStorage — see AuthContext — to limit how
    // long it persists if that's ever a concern).
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
