# Disaster Recovery Drill Playbook

> **Version**: 1.0  
> **Last Updated**: 2026-01-21  
> **Owner**: CTO / Platform Super Admin

## Purpose

This document provides a step-by-step procedure to conduct a Disaster Recovery (DR) drill in **staging**. The goal is to validate that our backup and restoration processes work end-to-end, and to collect evidence for compliance and audit purposes.

## Recovery Objectives

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | ≤ 24 hours |
| **RTO** (Recovery Time Objective) | ≤ 4 hours |

---

## 1. Preconditions

Before starting the drill, ensure the following:

### Access Requirements
- [ ] CTO or Super Admin access to Lovable Cloud
- [ ] Access to staging environment
- [ ] Access to `/admin/system-status` page
- [ ] Email configured for alert notifications

### Test Data Requirements
- [ ] At least one demo site exists in staging
- [ ] Test user accounts are available
- [ ] `analytics_daily` has data for the test site (7+ days)

### Documentation
- [ ] This playbook is accessible
- [ ] `docs/ops/backup-restore.md` is available for reference

---

## 2. Drill Steps

### Step 1 — Record Baseline (T+0)

**Objective**: Capture the current state before the simulated incident.

1. **Record timestamp and version**
   ```
   Drill Start: ______________ (UTC)
   Build/Version: ____________
   Environment: staging
   ```

2. **Take baseline screenshot**
   - Navigate to `/admin/system-status`
   - Capture full-page screenshot
   - Save as: `dr/YYYY-MM-DD/before.png`

3. **Verify current data**
   - Run smoke tests (manual trigger from System Status)
   - Note results: ☐ All passed / ☐ Some failures (list)

4. **Record baseline metrics**
   ```sql
   -- Run in staging
   SELECT COUNT(*) as site_count FROM sites WHERE is_demo = true;
   SELECT COUNT(*) as analytics_rows FROM analytics_daily 
   WHERE date >= CURRENT_DATE - 7;
   ```

---

### Step 2 — Simulate Incident (T+5min)

**Objective**: Create a controlled data loss scenario.

Choose **ONE** of the following options:

#### Option A: Delete Demo Site (Preferred - Reversible)

```sql
-- Record the site ID first
SELECT id, name FROM sites WHERE is_demo = true LIMIT 1;

-- Store site_id: ______________

-- Delete the demo site
DELETE FROM sites WHERE id = '<site_id>';
```

**Expected Impact**: Site disappears from UI, related data orphaned.

#### Option B: Corrupt Analytics Data

```sql
-- Identify test site
SELECT id, name FROM sites WHERE is_demo = true LIMIT 1;

-- Store site_id: ______________

-- Delete 7 days of analytics
DELETE FROM analytics_daily 
WHERE site_id = '<site_id>' 
AND date >= CURRENT_DATE - 7;
```

**Expected Impact**: Analytics charts show gaps, smoke tests may fail.

---

### Step 3 — Document Incident (T+10min)

1. **Take incident screenshot**
   - Navigate to `/admin/system-status`
   - Capture screenshot showing the impact
   - Save as: `dr/YYYY-MM-DD/incident.png`

2. **Log incident details**
   ```
   Incident Type: Option A / Option B
   Affected Resource: ____________
   Time of Incident: ____________ (UTC)
   ```

---

### Step 4 — Restore (T+15min)

**Objective**: Restore data from backup.

> ⚠️ **CTO-Only Procedure**: Follow `docs/ops/backup-restore.md` for detailed steps.

1. **Access Lovable Cloud Console**
   - Navigate to Project Settings > Backups

2. **Select Restoration Point**
   - Choose backup from before T+0
   - Confirm restoration to staging

3. **Wait for Restoration**
   - Monitor progress in console
   - Expected duration: 5-30 minutes depending on size

4. **Record restoration details**
   ```
   Backup Used: ____________ (timestamp)
   Restoration Started: ____________ (UTC)
   Restoration Completed: ____________ (UTC)
   Duration: ____________ minutes
   ```

---

### Step 5 — Verify (T+45min to T+2h)

**Objective**: Confirm system integrity after restoration.

#### 5.1 Smoke Tests
- [ ] Navigate to `/admin/system-status`
- [ ] Click "Run Smoke Tests" manually
- [ ] Result: ☐ All passed / ☐ Failures (list below)

```
Smoke Test Results:
T1_ops_exist: ☐ Pass / ☐ Fail
T2_calendar_kpis: ☐ Pass / ☐ Fail
T3_dashboard_kpis: ☐ Pass / ☐ Fail
T4_monthly_revenue: ☐ Pass / ☐ Fail
T5_recommendations: ☐ Pass / ☐ Fail
T6_analytics_consistency: ☐ Pass / ☐ Fail
```

#### 5.2 Import Parser Tests
- [ ] Click "Run Import Parser Tests" in System Status
- [ ] Result: ☐ All passed / ☐ Failures

#### 5.3 Recompute Analytics
- [ ] Select a known site and date range
- [ ] Run "Recompute Analytics"
- [ ] Verify: New analytics match expected values

#### 5.4 Stripe Reconciliation (if applicable)
- [ ] Trigger manual Stripe reconcile
- [ ] Check for discrepancies in `system_events`

#### 5.5 Final System Status Check
- [ ] Navigate to `/admin/system-status`
- [ ] Confirm: No critical/error events
- [ ] Take final screenshot
- [ ] Save as: `dr/YYYY-MM-DD/after.png`

---

## 3. Pass/Fail Criteria

| Check | Pass Criteria | Result |
|-------|---------------|--------|
| **RTO Met** | Total drill time ≤ 4 hours | ☐ Pass / ☐ Fail |
| **Data Restored** | Deleted/corrupted data is back | ☐ Pass / ☐ Fail |
| **Smoke Tests** | All T1-T6 pass | ☐ Pass / ☐ Fail |
| **Import Parser** | All parsers functional | ☐ Pass / ☐ Fail |
| **Analytics** | Recompute succeeds | ☐ Pass / ☐ Fail |
| **No New Errors** | System status clean | ☐ Pass / ☐ Fail |

### Overall Drill Result

- ☐ **PASS**: All checks passed, RTO met
- ☐ **PARTIAL**: Some checks failed, documented for remediation
- ☐ **FAIL**: Critical failures, requires immediate action

---

## 4. Evidence Collection

### Required Files

Upload the following to the `dr-evidence` bucket:

| File | Description |
|------|-------------|
| `dr/YYYY-MM-DD/before.png` | System status before incident |
| `dr/YYYY-MM-DD/incident.png` | System status after incident |
| `dr/YYYY-MM-DD/after.png` | System status after restoration |
| `dr/YYYY-MM-DD/results.json` | Structured drill results |

### results.json Template

```json
{
  "drill_date": "2026-01-21",
  "actor_id": "uuid-of-operator",
  "actor_email": "cto@example.com",
  "environment": "staging",
  "incident_type": "demo_site_deletion",
  "duration_minutes": 45,
  "rto_met": true,
  "steps": {
    "baseline_recorded": true,
    "incident_simulated": true,
    "restoration_completed": true,
    "smoke_tests_passed": true,
    "import_parser_passed": true,
    "analytics_recomputed": true,
    "stripe_reconciled": true,
    "system_status_clean": true
  },
  "failures": [],
  "notes": "Drill completed successfully. No issues encountered.",
  "backup_timestamp": "2026-01-21T00:00:00Z",
  "restoration_duration_minutes": 12
}
```

---

## 5. Post-Drill Notes

### Issues Encountered

| Issue | Severity | Resolution |
|-------|----------|------------|
| _None_ | - | - |

### Recommendations

- [ ] Update playbook if procedures changed
- [ ] Review backup frequency if RPO not met
- [ ] Escalate blockers to CTO

### Sign-Off

```
Drill Conductor: ________________
Date: ________________
Result: PASS / PARTIAL / FAIL
Next Drill Due: ________________ (1 month from today)
```

---

## 6. Monthly Schedule

DR drills are scheduled for the **first Monday of each month at 09:00 UTC**.

A reminder is automatically sent to super admins via:
- Email notification
- `system_events` log entry (source: `dr_drill_reminder`)

### Reminder Content

> **Subject**: 🔄 DR Drill Due - [Month Year]
> 
> The monthly Disaster Recovery drill is due.
> 
> **Last Drill**: [date or "Never"]
> **Playbook**: `/admin/system-status` → DR Evidence section
> **Documentation**: `docs/ops/dr-drill.md`

---

## Appendix A: Quick Reference

### Key Commands

```bash
# Check system status
curl -X GET /admin/system-status

# Trigger smoke tests (via UI)
# Navigate to /admin/system-status → Smoke Test section

# View evidence bucket
# Navigate to /admin/system-status → DR Evidence section
```

### Contacts

| Role | Contact |
|------|---------|
| CTO | [as configured in ADMIN_ALERT_EMAIL] |
| Platform Super Admin | [platform admins list] |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-21 | System | Initial playbook |
