import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail, toPublicUser } from "../services/userService.js";
import { addLog } from "../services/logService.js";
import { requireAuth } from "../middleware/auth.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/auth.js";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await getUserByEmail(email);
    const valid = user && user.active && (await bcrypt.compare(password, user.passwordHash));

    if (!valid) {
      await addLog({
        userEmail: email,
        userRole: "",
        action: "login_failed",
        details: user ? (user.active ? "wrong password" : "account inactive") : "unknown email",
        ip: req.ip,
      });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    await addLog({ userEmail: user.email, userRole: user.role, action: "login", details: "", ip: req.ip });

    res.json({ token, user: payload });
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
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
