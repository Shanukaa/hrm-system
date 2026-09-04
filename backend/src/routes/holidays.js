import { Router } from "express";
import { getAllHolidays, createHoliday, deleteHoliday } from "../services/holidayService.js";
import { addLog } from "../services/logService.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Everyone can see the holiday list — it affects how many leave days their
// requests count as, so it's useful for any employee to be able to check it.
router.get("/", async (req, res, next) => {
  try {
    res.json(await getAllHolidays());
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (!["admin", "hr_manager"].includes(req.user.role)) {
      return res.status(403).json({ error: "Only an admin or HR manager can manage the holiday calendar" });
    }
    const holiday = await createHoliday(req.body, req.user.email);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "holiday_added",
      details: `Added public holiday ${holiday.date} (${holiday.name})`,
      ip: req.ip,
    });
    res.status(201).json(holiday);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!["admin", "hr_manager"].includes(req.user.role)) {
      return res.status(403).json({ error: "Only an admin or HR manager can manage the holiday calendar" });
    }
    await deleteHoliday(req.params.id);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "holiday_removed",
      details: `Removed public holiday #${req.params.id}`,
      ip: req.ip,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
