# Roadmap — New profitability simulator

> Version française : [docs/simulateur-v2-roadmap.md](../simulateur-v2-roadmap.md)

> Document intended for developers joining the project. It lists **everything that remains to be done** on the new simulator (`/simulator/*`) and its dashboard (`/dashboard-simulator/*`).
>
> To understand **what already exists** (architecture, contexts, validation, calculations, i18n), first read [`docs/simulateur-v2-onboarding.md`](./simulateur-v2-onboarding.md).

Last updated: 7 août 2026.

---

## 1. Reading conventions

Each work item (chantier) has a stable identifier (`A1`, `B2`, ...) that can be reused in tickets and branches.

| Field | Values | Meaning |
|---|---|---|
| Priority | `P1` / `P2` / `P3` | P1 = blocking for delivery, P2 = required before going to production, P3 = desirable improvement. |
| Effort | `S` / `M` / `L` | S = less than a day, M = 1 to 3 days, L = more than 3 days or dependent on a third party. |
| Dependencies | Work item IDs | Work to be completed before starting this one. |

Project rules to follow across all these work items:

- **Additive, non-breaking** changes: the legacy `/simulateur` and `/simulation` flows remain functional in production until the new simulator is delivered.
- Every displayed string goes through i18n (namespace `paid-simulator`), never hard-coded text.
- No hard-coded colors: use design system tokens (`bg-primary`, `text-foreground`, `shadow-form`, ...).
- Every database access respects per-user isolation (`auth.uid()`) and soft-delete.

---

## 2. Summary table

| ID | Lot | Chantier | Priority | Effort | Depends on |
|---|---|---|---|---|---|
| A1 | Technical debt | Refactor `useAddressSearch` | P2 | S | — |
| A2 | Technical debt | Refactor `AddressAutocomplete` | P2 | S | A1 |
| A3 | Technical debt | Code review of generated `dashboard-simulator` components | P1 | M | — |
| B1 | Step 1 UX | Visually group custom opening hours | P2 | S | — |
| B2 | Step 1 UX | Visually group custom opening days | P2 | S | — |
| B3 | Step 1 UX | Harmonize the "My project" tab cards with "Premises constraints" | P2 | M | — |
| C1 | Business logic | Decision: hours that differ by day | P2 | M | — |
| C2 | Business logic | Complete feasibility warnings and their distribution across pages | P1 | M | — |
| C3 | Business logic | Step 3 validation: at least one cost item per card | P1 | S | — |
| D1 | Design system | UI overhaul of `SimulatorStepper` + sticky | P2 | M | — |
| D2 | Design system | Responsive design for all pages | P1 | L | B1, B2, B3, D1 |
| D3 | Design system | Dark/light theme for `/simulator/*` + dashboard | P2 | M | — |
| D4 | Design system | Accessibility audit and fixes | P1 | M | D2 |
| E1 | Database | Update the ERD and data dictionary | P1 | M | C1 |
| E2 | Database | Design validation by Raul | P1 | S | E1 |
| E3 | Database | Create the validated schema (tables, RLS, grants) | P1 | L | E2 |
| F1 | Monetization | Redesign `/subscribe-simulator` per the Figma mockup | P1 | M | — |
| F2 | Monetization | Redesign `/simulator-payment-success` per the Figma mockup | P1 | M | — |
| F3 | Monetization | Wire Stripe into the new simulator | P1 | L | E3, F1, F2 |
| G1 | Dashboard | Align components with the Figma mockups | P1 | L | A3 |
| G2 | Dashboard | Wire the back end (replace the mocks) | P1 | L | E3, G1 |
| G3 | Dashboard | Connect simulator and dashboard for a logged-in user | P1 | M | F3, G2 |
| G4 | Dashboard | i18n internationalization fr/en | P2 | M | G1 |
| H1 | Tests | Complete and implement `simulator-test-plan.md` | P1 | L | C2, C3 |
| H2 | Tests | Full dashboard test plan | P2 | M | G2 |
| H3 | Tests | End-to-end test of the full workflow | P1 | M | G3, H1 |
| I1 | Site integration | Redirect "Try the free simulator" to the new simulator | P2 | S | D2 |
| J1 | Security | Clean up environment variables exposed on GitHub | P1 | S | — |
| K1 | Administration | Simulator admin dashboard | P1 | L | E3, G2, F3 |

---

## 3. Lot A — Technical debt and refactoring

### A1. Refactor `useAddressSearch`

**Context.** `src/hooks/useAddressSearch.ts` queries two providers (the French BAN address API for France, Nominatim/OpenStreetMap for other countries) in a single hook. The logic for selecting the provider, normalizing the response, and debouncing is all mixed together.

**Expected outcome.**
- Extract one adapter per provider (`searchBan`, `searchNominatim`) exposing the same signature and returning the normalized `AddressSearchResult` type.
- The hook keeps only the orchestration: debounce, 3-character threshold, cancellation of the previous request (`AbortController`), `results` / `isLoading` / `error` states.
- Add explicit error handling (currently errors are silently turned into an empty list).
- Cover the adapters with unit tests using fixed responses.

**Points of attention.** Nominatim enforces a usage policy (a maximum of one request per second, an identification header). Keep the debounce at a minimum of 300 ms and do not trigger a search on programmatic field fill-in.

### A2. Refactor `AddressAutocomplete`

**Context.** `src/components/simulator/project/AddressAutocomplete.tsx` manages four local states (`inputValue`, `isOpen`, `justSelected`, `isUserTyping`) to avoid re-triggering a search after selection or after being pre-filled from localStorage. This is fragile and hard to evolve.

**Expected outcome.**
- Simplify the state machine (a single `mode: "idle" | "typing" | "selected"` state).
- Make the component keyboard-accessible: `role="combobox"`, `aria-expanded`, `aria-activedescendant`, up/down arrow navigation, `Enter` to confirm, `Escape` to close. Consider shadcn's `Command` rather than a home-made list of `button`s.
- Share code with the legacy variant `src/components/simulation/AddressAutocomplete.tsx` only if cleanup of the old simulator (legacy simulator) is not already planned — otherwise leave the old one untouched.

### A3. Code review of `dashboard-simulator` components

**Context.** The components in `src/components/dashboard-simulator/` and `src/pages/dashboard-simulator/` were generated quickly and have not yet been reviewed.

**Expected outcome.** A systematic review: naming convention consistency, splitting up overly long components, removal of dead code, strict typing (no `any`), replacing hard-coded colors with tokens, factoring out duplicated primitives with `src/components/ui/`.

**Deliverable.** A review note listing the fixes made and those referred to G1 (Figma alignment).

---

## 4. Lot B — Step 1 UX/UI (`/simulator/project`)

### B1. Group custom opening hours

**Context.** In `OpeningHoursCard.tsx`, when the user selects "Custom hours…", the "Opening time" and "Closing time" fields appear at the same visual level as the parent selector. Nothing indicates that they depend on that choice.

**Expected outcome.** Encapsulate the conditional fields in a visually distinct block: a slightly contrasted background (`bg-muted/40`), a left border or frame, a sub-section title, and an appearance transition. The block must clearly read as an extension of the parent field.

### B2. Group custom opening days

**Context.** Same problem for the grid of opening-day checkboxes shown in custom mode.

**Expected outcome.** Same visual treatment as B1, with a responsive grid (7 columns on desktop, 3 to 4 columns on mobile), a sub-section label, and a readable error state if no day is checked.

**Point of attention.** B1 and B2 must share the same sub-section component (for example `FieldSubGroup`) to guarantee visual consistency.

### B3. Harmonize the "My project" tab cards

**Context.** The "Premises constraints" tab serves as the validated visual reference: `FormCard` cards with `shadow-form`, header with icon + title + description, regular spacing. The "My project" tab has not yet been aligned.

**Expected outcome.** Bring all sections of the "My project" tab to the same template: identical card structure, identical typographic hierarchy, identical vertical spacing, identical field widths, identical error states. No change to business logic or field names.

---

## 5. Lot C — Business rules and validation

### C1. Decision: hours that differ by day

**Context.** Today, in custom mode, a single time slot applies to all selected opening days. The question is whether to allow one time slot per day.

**Points to investigate before deciding.**
- *Business value*: how many actual laundromats have hours that vary by day? The most common case is probably Sunday or a partial closing day.
- *Impact on calculations*: the formulas in `src/utils/machineRevenueCalculations.ts` and `src/utils/profitabilityCalculations.ts` rely on a uniform number of opening hours per day and on `DAYS_PER_MONTH = 30`. Moving to per-day hours requires computing a weekly total of hours and then converting it to a monthly figure, which changes the basis for computing revenue and the break-even point.
- *Data model impact*: moving from an `(openTime, closeTime)` pair to a `{ day, opening, closing }` collection, with a direct consequence on E1.
- *UX impact*: seven extra rows of fields would significantly clutter step 1.

**Recommendation to validate.** Keep a single time slot for version 1 and document the assumption in the interface ("these hours apply to all selected days"). If the feature is retained, plan for a data model that is already compatible as of E1, to avoid a later migration.

**Deliverable.** A written decision in this document, section 9.

### C2. Complete feasibility warnings

**Context.** `ProjectWarnings.tsx` only covers part of the feasibility checks. The data entered in step 1 (door width, modifiable façade, structural obstacles, level of technical constraints, surface area, premises shape) allows for more checks to be produced.

**Expected outcome.**
- Centralize the rules in a dedicated module (for example `src/utils/feasibilityWarnings.ts`) returning a typed list `{ id, severity, scope, i18nKey, params }` where `scope` is `project`, `machines`, or `results`.
- Display warnings with `project` scope on `/simulator/project`, those with `machines` scope on `/simulator/machines` (typically: a door too narrow for a large-capacity washer, insufficient surface area for the configured number of machines, electrical power and drainage incompatible with the number of dryers).
- Display **all** warnings in a summary on `/simulator/results`, grouped by severity.
- A warning is never blocking: it informs, unlike Zod validation errors.
- All strings in `paid-simulator.json` (fr and en).

**Point of attention.** Do not duplicate logic across pages: all three pages consume the same module, only the filter on `scope` changes.

### C3. Step 3 validation: at least one cost item per card

**Context.** Today, deleting all cost items from a card produces no clear message. The generic `charges.invalidFixedCost` / `charges.invalidVariableCost` message displays at the field level, which makes no sense when the list is empty.

**Expected outcome.**
- The user can delete all cost items from a card (no blocking on the delete button).
- If the list of fixed costs (charges fixes) is empty, or the list of variable costs (charges variables) is empty, step 3 validation fails.
- The error message displays **at the section level**, in a dedicated location, and replaces the current `<span className="block text-destructive">{t(costType === "fixed" ? "charges.invalidFixedCost" : "charges.invalidVariableCost")}</span>`. New keys: `charges.emptyFixedCosts` and `charges.emptyVariableCosts`, phrased like "Enter at least one fixed cost."
- The section message must be detectable by `scrollToFirstError`: apply the `data-slot="field-error"` attribute already used by the utility to it.
- The toaster's error count must include these two section errors.

**Files involved.** `src/lib/validation/simulatorProjectSchema.ts`, `src/components/simulator/charges/CostsCard.tsx`, `src/hooks/useSimulatorValidation.ts`, fr/en locale files.

---

## 6. Lot D — Design system, navigation, and interface quality

### D1. UI overhaul of `SimulatorStepper` and switch to sticky

**Context.** `src/components/simulator/layout/SimulatorStepper.tsx` scrolls with the content: on long pages (machines, costs) the user loses visibility of their progress.

**Expected outcome.**
- Visual overhaul aligned with the validated mockup.
- `sticky` positioning under the header, with the same stacking behavior as the header (pay attention to `z-index` ordering and the cumulative vertical offset of header + stepper).
- Compact variant on mobile (current step number, label, progress bar) to avoid consuming too much height.
- Keep navigation to already-completed steps and the progress `aria-label`.

### D2. Responsive design of all pages

**Expected outcome.** Review `/simulator/project`, `/simulator/machines`, `/simulator/charges`, `/simulator/results`, `/subscribe-simulator`, `/simulator-payment-success`, and the entire dashboard at the 320, 375, 768, 1024, and 1440 px breakpoints. No horizontal overflow, no truncated labels, tables turned into stacked cards on mobile, navigation buttons accessible without horizontal scrolling.

### D3. Dark and light theme

**Expected outcome.** Verify that `/simulator/*` and `/dashboard-simulator/*` respect both themes. Replace remaining hard-coded color values with semantic tokens, check custom shadows (`shadow-form`, `shadow-profitability`) in dark theme, check the readability of masked states (paywall blur effect) and error states.

### D4. Accessibility

**Expected outcome.** Full audit followed by fixes, in order of severity:
- *Critical*: fields without an associated label, icon buttons without `aria-label`, click handlers on non-interactive elements, `aria-hidden` on focusable containers, address autocomplete not navigable by keyboard (see A2).
- *Warning*: heading hierarchy, presence of a single `<main>`, visible focus indicators, touch targets of at least 44x44 px, information conveyed by color alone.
- *Informational*: decorative images with `alt=""`, `aria-live` regions for validation messages and toasters, semantic lists.

---

## 7. Lot E — Database

### E1. Update the ERD and data dictionary

**Context.** The project being simulated is currently persisted only in localStorage, via `useSimulatorProject`. The structure has evolved (custom hours, opening days, premises constraints, machine lists, fixed and variable costs) since the last version of the ERD shared on Google Drive.

**Expected outcome.** An up-to-date ERD and data dictionary, exactly reflecting the `SimulatorProject` type in `src/types/simulator.types.ts`, with for each attribute: name, type, nullability, default value, constraint, business description, and unit (amounts are in EUR). Incorporate the decision from C1 regarding hours.

### E2. Design validation by Raul

Review of the data model with Raul before writing any migration. Points to be arbitrated: table granularity (a single project versus project + scenarios), scenario versioning strategy, link to the purchased pack, retention and soft-delete policy.

### E3. Create the validated schema

**Expected outcome.** Migrations creating the validated tables, with, in the same script and in this order: `CREATE TABLE`, `GRANT` for the relevant roles, enabling RLS, then policies. Policies are always scoped on `auth.uid()`. Plan for indexes on foreign keys and on sort columns, as well as `updated_at` triggers.

---

## 8. Lot F — Monetization

### F1. Redesign `/subscribe-simulator`

Align `src/pages/SubscribeSimulator.tsx` with the validated Figma mockup: pack presentation, comparison, reassurance elements, call to action. All strings in i18n, prices sourced from configuration (`src/config/pricingConfig.ts` / `stripeConfig.ts`) and never hard-coded in the component.

### F2. Redesign `/simulator-payment-success`

Refactor `src/pages/SimulatorPaymentSuccess.tsx` per the validated mockup: purchase confirmation, pack summary, next steps, direct access to unlocked results and to the dashboard.

### F3. Wire Stripe into the new simulator

**Expected outcome.**
- Reuse existing Stripe price IDs or create new ones, hard-referenced in the source configuration (never dynamic `price_data`).
- Payment-session-creation edge function compatible with **both guest and logged-in users** (CORS headers required for the guest flow).
- A function to verify access to the pack, called when results are loaded.
- Replace the `IS_SIMULATOR_PACK_ACTIVE` constant in `PaywallCallout.tsx` and `ProfitabilityCard.tsx` with this real state (see section 9).
- Keep the masking of figures server-side as much as possible: do not send real values to the client until the pack is active.

---

## 9. Lot G — Project owner dashboard

### G1. Align components with the Figma mockups

Redo all `dashboard-simulator` screens (home, projects, scenarios, comparison, reports, purchases, account) per the validated mockups. To be done after the A3 code review, to avoid reworking code that will subsequently be thrown away.

### G2. Wire the back end

Replace the mocks in `src/mocks/dashboard-simulator/` and the `use-mock-query` hooks with real queries against the schema created in E3. Explicitly handle loading, error, and empty-list states. Server-side pagination for project and report lists.

### G3. Connect simulator and dashboard

For a logged-in user with a pack: persist the project to the database rather than to localStorage, resume an existing project from the dashboard into `/simulator/project`, save a scenario from the results page, and display unmasked results. Plan for migrating the project present in localStorage at the moment of login.

### G4. fr/en internationalization of the dashboard

Create a dedicated i18n namespace (for example `dashboard-simulator`), move the strings currently in `src/constants/dashboard-simulator/*.strings.ts` into locale files, register the namespace in `src/lib/i18n-config.ts`, and check fr/en key parity.

---

## 10. Lot H — Tests and quality

### H1. Complete and implement the simulator test plan

Complete `docs/testing/simulator-test-plan.md` with the cases coming from C2 and C3, then implement:
- *Unit tests*: `profitabilityCalculations`, `machineRevenueCalculations`, per-section Zod schemas, error counting in `useSimulatorValidation`, address search adapters, feasibility warnings module.
- *Functional tests*: full four-step journey, blocking and scrolling to the first error, project reset with redirect, localStorage persistence, fr/en toggling.

### H2. Full dashboard test plan

Write a plan covering functional, unit, integration, and security testing. The security section must explicitly verify data isolation between users, the impossibility of accessing another account's project, and non-disclosure of results to a user without an active pack.

### H3. Full workflow test

End-to-end scenario: anonymous visitor → full simulation → masked results → pack purchase → account creation → unlocked results → project visible in the dashboard → resuming and editing the project → generating a report.

---

## 11. Lot I — Site integration

### I1. Redirect the homepage button

On the homepage, "Profitability simulator" section, the "Try the free simulator" button must point to the new simulator instead of the old flow. To be done once responsive design (D2) is validated, so as not to expose an incomplete interface to public traffic.

---

## 12. Lot J — Security and operations

### J1. Clean up environment variables exposed on GitHub

**Context.** The Git repository currently contains a `.env` file with configuration values (Supabase public key, Stripe mode, etc.). Even though `VITE_SUPABASE_PUBLISHABLE_KEY` is a public key intended for the browser, the presence of a versioned `.env` file poses an operational risk: any future key rotation, any copy-paste mistake with a secret key, or any addition of a server variable (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, etc.) could be inadvertently committed. Server variables must never appear in the repository.

**Expected outcome.**
1. Remove the `.env` file from the Git repository while keeping it locally (`git rm --cached .env`).
2. Make sure `.env` is properly listed in `.gitignore` and remains so.
3. Rotate sensitive values: regenerate server-side (runtime) secrets in Lovable Cloud Secrets and, for public `VITE_*` variables, reconfigure them in the Lovable project's environment variables.
4. Verify that the current Supabase public key (`VITE_SUPABASE_PUBLISHABLE_KEY`) is properly rotated/renewed if it was exposed in Git history, or at minimum that the rotation procedure is documented.
5. Document for new developers how to retrieve the necessary values locally (via the Lovable interface or a secure channel) and how to create their own `.env` from the `.env.example` template without ever committing it.
6. Update the "Environment variables" section of `docs/simulateur-v2-onboarding.md` to reflect this new procedure.

**Points of attention.**
- This operation has no direct impact on the production application if the secrets are properly rebuilt in Lovable before the next deployment.
- Warn the team that once `.env` is removed from the repository, existing clones will need to be cleaned up manually so as not to reintroduce the file.

**Files involved.** `.env`, `.gitignore`, `.env.example`, `docs/simulateur-v2-onboarding.md`.

---

## 13. Lot K — Simulator administration

### K1. Simulator admin dashboard

**Context.** The project's Google Drive contains a use-case diagram (`UC-diagram_admin.png`) describing the expected functionality for the simulator administrator. Today, the platform back-office (`/admin/*`) manages users, billing, and the beta program, but there is not yet a section dedicated to monitoring and managing the paid simulator.

**Expected outcome.**
- Create a dedicated section in the platform back-office, for example `/admin/simulator` (or an equivalent route validated with the UX designers), to centralize simulator administration.
- Implement the use cases from the `UC-diagram_admin.png` diagram, typically:
  - Viewing and managing purchased packs (active, expired, to be renewed).
  - Tracking payments and Stripe transaction statuses.
  - List of projects/scenarios created by users, with read-only inspection capability.
  - Simulator usage statistics (number of simulations started, completed, purchase conversion rate).
  - Managing the simulator's commercial settings (pack prices, extension durations, usage limits).
- Respect the role separation of `public.platform_roles` (`super_admin`, `admin`, `billing`): the admin dashboard must be accessible to the relevant roles, without expanding an existing role's permissions.
- Protect access server-side: the edge functions used by this dashboard must check the user's role and never return sensitive data (keys, tokens, full payment information) to the client.
- Reuse components and patterns from the project dashboard (`src/pages/dashboard-simulator/`, `src/components/dashboard-simulator/`) where relevant, after the A3 code review.
- All displayed strings must go through i18n (fr/en locales).

**Points of attention.**
- The admin dashboard is distinct from the project owner dashboard (`/dashboard-simulator/*`). The former is an internal tool for the Lavcom team; the latter is a customer space for users who have purchased a pack.
- The Figma mockups for the admin dashboard, if they exist, should be reviewed before starting K1.
- Make sure the implementation stays consistent with the conventions of the existing admin section (`PlatformAdminRoute`, `AdminLayout`, `AdminSidebar`).

**Dependencies.** E3 (database schema), G2 (project dashboard back end), F3 (Stripe wired up).

**Files involved.** `src/pages/admin/simulator/` (to be created), `src/components/admin/simulator/` (to be created), `supabase/functions/admin-simulator-*` (to be created), fr/en locale files.

---

## 14. Recommended sequencing

```text
Phase 1 — Stabilization of the simulator
  A1 → A2
  B1 → B2 → B3
  C1, C2, C3
  D1
  J1

Phase 2 — Database
  C1 → E1 → E2 → E3

Phase 3 — Payment and dashboard
  A3 → G1
  E3 + F1 + F2 → F3
  E3 + G1 → G2 → G3
  G1 → G4
  E3 + F3 + G2 → K1

Phase 4 — Quality, testing, and launch
  D2 → D4
  D3
  C2 + C3 → H1 → H3
  G2 → H2
  D2 → I1
  Final cleanup of the legacy simulators
```

The critical path goes through `C1 → E1 → E2 → E3 → F3 / G2 → G3 → H3`. The admin dashboard (K1) depends on the project dashboard's back end (G2) and on Stripe (F3): it can be started as soon as these two work items are stable. Database design validation by Raul (E2) is the external dependency most likely to delay the whole effort: kick it off as early as possible.

---

## 15. Open decisions

| # | Question | Impact | Status |
|---|---|---|---|
| 1 | Allow different hours for each opening day? | Data model (E1), profitability calculations, step 1 UX | To be decided (see C1) |
| 2 | Granularity for displaying feasibility warnings: as-you-go at each step, or only in the summary? | UX, C2 | Assumption adopted: both, filtered by scope |
| 3 | How to carry the "pack active" state once the dashboard is operational: a React context fed by a query, or a check via an edge function every time results are displayed? | Results security, F3 | To be decided before F3 |
| 4 | Can a project hold several versioned scenarios, or is a scenario a project in its own right? | Data model (E1, E2) | To be decided with Raul |
| 5 | What happens to a project created in guest mode when the account is created: automatic migration or an explicit user choice? | G3 | To be decided before G3 |

Decisions made must be recorded in this table, with their date, rather than in a chat channel.

---

## 16. Reminder: final cleanup

Once the new simulator is delivered and validated in production, a removal phase must be planned:

1. Remove the `/simulateur` and `/simulation` routes along with their pages and components (`src/components/simulation/`, `src/pages/simulation/`).
2. Delete the hooks, types, and utilities used exclusively by these flows (`useSimulationProject`, `useSimulationValidation`, `src/types/simulation.ts`, etc.).
3. Fix all internal links, marketing calls to action, menu entries, sitemap, and redirects to point to the new simulator (set up permanent redirects from the old URLs to preserve SEO).
4. Clean up translation keys and tables that have become unused, after verifying that no user data is lost.

This cleanup is not a work item of this roadmap: it is the subject of a separate lot to be planned after going to production.
