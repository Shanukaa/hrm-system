# Leave Management — What's New

This adds a full employee self-service leave portal on top of the existing
payroll system. Nothing about payroll, payslips, or employee records was
changed — this is purely additive.

## New roles

Two new login roles, alongside the existing `admin` / `hr_manager` / `hr_executive`:

- **`employee`** — logs in to their own dashboard: profile, leave balance,
  request form, and request history/notifications.
- **`manager`** — logs in to a leave-approval queue (same screen `admin` and
  `hr_manager` see at "Leave Requests").

Both must be **linked to a payroll employee record** via EMP NO when the
account is created (Users page → pick a role → pick the employee from the
dropdown). This is how the system knows whose leave balance to show, and it's
how the employee's name/EMP No appear on their submitted requests.

## The leave policy (as implemented)

| Situation | Allowance |
|---|---|
| Probation employee | 4 leaves / calendar month |
| Permanent, under 365 days since join date | 4 leaves / calendar month |
| Permanent, 365+ days since join date | 6 leaves / calendar month **(fallback, see below)** |
| Permanent, 365+ days, **and** HR has entered an annual allocation | An annual pool (default suggestion: 14 days), renewing every 365 days from their join-date anniversary |

In other words: once someone passes their one-year mark as a permanent
employee, the system keeps giving them 6/month automatically *until* HR or
Admin explicitly goes into that employee's record and enters their annual
leave days (Employees → edit employee → "Leave Profile" section → Annual
leave allocation). The moment that's set, they switch to the annual pool.
This was the most literal, unambiguous reading of the brief — if you'd
rather the switchover happen automatically without HR's manual step, or want
different numbers, everything lives in one place:
`backend/src/services/leaveService.js`, top of the file, `LEAVE_POLICY`.

**Working-day counting:** a leave request's day count skips Sundays only
(6-day work week), configurable via `NON_WORKING_WEEKDAYS` in the same file.

## What happens when leave runs out

- The employee dashboard shows a live balance (Entitled / Used / Remaining /
  Pending) and a clear warning banner once remaining leave hits zero.
- Employees can still submit a request past their balance — nothing blocks
  submission. At **approval time**, the system automatically works out how
  many of the requested days are still covered by balance (`paidDays`) and
  how many aren't (`noPayDays`), and stores both on the request so payroll
  has a clean record of no-pay days.

## The approval flow

1. Employee submits a request from their dashboard (dates + reason).
2. It appears in the **Leave Requests** queue for `manager`, `hr_manager`,
   and `admin` — all three see the same organisation-wide queue (not just a
   manager's direct reports), per how the requirements described it.
3. Approve → employee sees "Your leave is confirmed" plus the paid/no-pay
   day split.
4. Reject → a reason is *required*; the employee sees the rejection and the
   reason on their dashboard.
5. These show up as dismissible notification banners on the employee's
   dashboard until they acknowledge them.

## Mobile responsiveness

The sidebar now collapses into a hamburger + slide-out drawer below the `lg`
breakpoint, and the employee dashboard / leave approval screens use
stacked-card layouts on small screens instead of wide tables. This was the
one part of the original app that wasn't mobile-friendly, so it needed
reworking to satisfy "employee portal should be mobile responsive."

## Database changes

All handled automatically on server startup (same pattern the app already
used for its other tables) — nothing to run by hand:

- `users` table gets a new nullable `empNo` column.
- Two new tables: `employee_leave_profile` (join date, employment type,
  manager, annual leave allocation) and `leave_requests` (every request and
  its decision history).

## Setting it up after you deploy this

1. Deploy as normal (env vars are unchanged — same `DB_*`, `JWT_SECRET`, etc).
2. Log in as an existing `admin`/`hr_manager`.
3. For each employee who should get self-service access:
   - Open their record → Edit → fill in the **Leave Profile** section
     (join date, probation/permanent, optionally their manager's EMP No).
   - Go to **Users** → Add User → role `employee` (or `manager` if they'll
     be approving leave) → pick their EMP No → set them a password.
4. That person can now log in and use their dashboard.

## Known simplifications worth knowing about

- There's a single leave "pool" per employee — no separate categories like
  medical vs. casual leave. Adding that later just means adding a
  `leaveType` column to `leave_requests` and a per-type quota if you need it.
- The approval queue is org-wide for `hr_manager`/`admin` rather than scoped
  — matching the brief's original wording for those two roles. A `manager`'s
  queue (on their own dashboard, "Department" tab) *is* scoped to their
  department's employees.
- The employee's own profile view intentionally hides salary/bank details —
  it only shows name, EMP No, designation, department, cost centre, NIC,
  EPF no, join date, employment type, and date of birth.

---

# Round 2 — Departments, manager self-leave, calendars, capacity limits, notifications

Everything below was added on top of round 1 and is, again, purely additive.

## 1. Departments

New **Departments** page (Admin/HR Manager only, in the sidebar) with a card
per department: name, assigned manager, headcount, and a max-simultaneous-
leave setting. Create/update/delete is restricted to `admin` and
`hr_manager` — this is enforced both in the UI and on the backend
(`departments.manage` permission).

Assigning an employee to a department happens on their **Leave Profile**
(Employees → edit → Leave Profile section) — that's also where their
department's manager becomes "their" manager for leave purposes.

## 2. Managers can request their own leave

The `manager` role's dashboard has a **Request Leave** tab exactly like an
employee's — a manager applies to whoever reviews the org-wide queue
(`hr_manager`/`admin`) the same way any employee's request lands with their
department manager. (Permission-wise: `manager` now has both
`leaves.request` and `leaves.approve`.)

## 3. Calendars

Every dashboard (employee and manager) has a **Calendar** tab:

- **Employee**: a month calendar with a colored bar on each day showing
  already-approved (green), pending (amber), or rejected (red) leave —
  covers "already got leaves, upcoming leaves, and rejected leaves."
- **Manager**: their own leave calendar (same as above) *plus* a **Team
  Availability** calendar underneath, showing per-day how many of their
  department's employees are available vs. on approved leave, with a
  click-through list of who's out on a given day.
- HR Manager/Admin get the same team-availability calendar from the
  **Leave Requests** page, with a department picker (or "All departments").

## 4. Department leave capacity

Each department has an optional **max concurrent leave** setting (managers
edit their own from the Department tab; HR/Admin can set any department's
from the Departments page). Nothing is *blocked* by this — matching how the
rest of the leave system already works (warn, don't stop):

- When an employee submits a request that would push a day over the limit,
  they get an in-page popup ("On [date], N people would be on leave — above
  your department's max of M").
- When a manager/HR approves a request that does the same, they get the
  equivalent popup at approval time.

## 5 & 6. Dashboard navigation

Both self-service dashboards are now a single page with a tab bar (works
identically on mobile — the tab bar scrolls horizontally):

- **Employee**: Dashboard, My Profile, Calendar, Payslips, Leave Balance,
  Request Leave, My Leave Requests (last 3 months), Notifications.
- **Manager**: Dashboard, My Profile, Calendar, **Department** (approval
  queue + capacity setting — see note below), Payslips, Leave Balance,
  Request Leave, My Leave Requests (last 3 months), Notifications.

One deliberate addition beyond your listed nav items: a manager's **Department**
tab, holding their approval queue and capacity setting. Approving leave and
setting a department's cap are both explicitly manager duties elsewhere in
the brief, so they needed a home — I placed them together rather than
scattering them across the requested tabs.

Payslips: an employee/manager downloads *their own* payslip by month/year
(defaults to the current month, dropdowns to pick another) — the payslip
download endpoint now checks that the caller is either that employee
themself or has the `payslips` permission (previously this endpoint had **no
permission check at all**, so this was also a security fix, not just a
feature add).

## 7. Notifications

The Notifications tab (and the "Post Announcement" button that appears for
authorized roles) combines three things in one feed:

- **Management announcements** — posted by `admin`/`hr_manager`, visible
  company-wide.
- **Department announcements** — posted by a `manager`, visible only to
  their own department (they can't pick a different scope — it's locked to
  the department they manage).
- **Birthdays** — computed live from each employee's date of birth (set via
  Leave Profile), shown company-wide on the day and the day after, then
  gone automatically — no cleanup job needed, it's just a date comparison.
- Existing leave-decision notices ("your leave is confirmed" / rejection +
  reason) still show here too, dismissible per request as before.

## Database changes (round 2)

Again all automatic on startup:

- New `departments` table (name, managerEmpNo, maxConcurrentLeaves).
- `employee_leave_profile` gains `departmentId` and `birthDate` columns.
- New `announcements` table (title, body, scope, departmentId, author).

## Setting it up

1. Deploy as normal — same env vars as before.
2. Go to **Departments**, create your departments, assign a manager to each
   (pick from your employee list), and optionally set a max-concurrent-leave
   number.
3. On each employee's **Leave Profile**, assign their department and date of
   birth in addition to the join date / employment type from round 1.
4. Create the manager's login (Users → role `manager`, linked to their EMP
   No) the same way you'd create an `employee` login.

