# Deep User Test Checklist — TAEX-306/307

## Profile 1: Future Project Holder (Simulator)
| Screen | OK/KO | UX Friction | Comprehension | Blocking | Comment |
|--------|-------|-------------|---------------|----------|---------|
| Landing Page | ✅ OK | No | No | No | Navigation clear |
| Simulator Link | ✅ OK | No | No | No | CTA visible in navbar |
| Simulator Paywall | ✅ OK | No | No | No | Packs displayed |
| Guest Checkout | ✅ OK | No | No | No | Edge function works, Stripe URL returned |

## Profile 2: Single-site Operator (SaaS)
*Requires authenticated session - to be tested with user login*

## Profile 3: Multi-site Operator
*Requires authenticated session with multiple sites*

## Profile 4: Beta Operator
*Requires beta company access*

## Profile 5: Platform Admin
*Requires platform admin role*

---

## Top Blockers Identified

1. **i18n Missing Keys**: `trust.footerMessage` missing in EN-US locale (minor)
2. **Favicon 404**: favicon.ico not found (cosmetic)

## Passed Tests
- ✅ Guest checkout flow functional
- ✅ Stripe integration working
- ✅ Navigation between landing and simulator
- ✅ Pack selection and pricing display

---

*Note: Full testing of profiles 2-5 requires authenticated sessions*
