import { Router } from "express";
import {
  createAnnouncement,
  getVisibleAnnouncements,
  getAnnouncementById,
  deleteAnnouncement,
} from "../services/announcementService.js";
import { getRecentAndUpcomingBirthdays, getLeaveProfile, getUnseenDecisions } from "../services/leaveService.js";
import { getDepartmentManagedBy } from "../services/departmentService.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { can } from "../config/auth.js";

const router = Router();
router.use(requireAuth);

/** Works out which department (if any) is relevant to this viewer, for scoping announcements. */
async function resolveViewerDepartmentId(user) {
  if (!user.empNo) return null;
  if (user.role === "manager") {
    const dept = await getDepartmentManagedBy(user.empNo);
    if (dept) return dept.id;
  }
  const profile = await getLeaveProfile(user.empNo);
  return profile?.departmentId || null;
}

// --- Combined feed: announcements + birthdays + (for employee/manager) leave decisions ---
router.get("/", async (req, res, next) => {
  try {
    const departmentId = await resolveViewerDepartmentId(req.user);
    const [announcements, birthdays] = await Promise.all([
      getVisibleAnnouncements(departmentId),
      getRecentAndUpcomingBirthdays(),
    ]);

    let leaveDecisions = [];
    if (can(req.user.role, "leaves", "request") && req.user.empNo) {
      leaveDecisions = await getUnseenDecisions(req.user.empNo);
    }

    res.json({ announcements, birthdays, leaveDecisions });
  } catch (err) {
    next(err);
  }
});

router.post("/announcements", async (req, res, next) => {
  try {
    const { title, body, scope, departmentId } = req.body;
    if (scope === "global" && !can(req.user.role, "announcements", "createGlobal")) {
      return res.status(403).json({ error: "You don't have permission to post a company-wide announcement" });
    }
    if (scope === "department" && !can(req.user.role, "announcements", "createDepartment")) {
      return res.status(403).json({ error: "You don't have permission to post a department announcement" });
    }

    let effectiveDepartmentId = departmentId ? Number(departmentId) : null;
    if (req.user.role === "manager") {
      // Managers may only post to the department they manage, regardless of what's sent.
      const dept = await getDepartmentManagedBy(req.user.empNo);
      if (!dept) return res.status(403).json({ error: "You aren't set as a manager of any department" });
      effectiveDepartmentId = dept.id;
    }

    const announcement = await createAnnouncement({
      title,
      body,
      scope,
      departmentId: effectiveDepartmentId,
      createdBy: req.user.email,
      createdByName: req.user.name,
    });
    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
});

router.delete("/announcements/:id", requirePermission("announcements", "view"), async (req, res, next) => {
  try {
    const announcement = await getAnnouncementById(req.params.id);
    if (!announcement) return res.status(404).json({ error: "Announcement not found" });
    const isOwner = announcement.createdBy === req.user.email;
    const isHrOrAdmin = can(req.user.role, "announcements", "manage");
    if (!isOwner && !isHrOrAdmin) {
      return res.status(403).json({ error: "You can only remove announcements you posted" });
    }
    await deleteAnnouncement(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
