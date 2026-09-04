# Backups & Restore

This app has no automated backup mechanism built in — that's expected to
come from your database host, but here's exactly how to do it yourself if
you're self-hosting MySQL, plus how to test that a backup is actually
restorable (a backup you've never restored is not a backup).

## If you're on a managed database host

Railway, PlanetScale, AWS RDS, DigitalOcean Managed Databases, and most
other managed MySQL providers all offer automated daily backups with
point-in-time recovery as a checkbox/setting in their dashboard — turn it
on. That's almost always the right answer over rolling your own, and this
section is for the case where it isn't available.

## Manual backup with mysqldump

```bash
mysqldump \
  --host=$DB_HOST --port=$DB_PORT --user=$DB_USER --password=$DB_PASSWORD \
  --single-transaction --routines --triggers \
  $DB_NAME > backup-$(date +%Y%m%d-%H%M%S).sql
```

`--single-transaction` takes a consistent snapshot without locking tables —
important since this is a live system people are actively using leave
requests and payroll against while a backup runs.

Compress it (these files add up):

```bash
mysqldump ... $DB_NAME | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

## Automating it with cron

```bash
# Runs daily at 2am, keeps the last 14 days, deletes anything older
0 2 * * * /path/to/backup-script.sh
```

```bash
#!/bin/bash
# backup-script.sh
set -euo pipefail
BACKUP_DIR=/var/backups/hrm-payroll
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql.gz"
mysqldump --single-transaction --routines --triggers \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" | gzip > "$FILE"
find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +14 -delete
```

Push the backup somewhere off the same machine too (S3, another server,
etc.) — a backup that lives on the same disk as the database doesn't
protect you against that disk failing.

## Restoring

```bash
gunzip -c backup-20260901-020000.sql.gz | mysql \
  --host=$DB_HOST --port=$DB_PORT --user=$DB_USER --password=$DB_PASSWORD $DB_NAME
```

This restores into whatever database `$DB_NAME` points at — if you're
testing a restore, point it at a fresh, empty database first, **not**
production, so a mistake doesn't wipe out anything real.

## Actually test this

Backups that have never been restored are a false sense of security. At
minimum, once a quarter: spin up a throwaway MySQL database, restore the
most recent backup into it, point a local copy of this app's `.env` at it,
and confirm you can log in and see real data. If that doesn't work, your
backup strategy doesn't work, and it's much better to find that out now
than during an actual incident.

## What backups won't help with

The `payroll_snapshots` and `leave_requests` tables are the append-only,
audit-trail parts of this system — restoring an old backup after a mistake
in one of *those* rows is straightforward. Restoring after a mistake that
already flowed downstream (e.g. an incorrect payslip PDF that's already
been emailed to someone) isn't something a database backup fixes on its
own — that's a process question, not a technical one.
