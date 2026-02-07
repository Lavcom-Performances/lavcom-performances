# TAEX-308: Post-Beta Commercial Rollout

## Implementation Summary

### Part A: Commercial Offer Structuring
**File**: `src/config/commercialPlans.ts`

Defines three official plans with no ambiguity:
- **Starter** (1-2 laundromats): 29€/laundromat/month
- **Advanced** (3+ laundromats): Volume pricing (25€-21€/laundromat/month)
- **Project/Simulation**: Time-based access for future operators

Includes:
- `COMMERCIAL_PLANS` - Full plan definitions
- `BETA_TRANSITION` - Transition rules (7-day notice, pricing)
- `COMMERCIAL_MESSAGING` - Terminology guidelines
- `EXIT_RULES` - No lock-in, data export always allowed

---

### Part B: Beta → Paid Transition UX
**File**: `src/components/billing/BetaEndNoticeBanner.tsx`

- Shows 7-day advance notice before beta period ends
- Non-blocking, dismissible banner
- Displays: days remaining, end date, future pricing, total estimate
- Integrated into Dashboard and Billing pages

---

### Part C: Billing Page Clarity
**File**: `src/components/settings/BillingContent.tsx`

Enhanced billing page shows:
- Current plan name and tier
- Active laundromat count
- Current price per laundromat
- Future price (if in beta)
- Monthly total
- Beta end date with countdown
- Data export option (Exit Rules compliance)

---

### Part D+E: Admin Commercial Health Dashboard
**File**: `src/pages/admin/CommercialReadinessPage.tsx`
**Route**: `/admin/commercial`

Displays:
- **MRR Total** - Monthly Recurring Revenue
- **Conversion Rate** - Beta → Paid percentage
- **Avg Days to Conversion** - Time from signup to conversion
- **ARPU** - Average Revenue Per Unit (laundromat)

Status cards:
- Converted companies (green)
- Active beta (blue)
- Ending soon <14 days (amber)
- Churned (gray)

Full company table with filtering by status.

---

### Part F: Exit Without Damage
Implemented via:
- `EXIT_RULES` constant in commercialPlans.ts
- Data export option visible on billing page
- No modal blocking or countdown pressure

---

## Files Created/Modified

### New Files
- `src/config/commercialPlans.ts` - Plan definitions
- `src/components/billing/BetaEndNoticeBanner.tsx` - 7-day notice
- `src/pages/admin/CommercialReadinessPage.tsx` - Admin dashboard

### Modified Files
- `src/components/settings/BillingContent.tsx` - Enhanced with full pricing clarity
- `src/pages/Dashboard.tsx` - Added beta end notice banner
- `src/App.tsx` - Added `/admin/commercial` route
- `src/components/platformAdmin/AdminSidebar.tsx` - Added sidebar link

---

## Acceptance Criteria Status

| Criteria | Status |
|----------|--------|
| Plans and pricing clearly defined | ✅ |
| Beta → paid transition predictable and visible | ✅ |
| Billing page fully understandable | ✅ |
| Admin can monitor conversion health | ✅ |
| No surprise or confusion about pricing | ✅ |

---

## Key Principles Implemented

> "Commercialization should feel like continuity, not a switch."

- All prices displayed as "€/laverie/mois"
- No bundle pricing that hides unit costs
- No countdown pressure or modal blocking
- Users can export data and leave freely
- Trust maintained even for departing users
