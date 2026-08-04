import { Router } from "express";
import { getLogs } from "../services/logService.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requirePermission("logs", "view"), async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 500;
    const logs = await getLogs({ limit });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
