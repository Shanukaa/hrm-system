import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import logsRouter from "./routes/logs.js";
import employeesRouter from "./routes/employees.js";
import importRouter from "./routes/import.js";
import payslipsRouter from "./routes/payslips.js";
import dashboardRouter from "./routes/dashboard.js";
import { ensureHeaders } from "./services/sheetsService.js";
import { ensureUsersSheet, bootstrapAdminIfNeeded } from "./services/userService.js";
import { ensureLogsSheet } from "./services/logService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",");

app.use(cors({ origin: corsOrigins }));
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

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

async function start() {
  try {
    await ensureHeaders();
  } catch (err) {
    console.warn(
      "Warning: could not verify/create the header row automatically. " +
        "Check SPREADSHEET_ID, SHEET_NAME and that the sheet is shared with the service account. " +
        err.message
    );
  }

  try {
    await ensureUsersSheet();
    await ensureLogsSheet();
    await bootstrapAdminIfNeeded();
  } catch (err) {
    console.warn("Warning: could not set up the Users/Logs sheets automatically. " + err.message);
  }

  app.listen(PORT, () => {
    console.log(`HRM Payroll backend running on http://localhost:${PORT}`);
  });
}

start();
