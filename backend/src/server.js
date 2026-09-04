import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import logsRouter from "./routes/logs.js";
import employeesRouter from "./routes/employees.js";
import importRouter from "./routes/import.js";
import payslipsRouter from "./routes/payslips.js";
import dashboardRouter from "./routes/dashboard.js";
import leavesRouter from "./routes/leaves.js";
import departmentsRouter from "./routes/departments.js";
import notificationsRouter from "./routes/notifications.js";
import holidaysRouter from "./routes/holidays.js";
import { ensureEmployeesTable } from "./services/employeeService.js";
import { ensureUsersTable, bootstrapAdminIfNeeded } from "./services/userService.js";
import { ensureLogsTable } from "./services/logService.js";
import { ensureLeaveTables, ensureLeavePolicyTable } from "./services/leaveService.js";
import { ensurePublicHolidaysTable } from "./services/holidayService.js";
import { ensureDepartmentsTable } from "./services/departmentService.js";
import { ensureAnnouncementsTable } from "./services/announcementService.js";
import { ensurePayrollSnapshotsTable } from "./services/payrollSnapshotService.js";
import { runMigrations } from "./services/migrationService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",");

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/logs", logsRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/import", importRouter);
app.use("/api/payslips", payslipsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/leaves", leavesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/holidays", holidaysRouter);

// Central error handler. Logs a structured line (easy to pipe into any log
// aggregator — CloudWatch, Datadog, a plain `docker logs`, whatever you
// use) rather than a bare stack trace, and gives 500s a generic message so
// internal error details never leak to the client while still being fully
// visible server-side.
//
// To wire up an error-monitoring service (Sentry, Bugsnag, etc.), this is
// the one place to add it: call your SDK's capture function here before
// the response is sent. Left as a no-op by default since none is
// configured, but the hook point already exists.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(
    JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      status,
      method: req.method,
      path: req.originalUrl,
      userEmail: req.user?.email,
      message: err.message,
      stack: status >= 500 ? err.stack : undefined,
    })
  );
  res.status(status).json({ error: status >= 500 ? "Something went wrong on our end. Please try again." : err.message });
});

async function start() {
  try {
    await ensureEmployeesTable();
    await ensureUsersTable();
    await ensureLogsTable();
    await ensureDepartmentsTable();
    await ensureLeaveTables();
    await ensureLeavePolicyTable();
    await ensurePublicHolidaysTable();
    await ensureAnnouncementsTable();
    await ensurePayrollSnapshotsTable();
    await runMigrations();
    await bootstrapAdminIfNeeded();
  } catch (err) {
    // Fail fast rather than silently serving a broken app: if the database
    // isn't reachable or the schema can't be set up, there's nothing this
    // process can usefully do. Exiting with a non-zero code lets your
    // process manager / container orchestrator (Docker, Railway, PM2, etc.)
    // see the failure and restart or alert on it, instead of the app
    // looking "up" while every request actually 500s.
    console.error(
      "FATAL: could not set up the database on startup. " +
        "Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME and that the database is reachable.\n" +
        err.message
    );
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`HRM Payroll backend running on http://localhost:${PORT}`);
  });
}

start();
