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
- The approval queue is org-wide for `manager`/`hr_manager`/`admin` rather
  than scoped to "my direct reports," matching the brief's wording. The
  `managerEmpNo` field is captured on the leave profile if you want to add
  that filtering later.
- The employee's own profile view intentionally hides salary/bank details —
  it only shows name, EMP No, designation, cost centre, NIC, and EPF no.
