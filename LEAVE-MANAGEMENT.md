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

**Leave day counting:** every calendar day in a request counts as a leave
day — this company works all 7 days, so there's no weekly off day excluded.
(Configurable via `NON_WORKING_WEEKDAYS` in the same file, if that ever
changes — e.g. `[0]` for a 6-day week with Sunday off, or `[0, 6]` for a
standard Mon-Fri week.) Public holidays are still excluded separately — see
the Round 8 section below.

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

---

# Round 7 — Scale & operations

## Real server-side pagination

The Employees list (Dashboard), Activity Log, and Leave Approval Queue —
the three lists with no natural upper bound — now do real database-side
pagination (`LIMIT`/`OFFSET` with a `COUNT(*)` for the total) instead of
fetching everything and slicing it in the browser. Search is server-side
too, debounced on the frontend so it doesn't fire a request per keystroke.

This was done as **opt-in** pagination: call the same endpoints with no
`?page` param and you still get the full array back, exactly as before.
Every dropdown/picker elsewhere in the app (Users, Departments, Payslip
selection, etc.) that needs "every employee at once" keeps working
completely unchanged — only the three actual browsable list *pages*
switched over. Smaller, inherently-bounded lists (Users, Departments, "My
Leave Requests," "My Payslips") deliberately stayed on the simpler
client-side pagination from Round 4 — there's no benefit to the added
complexity at that scale.

The one tricky correctness case: a manager's leave-approval queue is scoped
to their department's employees via an `empNos` filter, applied *before*
pagination on the server now (previously it filtered client-side after the
fact, which doesn't work once the server itself decides what a "page" is).
Verified this handles the edge case of a manager whose department currently
has zero employees correctly — they see zero requests, not an accidental
fallback to the whole company's queue.

## Indexes, added through a real migration system

There's now a `schema_migrations` table and a small migration runner
(`services/migrationService.js`). Unlike the existing per-table
`ensureXTable()` functions (which handle initial creation and are
naturally safe to re-run), migrations are for changes — like adding an
index — that MySQL has no built-in "if not exists" shorthand for. Each
migration has a fixed id, runs at most once per database ever, and is
recorded permanently once applied. This round's migration adds the indexes
that make the new pagination queries above actually fast instead of doing
a full table scan on every page: `employees.employeeName`,
`logs.timestamp`, `logs.userEmail`, and a composite `(status, requestedAt)`
on `leave_requests`. Verified it ran and recorded itself correctly on a
fresh database.

New schema changes going forward should use this system rather than
another bare `ALTER TABLE ... try/catch`.

## Structured error logging, with a hook for real monitoring

The central error handler now logs a structured JSON line (method, path,
status, the user who made the request, and — only for actual 500s — a
stack trace) instead of a bare `console.error(err)`. This is easy to pipe
into whatever log aggregator you already use. 500-level responses to the
client now show a generic "something went wrong" message instead of the
raw error text, so internal details (a SQL error message, a stack frame)
never leak to the browser; everything below 500 — validation errors,
permission errors, and the like — is unaffected and still shows its
specific, useful message, since every one of those already sets its own
status code explicitly.

If/when you want real error monitoring (Sentry, Bugsnag, etc.), that
handler is the one place to wire it in — the hook point is there, just not
filled in, since it needs an account/DSN from you first.

## Automated tests

`npm test` in `backend/` now runs a real (if intentionally modest) test
suite — 22 tests using Node's built-in test runner, no new dependency
needed. Covers the leave policy engine (`countLeaveDays`, `computeStage`
across every employment stage), password strength validation, the JWT
duration parser, and the pay-period label parser — the pure,
business-logic-heavy functions where a regression would be easy to
introduce and hard to notice by eye. This isn't full integration or E2E
coverage (that would need a real database in CI), but it's a genuine
regression net for the trickiest calculations in the app, and a pattern to
extend as more pure logic gets added.

## Backup & restore

New `BACKUP.md` at the project root: how to back up with `mysqldump`, a
cron script, how to restore, and — the part that's usually skipped — how to
actually verify a backup works by restoring it somewhere throwaway. This
app doesn't (and can't, from inside the app itself) automate backups for
you; if you're on a managed database host, turning on their built-in
automated backups is almost always the right call over any of this.

## What's left from the original list

Two items remain: a **configurable leave policy** (the accrual numbers are
still hardcoded constants in `leaveService.js` rather than admin-editable)
and a **public holiday calendar** (leave day counting still only excludes
Sundays). Also still open from the security round: **PII encryption at
rest** for NIC/bank account numbers, which needs a decision from you on
where the encryption key lives in production before it's built. Let me know
which to tackle next.

---

# Round 8 — Configurable leave policy & public holiday calendar

## Leave policy is now admin-configurable, not hardcoded

New **Leave Settings** page (admin/hr_manager, in the sidebar) with a form
for the five numbers that drive the whole accrual system: probation
monthly quota, permanent-under-a-year monthly quota, permanent-over-a-year
fallback quota, the suggested default annual allocation, and the
qualifying-days threshold. These used to only be changeable by editing
`leaveService.js` and redeploying; now they're a database-backed setting
with an in-memory cache (so the hot path — computing every employee's
balance — doesn't hit the database on every request just to read five
numbers that change rarely).

Verified end-to-end: changed the probation monthly quota from 4 to 10,
confirmed an employee's live balance immediately reflected it, restarted
the backend process entirely, and confirmed the change was still there —
proving it's a real persisted setting, not just an in-memory value that
would reset on redeploy. Also confirmed `hr_executive` is correctly blocked
(403) from changing it — this is an org-wide policy change, not a
day-to-day HR action.

## Public holiday calendar

New section on the same **Leave Settings** page: add/remove public holidays
by date and name. Once added, that date no longer counts against anyone's
leave balance when a request spans it — handled exactly the same way
Sundays already were. Read access is open to everyone (an employee should
be able to see why their request came out shorter than they expected);
adding or removing holidays is admin/hr_manager only.

Verified precisely: created two otherwise-identical 7-day date ranges (each
containing exactly one Sunday), added a holiday inside only one of them,
and confirmed a 1-day difference in the day count between the two —
5 days vs 6 — isolating the holiday's effect exactly. Removed the holiday
and confirmed the count reverted to 6.

**Caught and fixed a real bug during this verification**: the `/preview`
endpoint initially crashed with a 500 (a missing import — `routes/leaves.js`
called a function it never imported from the new holiday service).
`node --check` doesn't catch this class of bug, since it's a valid-syntax
runtime reference error, not a parse error — it only surfaced once I
actually ran the endpoint live. Fixed and re-verified with a clean test run
afterward. This is the exact reason every round in this project gets a live
end-to-end test against a real database rather than stopping at a syntax
check and a build.

## Both changes kept the existing test suite intact

`computeStage` and `countLeaveDays` — the two pure functions the automated
test suite exercises most — both gained new optional parameters (`policy`
and `holidayDates` respectively) rather than being restructured, so every
one of the 22 existing tests kept passing unchanged. Added 3 more
specifically covering the new behavior (holiday exclusion, and a custom
policy override), for **25/25 passing**.

## What's left

One item remains from the original drawbacks list: **PII encryption at
rest** for NIC and bank account numbers. This is intentionally not started
yet — it needs a decision from you first on where the encryption key lives
in production (an environment variable is the simplest starting point, but
isn't a complete key-management story on its own: who can access it, how
it's rotated if it's ever exposed, and what happens to already-encrypted
data if it changes). Let me know how you'd like to handle that and I'll
build it around your answer rather than picking a default myself.

---

# Round 9 — Login fix: iPhone/Safari couldn't authenticate at all

## Two separate bugs, found in sequence

**Bug 1 (fixed first):** the session cookie was set with `SameSite=Lax`.
That's invisible to `curl`-based testing (curl doesn't enforce `SameSite`
at all), but real browsers don't send a `Lax` cookie on cross-origin
fetch/XHR calls — only on top-level page navigations. Since this app's
frontend and backend run as separate services, every API call after login
is exactly that kind of cross-origin request, so the cookie was silently
dropped on every request after the first. Fixed by switching to
`Secure; SameSite=None`, the correct combination for a cookie that has to
survive cross-origin XHR/fetch.

**Bug 2 (the actual iPhone-specific one):** that fix is not sufficient for
Safari. Since Safari 13.1, iOS/macOS Safari **fully blocks third-party
cookies by default** — a separate, stricter policy than `SameSite`, and one
that `SameSite=None; Secure` cannot work around when the frontend and
backend are on genuinely different root domains (not subdomains of the
same one). Chrome and Firefox are more permissive here, which is why this
surfaced as "works on desktop, fails on iPhone."

## The fix: an Authorization-header fallback

The real, most robust fix is putting the frontend and backend on
subdomains of the same root domain (e.g. `app.yourco.com` +
`api.yourco.com`), which makes the cookie first-party everywhere, Safari
included, with no code changes needed. That requires DNS/hosting changes
on your end, so — as agreed — here's the code-level fix that works
regardless of domain setup, with a tradeoff spelled out rather than
applied silently:

- Login now returns the JWT in the response body again, alongside still
  setting the httpOnly cookie.
- The frontend stores that token in `sessionStorage` (cleared when the tab
  closes — deliberately not `localStorage`, to limit how long it persists)
  and attaches it as an `Authorization: Bearer` header on every request.
- The backend already checked for a Bearer header as a fallback before the
  cookie (built in during the original security hardening round, originally
  just for script/API access) — so no backend authentication logic needed
  to change, only the login response and the frontend's request handling.

**The tradeoff:** the token is now briefly present in JS-accessible storage
again, which is exactly what moving to an httpOnly-only cookie was meant to
close off. This re-opens a narrower version of that exposure — an XSS bug
elsewhere in the app could read it from `sessionStorage` during that
session. It's real, and worth revisiting via the same-domain approach above
if/when that's feasible, rather than treating this as a permanent
resting state.

## Verified

Simulated exactly what a cookie-blocking Safari does — called `/auth/me`
and a real protected endpoint (`/api/employees`) with **zero cookies sent
at all**, only the `Authorization: Bearer` header — and confirmed both
succeed. Confirmed requests with neither a cookie nor a header are still
correctly rejected (401). Full test suite still at 25/25.

---

# Round 10 — Leave day counting was excluding Sundays; this company works all 7 days

## The report

A 4-day leave request sometimes counted as 3 days and sometimes as 4,
depending on which dates were picked (e.g. the 20th–23rd came out to 3
days, the 24th–27th came out to 4).

## Why it happened

This wasn't a calculation error — the system was built with `NON_WORKING_WEEKDAYS
= [0]`, deliberately excluding Sundays from every leave day count (a
default assumption of a 6-day work week). Whenever a Sunday happened to
fall inside the requested range, it silently got subtracted — hence the
inconsistent-looking results depending on which days of the week a given
date range landed on.

## The fix

Confirmed this business works all 7 days, so there's no weekly off day to
exclude at all. `NON_WORKING_WEEKDAYS` is now empty — every calendar day
in a leave request counts as a leave day, full stop. Public holidays (Round
8) are unaffected and still excluded separately, since those are actual
designated non-working days, not a weekly pattern.

Also removed a cosmetic-only weekend shading on the calendar UI
(`MonthCalendar.jsx`) that visually implied Saturdays/Sundays were
special — it wasn't tied to any leave calculation, but would have been
misleading now that every day is treated as a working day.

## Verified

Reproduced the exact scenario reported — a 4-day range containing a Sunday
(Aug 20–23, 2026) and one that doesn't (Aug 24–27) — and confirmed both now
return 4 days. Updated the two existing automated tests that had encoded
the old Sunday-exclusion assumption; full suite still passing (25/25) with
the corrected expectations.

If this ever needs to change again — say, a future 6-day-week policy — the
one line to edit is `NON_WORKING_WEEKDAYS` in `leaveService.js`, documented
inline with examples.

---

# Round 11 — Auto no-pay calculation, over-limit visibility, and leave summaries

## No-pay amount now auto-calculates onto the payslip

Previously, approving a leave request that exceeded someone's balance
calculated the no-pay *days* but never converted that into a rupee amount
on the payroll record — HR had to do that math and type it in manually.

Now, when a request is approved with no-pay days on it, the system
automatically:
1. Calculates the deduction as **Basic Salary ÷ actual calendar days in
   that month × no-pay days** (the agreed formula — so a 30-day month and
   a 31-day month give slightly different daily rates, as they should).
2. Adds that amount to the employee's `nopayAmount` payroll field —
   **adds**, not overwrites, so it won't clobber a separate manual no-pay
   entry HR already made that month.
3. Recalculates their full payroll (adjusted basic, gross, net — everything
   downstream of `nopayAmount`) immediately.
4. Shows the approver a confirmation popup with the exact amount and new
   total, and logs it to the activity log for audit.

Verified end-to-end: an employee on Rs. 60,000 basic salary took leave
exceeding their balance by 4 days in a 30-day month. The system correctly
calculated Rs. 2,000/day → Rs. 8,000 deduction, and the employee's
`adjustedBasic`, and `netSalary` all updated to reflect it immediately.

**One thing worth knowing**: `nopayAmount` is a single running value on the
employee record, not scoped to a specific pay period on its own — it's what
gets locked into a payslip snapshot (Round 5) the first time that month's
payslip is generated. This auto-calculation adds to whatever's currently
there. HR still needs to reset it before starting a new pay cycle, exactly
as they already do today for other manually-managed payroll fields — this
didn't change that part of the workflow, it just removes the manual
math for leave-caused no-pay specifically.

## Leave Summary: visibility into who's over their limit, and by how much

New **Leave Summary** view — a tab on the HR Manager/Admin "Leave Requests"
page, and a section on a Manager's "Department" tab (scoped to just their
team). For every employee: their scheme (monthly/annual), what they've used
this month, what they've used year-to-date, what they're entitled to, and
what's left — with anyone at or below zero remaining clearly flagged "Over
limit" in red, plus a running count at the top ("N over their limit").

This closes both gaps from the original question: no-pay math is now
automatic, and there's a real, scoped-by-role report instead of having to
notice an over-limit employee reactively in the approval queue.

Verified: an employee with a 6-day monthly quota who'd used all 6 (matching
the no-pay example above) correctly showed `remaining: 0` and "Over limit."
An employee with no leave profile set up showed a clear "not set up yet"
row instead of broken numbers. Department-scoped filtering (for the manager
view) correctly handles the zero-employee edge case the same way the
approval queue already did.
