## Objectif

Créer un tableau de bord **porteurs de projet** entièrement nouveau et isolé sous `/dashboard-simulator`, en build statique piloté par des mocks, avec des contrats de hooks prêts pour un branchement backend ultérieur. Aucune logique métier, aucun appel base de données dans cette passe.

## Vérifications effectuées

- `src/components/ui/sidebar.tsx` existe (API complète sidebar-07) et n'est utilisé nulle part → première utilisation réelle.
- `chart.tsx`, `empty-state.tsx`, `breadcrumb.tsx`, `collapsible.tsx`, `theme-toggle.tsx`, `field.tsx`, `form-card.tsx`, etc. sont disponibles.
- `recharts` est bien installé ; **`@tanstack/react-table` n'est pas installé** → à ajouter.
- `ProtectedRoute` existe et est déjà utilisé sur `/projections` et `/admin`.
- `/simulator-payment-success` est déjà routé (ligne 174 de `App.tsx`), `PaywallCallout.tsx` a bien un bouton « Découvrir les formules » sans `onClick`.
- Les 12 fichiers HTML de `dashboard.zip` sont des exports de maquette (styles inline, positionnement absolu). Ils serviront de **référence visuelle** (structure, contenu, hiérarchie, KPI) ; le rendu sera reconstruit avec les tokens du design system existant, pas en copiant le HTML.

## Isolation (règle dure)

Aucun import croisé entre `src/components/dashboard/` (opérateurs) et `src/components/dashboard-simulator/`. Le nouveau `DashboardLayout` n'enveloppe jamais `AppLayout` et n'utilise aucun provider SaaS (`DateRangeProvider`, `useActiveLaundromat`, `ViewModeProvider`).

## Étapes d'implémentation

**Phase 1 — Fondations**
1. Ajouter `@tanstack/react-table`.
2. `src/types/dashboard-simulator.ts` : `DashboardProject`, `DashboardScenario`, `DashboardReport`, `DashboardInvoice`, `PackInfo`, `MockUser`, `ActivityItem`.
3. `src/mocks/dashboard-simulator/` : ~15 projets, listes de scénarios de longueurs variables (0 à 8, pour tester overflow et empty states), rapports, factures, activité, utilisateur.
4. `src/hooks/dashboard-simulator/` : 6 hooks au contrat `{ data, isLoading, error }`, délai simulé 300–500 ms, recherche/tri **réellement appliqués** aux mocks.
5. `src/constants/dashboard-simulator/*.strings.ts` : tout le texte FR centralisé par domaine.
6. `RequireAuth.tsx` (contexte utilisateur mocké, aucun réseau) + `DashboardRouteGuard.tsx` (bascule via `import.meta.env.VITE_DEV_MODE`).
7. `DashboardLayout` + `AppSidebar` (nav principale, nav Projets → Scénarios en collapsible 2 niveaux, widget Pack, footer avec `ThemeToggle` + avatar) + `DashboardBreadcrumb` + `WelcomeHeader`.
8. Groupe de routes dans `App.tsx`, avec `/projects/comparator` déclaré **avant** `/projects/:projectId`.

**Phase 2 — Overview + Projets**
`DashboardPage` (PackSummary, ProjectsStats, ProjectsPreviewList, RecentActivity, Suggestions) et `ProjectsPage` (toolbar recherche/tri fonctionnelle, grille de cartes, barre de comparaison, bannière d'expiration, empty state).

**Phase 3 — Scénarios**
`ScenariosPage` (résumé projet, toolbar, carte scénario de référence, grille, empty state) et l'éditeur (`ProjectDetailPage`, `ScenarioDetailPage`) : stepper, sélecteur de scénario principal, formulaire localisation, sidebar KPI, `RevenueBreakdownChart`.

**Phase 4 — Comparateurs**
`ProjectComparisonPage` (radar Recharts) et `ScenarioComparisonPage` (trajectoire ROI Recharts), avec toolbar, cartes d'entité, cartes de delta et synthèse.

**Phase 5 — Achats + Compte**
`PurchasesPage` (pack actif, add-ons, `InvoicesTable` DataTable) et `MyAccountPage` (profil, infos perso, mot de passe, préférences, suppression de compte).

**Phase 6 — Rapports**
`ReportsPage` avec `ReportsTable` (DataTable TanStack) + toolbar + empty state.

**Phase 7 — Navigation provisoire**
- `PaywallCallout.tsx` : câbler « Découvrir les formules » vers `/simulator-payment-success?pack=...`.
- `SimulatorPaymentSuccess.tsx` : bloc Durée / Projets / Expire le, puis deux boutons — « Voir mes résultats » → `/dashboard-simulator/projects/:premierProjetMock` et « Accéder à mon tableau de bord » → `/dashboard-simulator`, avec le texte « Un email de confirmation vous a été envoyé » repositionné dessous.

## Détails techniques

- Arborescence exactement conforme à la section 11 du brief (`components/dashboard-simulator/{layout,overview,projects,scenarios,editor,comparison,reports,purchases,account,shared}`, `pages/dashboard-simulator/`, `hooks/dashboard-simulator/`, `types/`, `constants/`, `mocks/`).
- Primitives génériques réutilisables dans `shared/` : `StatusBadge`, `DeltaPill`, `KpiTile`, `DataTable`.
- Couleurs et ombres via les tokens existants (`shadow-form`, `bg-primary`, etc.) — aucune couleur en dur.
- `VITE_DEV_MODE` documentée ; par défaut le guard mocké est actif tant que le flux réel n'est pas branché.
- Empty states prévus dès maintenant pour projets, scénarios et rapports.

## Hors périmètre

Aucun appel Supabase, aucune écriture en base, aucune modification du dashboard opérateurs existant, aucun changement du paywall Stripe réel.
