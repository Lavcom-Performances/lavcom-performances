# MFA Coverage Audit - TAEX-231

This document tracks all sensitive actions and their MFA enforcement status.

## Enforcement Rules

| User Type | MFA Not Enrolled | MFA Enrolled, No Session | MFA Session Valid |
|-----------|------------------|-------------------------|-------------------|
| **Platform Admin** | ❌ BLOCKED (enrollment required) | ⚠️ Requires verification | ✅ Allowed |
| **SaaS User** | ✅ Allowed (flexible) | ⚠️ Requires verification | ✅ Allowed |

## Platform Admin Actions

These actions are **blocked** if the platform admin has not enrolled in MFA.

| Action Key | Description | UI Entrypoint | Backend Enforcement | Status |
|------------|-------------|---------------|---------------------|--------|
| `impersonate_user` | Start impersonation session | `/admin/system-status` → User list | `start-impersonation` + `assertPlatformMfaOr403()` | ✅ Server-side |
| `change_platform_role` | Grant/revoke platform roles | `/admin/platform-roles` | `grant_platform_role` RPC | ✅ Server-side |
| `toggle_feature_flag` | Enable/disable kill switches | `/admin/system-status` → Feature Flags | `toggle-feature-flag` (via RPC) | ✅ Server-side |
| `run_dr_drill` | Execute DR drill | `/admin/system-status` → DR | `run-dr-drill` + `assertPlatformMfaOr403()` | ✅ Server-side |
| `generate_compliance_report` | Generate compliance PDF | `/admin/compliance` | `generate-compliance-report` | ✅ Server-side |
| `download_archive` | Download audit archives | `/admin/archives` | `get-audit-archive-download-url` | ✅ Server-side |
| `access_secrets` | View/manage secrets | `/admin/secrets` | `secrets-health` | ✅ Server-side |
| `system_config` | Modify system configuration | `/admin/system-status` | Various admin RPCs | ✅ Server-side |

## Company Admin / SaaS User Actions

These actions require MFA verification **only if** the user has MFA enrolled.
If MFA is not enrolled, the action proceeds (flexible UX).

| Action Key | Description | UI Entrypoint | Backend Enforcement | Status |
|------------|-------------|---------------|---------------------|--------|
| `export_csv` | Export data to CSV | Dashboard → Export | `useMfaGatedAction` hook | ⚠️ Client + backend session |
| `export_financial` | Export financial reports | `/app/reports` → Export | `useMfaGatedAction` hook | ⚠️ Client + backend session |
| `remove_team_member` | Remove user from team | `/app/team` → Remove | `useMfaGatedAction` hook | ⚠️ Client + backend session |
| `change_user_role` | Change team member role | `/app/team` → Edit | `useMfaGatedAction` hook | ⚠️ Client + backend session |
| `billing_change` | Modify billing settings | `/app/billing` | `useMfaGatedAction` hook | ⚠️ Client + backend session |
| `cancel_subscription` | Cancel subscription | `/app/billing` → Cancel | `useMfaGatedAction` hook | ⚠️ Client + backend session |
| `change_password` | Change account password | `/settings/security` | `useMfaGatedAction` hook | ⚠️ Client + backend session |
| `delete_site` | Delete a laundromat site | `/app/sites` → Delete | `useMfaGatedAction` hook | ⚠️ Client + backend session |
| `delete_account` | Delete user account | `/settings/account` | `useMfaGatedAction` hook | ⚠️ Client + backend session |
| `disable_mfa` | Disable MFA | `/settings/security` | `useMfaGatedAction` hook | ⚠️ Client + backend session |

## Server-Side Enforcement

### Shared Helper: `assertPlatformMfaOr403()`

Located at: `supabase/functions/_shared/mfa.ts`

Usage in edge functions:
```typescript
import { assertPlatformMfaOr403 } from '../_shared/mfa.ts';

// At the start of the handler
const mfaCheck = await assertPlatformMfaOr403(req, 'impersonate_user');
if (!mfaCheck.allowed) {
  return mfaCheck.response; // Returns 403 with appropriate error
}

// Continue with the action...
const userId = mfaCheck.userId;
```

### Edge Functions with MFA Enforcement

| Function | Action | Implementation |
|----------|--------|----------------|
| `start-impersonation` | `impersonate_user` | Uses `assertPlatformMfaOr403()` |
| `run-dr-drill` | `run_dr_drill` | Uses `assertPlatformMfaOr403()` |
| `generate-compliance-report` | `generate_compliance_report` | Uses `assertPlatformMfaOr403()` |
| `get-audit-archive-download-url` | `download_archive` | Uses `assertPlatformMfaOr403()` |

## Database Tables

### `mfa_challenges`
Stores pending and verified MFA challenges:
- `user_id`: The user attempting the action
- `action`: The sensitive action key
- `verified_at`: Timestamp when TOTP was verified (null if pending)
- `expires_at`: Session expiry (15 minutes from verification)

### `platform_roles`
Determines platform admin status:
- `super_admin`: Full platform access
- `admin`: Platform admin access
- `billing`: Billing-only access

## UI Components

### Platform Admin MFA Status Card
Location: `src/components/admin/PlatformMfaStatusCard.tsx`

Displays:
- MFA enrollment status (enabled/required)
- Warning banner if not enrolled
- Quick link to security settings

Shown on:
- `/admin/system-status`
- `/admin` (dashboard)

## Testing Checklist

### Platform Admin Without MFA
- [ ] Attempt "Start Impersonation" → **Blocked** with "MFA enrollment required"
- [ ] Attempt "Toggle Feature Flag" → **Blocked** with "MFA enrollment required"
- [ ] Attempt "Run DR Drill" → **Blocked** with "MFA enrollment required"
- [ ] See warning banner on admin dashboard

### Platform Admin With MFA
- [ ] Attempt "Start Impersonation" → **MFA prompt** → Success after TOTP
- [ ] Attempt "Toggle Feature Flag" → **MFA prompt** → Success after TOTP
- [ ] Subsequent actions within 15 min → **No prompt** (session valid)

### SaaS Company Admin Without MFA
- [ ] Normal dashboard usage → **Unaffected**
- [ ] Export CSV → **Allowed** (no MFA enrolled)
- [ ] Delete site → **Allowed** (no MFA enrolled)

### SaaS Company Admin With MFA Enrolled
- [ ] Export CSV → **MFA prompt** → Success after TOTP
- [ ] Delete site → **MFA prompt** → Success after TOTP
- [ ] Subsequent actions within 15 min → **No prompt** (session valid)

## Audit Logging

All MFA events are logged to:
1. `system_events` table with source `mfa` or `mfa_enforcement`
2. `audit_logs` table for compliance

Event codes:
- `MFA_CHALLENGE_REQUESTED`: User initiated sensitive action
- `MFA_CHALLENGE_VERIFIED`: TOTP successfully verified
- `MFA_CHALLENGE_FAILED`: Invalid TOTP code
- `PLATFORM_MFA_NOT_ENROLLED`: Platform admin blocked (no MFA)

---

Last updated: 2026-01-31
Ticket: TAEX-231
