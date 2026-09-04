import { Router } from "express";
import { getLogs, getLogsPaged } from "../services/logService.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requirePermission("logs", "view"), async (req, res, next) => {
  try {
    if (req.query.page) {
      const result = await getLogsPaged({
        page: parseInt(req.query.page, 10) || 1,
        pageSize: parseInt(req.query.pageSize, 10) || 20,
        search: req.query.search || "",
      });
      return res.json(result);
    }
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 500;
    const logs = await getLogs({ limit });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
