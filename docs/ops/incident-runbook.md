# Incident Runbook

> Quick reference guide for platform admins when something breaks.  
> Last updated: 2026-01-21

## Quick Start

1. **Check System Status**: Go to `/admin/system-status` for real-time health
2. **Collect Diagnostics**: Use the "Collect Diagnostics" button to create a bundle
3. **Filter Events**: Use source/severity filters to narrow down issues
4. **Follow runbook**: Find the matching incident type below

---

## Table of Contents

1. [Import Fails / Missing Data](#1-import-fails--missing-data)
2. [Dashboard Numbers Look Wrong](#2-dashboard-numbers-look-wrong)
3. [Stripe Checkout/Webhook Issues](#3-stripe-checkoutwebhook-issues)
4. [Cron Jobs Failing](#4-cron-jobs-failing)
5. [Admin Access/Roles Issues](#5-admin-accessroles-issues)

---

## 1. Import Fails / Missing Data

### Symptoms
- User reports CSV import failed or partial import
- Missing transactions in dashboard after import
- Import confirmation shows "0 rows imported" or error message
- `system_events` shows `import` source errors

### Where to Look
1. `/admin/system-status` → Filter by source: **import**
2. Check `import_batches` table for recent entries
3. Run Import Parser Tests widget to verify CSV parsing
4. Check user's `operations` table for the site

### First Actions (Safe)
1. **Identify the batch**: Note the `import_batch_id` from error logs
2. **Check file format**: Ask user for sample CSV (first 5 rows)
3. **Verify provider detection**: Run parser tests to confirm lmcontrol/wiline detection
4. **Check for duplicates**: Query `operations` with same `dedupe_key`

```sql
-- Check recent imports for a site
SELECT * FROM import_batches 
WHERE site_id = '<site_id>' 
ORDER BY created_at DESC LIMIT 10;

-- Check for duplicate operations
SELECT dedupe_key, COUNT(*) 
FROM operations 
WHERE site_id = '<site_id>' 
GROUP BY dedupe_key 
HAVING COUNT(*) > 1;
```

### Escalation Criteria
Escalate to CTO if:
- Parser tests fail for known provider
- Multiple users affected by same issue
- Data corruption suspected (duplicates, wrong amounts)

**Attach to escalation:**
- Diagnostics bundle
- Sample CSV file (sanitized)
- Screenshot of error message

---

## 2. Dashboard Numbers Look Wrong

### Symptoms
- User reports revenue/transaction counts differ from source data
- Charts show gaps or spikes that don't match reality
- Comparison periods show unexpected changes
- `analytics_daily` or `analytics_kpis` seem stale

### Where to Look
1. `/admin/system-status` → Check **Data Quality** section
2. Compare `operations` raw data vs `analytics_daily` aggregates
3. Check `site_analytics_state` for last recompute timestamp
4. Review `cron_logs` for `compute-analytics-cron` failures

### First Actions (Safe)
1. **Verify data freshness**: Check `site_analytics_state.last_import_at`
2. **Spot-check a date**: Compare raw operations sum vs analytics_daily
3. **Check timezone**: User might be viewing different timezone
4. **Trigger recompute**: Use "Recompute Analytics" widget for specific site

```sql
-- Compare raw vs aggregated for a date
SELECT 
  SUM(amount) as raw_total,
  (SELECT revenue FROM analytics_daily 
   WHERE site_id = '<site_id>' AND date = '2026-01-20') as agg_total
FROM operations 
WHERE site_id = '<site_id>' 
  AND operation_date = '2026-01-20';

-- Check analytics state
SELECT * FROM site_analytics_state WHERE site_id = '<site_id>';
```

### Escalation Criteria
Escalate to CTO if:
- Recompute doesn't fix discrepancy
- Multiple sites affected
- Raw data itself appears corrupted

**Attach to escalation:**
- Diagnostics bundle with site_id filter
- Screenshots of discrepancy
- Date range affected

---

## 3. Stripe Checkout/Webhook Issues

### Symptoms
- User stuck on checkout (loading forever)
- Payment succeeded in Stripe but subscription not updated
- `stripe-webhook` errors in system events
- Invoices not syncing to `stripe_invoices` table

### Where to Look
1. `/admin/system-status` → Filter by source: **stripe-webhook**
2. Check `stripe_events` table for recent events
3. Run "Billing Reconcile" widget to compare Stripe vs local state
4. Check Secrets Health for `STRIPE_WEBHOOK_SECRET` status

### First Actions (Safe)
1. **Check webhook secret**: Verify `STRIPE_WEBHOOK_SECRET` is PRESENT
2. **Check event processing**: Query `stripe_events` for the event ID
3. **Manual sync**: Run billing reconciliation for the user
4. **Check Stripe dashboard**: Verify webhook endpoint is active

```sql
-- Check recent webhook events
SELECT event_id, event_type, created_at, processed_at 
FROM stripe_events 
ORDER BY created_at DESC LIMIT 20;

-- Find subscription for user
SELECT * FROM subscriptions 
WHERE user_id = '<user_id>';
```

### Escalation Criteria
Escalate to CTO if:
- Webhook secret is missing/incorrect
- Stripe dashboard shows failed webhook deliveries
- Multiple users affected

**Attach to escalation:**
- Diagnostics bundle
- Stripe event ID (from Stripe dashboard)
- User's `stripe_customer_id`

---

## 4. Cron Jobs Failing

### Symptoms
- Smoke tests showing failures in system status
- Analytics not updating automatically
- Trial reminders not being sent
- Audit log cleanup not running

### Where to Look
1. `/admin/system-status` → Filter by source: **cron**
2. Check `cron_logs` table for recent job runs
3. Review `cron_alert_settings` for threshold configurations
4. Check Secrets Health for `CRON_SECRET` status

### First Actions (Safe)
1. **Identify failing job**: Check `cron_logs` for `status = 'error'`
2. **Check dependencies**: Some jobs depend on other services (Resend, Slack)
3. **Manual trigger**: Most cron jobs can be triggered manually from system status
4. **Check secrets**: Verify required secrets are configured

```sql
-- Check recent cron failures
SELECT job_name, status, error_message, started_at 
FROM cron_logs 
WHERE status = 'error' 
ORDER BY started_at DESC LIMIT 20;

-- Check alert settings
SELECT * FROM cron_alert_settings;
```

### Common Cron Jobs
| Job | Frequency | Dependencies |
|-----|-----------|--------------|
| `compute-analytics-cron` | Hourly | None |
| `trial-reminder` | Daily | `RESEND_API_KEY` |
| `cleanup-audit-logs` | Daily | None |
| `cleanup-login-logs` | Daily | None |
| `stripe-reconcile-cron` | Daily | `STRIPE_SECRET_KEY` |
| `smoke-tests-cron` | Daily | Various |
| `import-parser-tests-cron` | Daily | None |

### Escalation Criteria
Escalate to CTO if:
- Core job failing repeatedly (analytics, reconcile)
- Secret appears to be misconfigured
- Error message unclear

**Attach to escalation:**
- Diagnostics bundle
- Specific job name and error message
- Last successful run timestamp

---

## 5. Admin Access/Roles Issues

### Symptoms
- Admin can't access `/admin/*` pages
- User promoted to admin but still sees regular UI
- Platform role changes not taking effect
- "Unauthorized" errors in system status

### Where to Look
1. Check `platform_roles` table for the user
2. Review `admin_audit_logs` for recent role changes
3. Check `admin_login_history` for suspicious activity
4. Verify user exists in `profiles` table

### First Actions (Safe)
1. **Verify role assignment**: Check `platform_roles` for user_id
2. **Check session**: Have user log out and back in
3. **Audit trail**: Review who made last role change
4. **Check blocks**: Verify user not in `admin_blocked_users`

```sql
-- Check user's platform roles
SELECT * FROM platform_roles WHERE user_id = '<user_id>';

-- Check if user is blocked
SELECT * FROM admin_blocked_users 
WHERE user_id = '<user_id>' AND unblocked_at IS NULL;

-- Recent role changes for user
SELECT * FROM admin_audit_logs 
WHERE details->>'target_user_id' = '<user_id>'
ORDER BY created_at DESC LIMIT 10;
```

### Escalation Criteria
Escalate to CTO if:
- Suspected privilege escalation attempt
- Unable to determine why access is denied
- Multiple admins affected

**Attach to escalation:**
- Diagnostics bundle
- User ID and email
- Screenshots of error

---

## Collecting Diagnostics

### From Admin UI
1. Go to `/admin/system-status`
2. Scroll to **Diagnostics** section
3. Optionally select a site and date range
4. Click **"Collect Diagnostics"**
5. Download the bundle when ready

### Bundle Contents
- Runtime environment summary (no secrets)
- Secrets health status (PRESENT/MISSING only)
- Last 50 system events (filtered)
- Last 20 failed cron runs
- Latest Stripe reconcile summary
- Import parser test results
- Recent recompute analytics runs

### What's NOT Included
- Actual secret values
- User passwords or tokens
- Full PII beyond admin-visible data
- Raw file contents

---

## Escalation Contacts

| Level | Contact | When |
|-------|---------|------|
| L1 | Platform Admin | First response, safe actions |
| L2 | CTO | Requires code changes, data fixes |
| L3 | External | Stripe support, Supabase support |

---

## Related Documentation

- [Backup & Restore Procedures](./backup-restore.md)
- [Edge Functions Architecture](../edge-functions-architecture.md)
- [DR Drill Procedures](/admin/dr-drills)
