# Hook Dependency Description

This document maps the 90 custom React hooks in `src/hooks/` and their interdependencies.

## Tier 0 — Foundation (no internal hook deps)
- `useAuth` — Supabase session + user; **base** of nearly the entire tree (depends only on `useAuditLog` for logging).
- `useAuditLog` — append rows to `audit_logs`.
- `useDateRange` (Context) — global selected period.
- `useRefreshState` — query invalidation pulse.
- `useDebounce`, `useFormatters`, `useLocale`, `useFormPersistence`, `useScrollReveal`, `useRipple`, `use-mobile`, `use-theme`, `use-toast` — pure UI utilities.
- `useDeviceFingerprint`, `useABVariant`, `useFeatureFlag` — environment/experiment.
- `useCitySearch`, `useAddressSearch` — `api-adresse.data.gouv.fr`.
- `usePasswordBreachCheck` — HIBP k-anonymity.

## Tier 1 — Identity & Site context
Depend directly on `useAuth`:
- `useIsAdmin`, `usePlatformRole`, `useIsBetaCompany`
- `useOrganization`, `useActiveLaundromat`, `useCurrentSite`
- `useSites` (also uses `useAuditLog`)
- `useImportBatches`, `useOperations`
- `useChartPreferences`, `useUserGoals`, `useUxFeedback`
- `useSecurityHealth`, `useDashboardStats`, `useDataQuality`
- `useAIUsage`, `useDemoMode`, `useRecommendationsSuppressed`
- `useBetaStatus`

## Tier 2 — Site-scoped data
Depend on `useCurrentSite` (and often `useAuth`):
- `useAnalyticsState`, `useChartsData` (+ `useDateRange`)
- `useHasOperations`, `useDataQuality`
- `useDemoContext`
- `useSiteCosts`

## Tier 3 — Feature aggregators
- `useProfitability` ← `useCurrentSite` + `useDashboardStats` + `useSiteCosts`
- `useSetupProgress` ← `useAuth` + `useCurrentSite` + `useImportBatches` + `useSites`
- `useOnboardingStatus` ← `useDashboardStats` + `useImportBatches` + `useSites`
- `useHasData` ← `useImportBatches`
- `useCanonicalImport` ← `useAuth` + `useAnalyticsRefresh`
- `useMultiFormatImport` ← `useAuth` + `useAnalyticsRefresh`
- `useOperationsImport` ← `useAuth` + `useAnalyticsRefresh`
- `useOrganizationPrivacySettings` ← `useAuth` + `useOrganization`

## Tier 4 — Beta & onboarding
- `useBetaOnboarding` ← `useAuth` + `useBetaEvents` + `useIsBetaCompany`
- `useBetaChecklistTracker` ← `useActiveLaundromat` + `useBetaEvents` + `useBetaOnboarding`
- `useBetaConversionReadiness`, `useBetaEvents`

## Tier 5 — Subscription / billing / simulator
- `useSubscription`, `useSimulatorAccess`, `useSimulatorAddons`, `useSimulatorCheckout`
- `useFinAccess` (auto-provisions `fin_workspaces` for super-admins)
- `useFinProjects`, `useFinHypotheses`, `useFinLineItems`, `useFinForecast`
- `useSimulationProject`, `useSimulationValidation`

## Tier 6 — Security & MFA
- `useMfaChallenge`, `useMfaGatedAction`
- `useLoginLogger`, `useLoginSecurity`, `useAuthSecurityLogs`
- `useLogout`
- `usePermissionAuditLogs`, `useUserPermissions`, `useCurrentUserPermissions`
- `usePlatformReadiness`

## Tier 7 — Tutorial / view modes
- `useTutorial`, `useViewMode`, `useUnsavedChangesWarning`, `useActiveSection`
- `useDuplicateCheck`, `useImportRateLimit`, `useSecureUpload`
- `useExportJobs`, `useAnalytics` (GTM), `useAnalyticsRpc`, `useAnonymousBenchmarks`
- `useLaundromatStatus`, `useOnboarding`

## Critical guardrails
- `ProtectedRoute` MUST consume `usePlatformRole().isPlatformSuperAdmin` **before** `useSubscription` to avoid billing-state flicker for super-admins.
- `useFinAccess` auto-creates a `fin_workspaces` row for super-admins on first call.
- Hooks invalidating analytics (`useMultiFormatImport`, `useOperationsImport`, `useCanonicalImport`) must call `useAnalyticsRefresh` to push fresh KPIs to the dashboard.
- `useDateRange` is a **Provider** (`<DateRangeProvider>`) — never call it outside the tree.
