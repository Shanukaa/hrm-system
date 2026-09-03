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

---

# Round 3 — Payslip availability, pagination, design polish, birthdays for everyone

## Payslips: available list instead of free typing

Self-service payslips (employee/manager dashboard) now show an **available
payslips list** — every month from the employee's join date (or a sensible
fallback if that isn't set) up to the current month, never into the future,
searchable by typing a month or year. There's no free-text period field
anymore — you browse and download, you don't type a date and hope it's
valid.

On the admin **Payslips** (Generate PDF) page, the pay period is now picked
from a calendar-style month/year popover — click, don't type — and it also
won't let you pick a future month. The "Detailed" payslip format has been
removed entirely; both the self-service and admin pages now always generate
the simple, bank-advice-style PDF.

## Pagination everywhere

Every page with a data list (Dashboard's employee table, Users, Activity
Log, Departments, the leave approval queue, "My Payslips", "My Leave
Requests") now paginates instead of rendering the full list at once. This is
client-side pagination — the full list is still fetched once, then sliced
into pages — which keeps things simple and fast for the list sizes this app
deals with. If any of these lists grows into the thousands, that's the point
to switch to server-side (limit/offset) pagination in the API.

## Vertical navigation for self-service dashboards

The employee/manager dashboards' tab bar is now a vertical rail on desktop
(matching how most HR portals present these sections), collapsing to a
horizontal scrollable strip on narrow screens where a vertical rail would
eat too much width. **Leave Balance** and **Request Leave** are now a single
combined tab — you see your balance right above the request form instead of
switching between two separate screens.

## Every employee's birthday now shows

Previously, birthdays only showed for employees who already had a full
**Leave Profile** row (department, join date, etc.) — which meant anyone HR
hadn't gotten around to setting up for leave was silently invisible to the
birthday notification, even if their birthday was the only thing anyone
wanted recorded. Date of birth is now a standalone field on the main
**Employee** form (visible to any role that can edit employees — admin, HR
manager, and HR executive), captured the same time you create or edit an
employee, completely independent of whether their leave policy has been set
up. A new lightweight `PUT /api/employees/:empNo/birthdate` endpoint backs
this — it doesn't require the fuller leave-profile permission, so HR
executives (who can't touch leave policy) can still record birthdays.

---

# Round 4 — Security hardening

## Session tokens moved out of localStorage

Login no longer returns the JWT in the response body. Instead, the backend
sets it as an **httpOnly cookie** (`Set-Cookie: token=...; HttpOnly;
SameSite=Lax; Secure` in production). Client-side JavaScript — including any
XSS payload that might slip in from a dependency or a bug — can no longer
read the session token out of `localStorage`, because it's never stored
there anymore. The frontend now sends `withCredentials: true` on every
request instead of manually attaching an `Authorization` header.

For scripts, curl, or any non-browser API access, the old `Authorization:
Bearer <token>` header still works as a fallback — `requireAuth` checks the
cookie first, then falls back to the header. Nothing existing breaks.

## Login is rate-limited and accounts can lock

- **Per-IP rate limit** on `POST /api/auth/login`: 20 attempts per 15
  minutes, regardless of which account is being tried. This is on top of,
  not instead of, the account-level lockout below — it covers the case of
  someone spraying many different email addresses from one source.
- **Per-account lockout**: after 5 consecutive failed logins, that specific
  account is locked for 15 minutes — even a subsequently-correct password
  is rejected until the lockout clears. This resets automatically; there's
  no manual "unlock" step needed, and no account can be locked out
  permanently by an attacker.

## Password policy

Any password set anywhere in the app (new user, password change, and the
`BOOTSTRAP_ADMIN_PASSWORD` env var used to create the very first admin
account) must be at least 8 characters and include at least one letter and
one number. If `BOOTSTRAP_ADMIN_PASSWORD` doesn't meet this, the server logs
a clear warning telling you to fix the env var and skips creating that
account, rather than creating a weak one silently.

## The server no longer starts in a broken state

Previously, if the database was unreachable at startup (wrong credentials,
DB not up yet, etc.), the server logged a warning and **kept running
anyway** — meaning it would accept connections and 500 on every request
while looking "up" to any uptime check. It now fails fast: on a database
setup failure, it logs a clear fatal error and exits with a non-zero code,
so your process manager or container platform (Docker, Railway, PM2, etc.)
sees the failure and can restart or alert on it instead of silently serving
a broken app.

## What's next, and what needs a decision from you first

The remaining items from the drawbacks list — the payslip
historical-snapshot problem, leave request overlap/cancellation, employee
delete cascading, configurable leave policy, a public holiday calendar,
server-side pagination, PII encryption at rest, and automated tests — are
still open. A few other items on that list need something from your side
before they can be built rather than just more engineering time:

- **Self-service "forgot password"** needs an SMTP provider (or a
  transactional email service like SES/Postmark) to actually deliver a
  reset link — there's currently no email sending capability in this app at
  all. Tell me what you have access to and I'll wire it in.
- **Error monitoring** (Sentry or similar) needs an account/DSN from you.
- **Encryption-at-rest for PII** (NIC, bank account numbers) needs a
  decision on where the encryption key lives in production — an env var is
  fine for now but isn't a long-term key management story.

Let me know which of the remaining items to tackle next.

---

# Round 5 — Payroll correctness: locked payslip snapshots

## The bug

Payslips were generated from the employee's *current* salary record every
time — there was no historical record of what a payslip actually showed
when it was issued. If someone got a raise today, downloading their payslip
for three months ago would silently show today's (wrong) salary for that
past period. This is the kind of bug that looks fine in every manual test
(you always test with today's data) and only surfaces once someone
compares a printed payslip against what the system now shows for the same
month.

## The fix: snapshot-on-first-generate

There's a new `payroll_snapshots` table. The first time anyone downloads a
payslip for a given employee and pay period (either from the self-service
"My Payslips" list or the admin "Generate PDF" page), the system takes a
full snapshot of that employee's record at that exact moment and stores it,
keyed by employee + year + month. Every subsequent download for that same
period — no matter what happens to the employee's salary, allowances, or
bank details afterward — returns exactly what was captured in that
snapshot. Bulk zip downloads go through the identical snapshot logic per
employee.

Verified end-to-end: created an employee at Rs. 50,000 basic salary,
generated their August payslip, gave them a raise to Rs. 80,000, and
re-downloaded the August payslip — it still correctly showed Rs. 50,000.
Generating September (a period never touched before the raise) correctly
showed Rs. 80,000.

## Correcting a mistake

Sometimes the first-ever generation genuinely was wrong (a data entry
error caught after the fact). Admin and HR Manager — not HR Executive, this
is intentionally more restricted than ordinary payslip access — can
**Unlock** a specific employee's payslip for a specific period from the
Payslips page. The next download for that period re-locks against whatever
the employee's data looks like at that point. Verified this is correctly
blocked for `hr_executive` (403) and correctly works for `admin`.

## What this doesn't cover

This locks the *figures* (salary, allowances, deductions, EPF/ETF, bank
details — everything on the employee record) at generation time. It does
not give you a browsable payroll history UI (e.g. "show me every payslip
ever generated across the company") — that would be a reasonable next step
if you want it, built on top of the same `payroll_snapshots` table this
round added.




---

# Round 6 — Data integrity

## Leave requests can no longer overlap themselves

An employee could previously submit multiple requests covering the same
dates — nothing stopped it. Submitting a new request now checks it against
that employee's own pending and approved requests; an overlap is rejected
(409) with a clear message naming the clashing dates and its status. A
rejected or withdrawn request doesn't block anything, only pending/approved
ones do.

## Employees can withdraw a pending request

New "Withdraw" action on **My Leave Requests** (self-service dashboards),
available only while a request is still `pending`. Once a manager/HR has
made a decision, it's part of the record — it can no longer be pulled back
by the employee. Withdrawing sets its status to `cancelled` (a new status
alongside pending/approved/rejected, styled consistently everywhere a
status badge shows up) and immediately frees up those dates for a new
request. Verified: trying to withdraw an already-approved request correctly
returns 409 with a clear explanation.

## Deleting an employee no longer leaves orphaned data behind

Previously a hard `DELETE` on the employee record left a trail behind it:
their leave profile pointing at nothing, a department still listing them as
manager, and — since self-service logins now exist — a login account tied
to a record that no longer existed. Deleting an employee now, in order:

1. **Cancels any of their still-pending leave requests**, with a note
   explaining why, so nothing sits invisibly in a queue forever.
2. **Unassigns them as manager** from any department that pointed at them.
3. **Deactivates and unlinks any login account** tied to their EMP No —
   deactivated rather than deleted, so the activity log (which references
   accounts by email) still resolves correctly. A deactivated account can
   no longer log in.
4. **Removes their leave profile.**
5. Only then deletes the employee record itself.

Historical records — past leave request history, and any locked payroll
snapshots from Round 5 — are deliberately left alone. Deleting someone
shouldn't erase what actually happened while they were employed.

Verified end-to-end: deleted an employee who was both a department's
manager and had a `manager`-role login and a pending leave request — after
deletion, the department's manager field was cleared, the login account was
confirmed deactivated (and a login attempt with its password afterward
correctly failed), and the pending request was confirmed cancelled with an
explanatory note rather than left stranded in the approval queue.
