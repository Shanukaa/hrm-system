import { Router } from "express";
import { getAllUsersRaw, createUser, updateUser, deleteUser, toPublicUser } from "../services/userService.js";
import { addLog } from "../services/logService.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { ROLES } from "../config/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("users", "view"), async (req, res, next) => {
  try {
    const users = await getAllUsersRaw();
    res.json(users.map(toPublicUser));
  } catch (err) {
    next(err);
  }
});

router.get("/roles", (req, res) => {
  res.json(ROLES);
});

router.post("/", requirePermission("users", "create"), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await createUser({ name, email, password, role, createdBy: req.user.email });
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "user_created",
      details: `Created ${role} account for ${email}`,
      ip: req.ip,
    });
    res.status(201).json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("users", "edit"), async (req, res, next) => {
  try {
    const updated = await updateUser(req.params.id, req.body);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "user_updated",
      details: `Updated user ${updated.email}`,
      ip: req.ip,
    });
    res.json(toPublicUser(updated));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("users", "delete"), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "You can't delete your own account while logged in as it" });
    }
    await deleteUser(req.params.id);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "user_deleted",
      details: `Deleted user id ${req.params.id}`,
      ip: req.ip,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
