
## Objectif

Intégrer les 4 pages Figma (`step1_tab1`, `step1_tab2`, `step2`, `step3`, `step4-results`) comme un **nouveau parcours visiteur statique** sous `/simulator/*`, sans toucher au parcours existant `/simulation/*` (qui reste tel quel pour l'espace SaaS authentifié).

Aucune logique métier : uniquement structure + données fictives + navigation entre étapes via `Link` / `useNavigate`.

Design : mapping sur les tokens Shadcn existants (`primary`, `muted-foreground`, `border`, `card`) — le vert lime `#a2c516` et l'orange `#f9941f` de Figma sont mappés respectivement sur `--primary` (SaaS Green) et `--brand` (Orange). Fonts Outfit + Inter déjà présentes dans le projet.

---

## Arborescence de fichiers à créer

```text
src/
├── layouts/
│   └── SimulatorLayout.tsx                 # Header minimal (logo + retour accueil) + <Outlet/>
│
├── pages/simulator/
│   ├── SimulatorProjectPage.tsx            # Route /simulator/project (étape 1, 2 onglets)
│   ├── SimulatorMachinesPage.tsx           # Route /simulator/machines (étape 2)
│   ├── SimulatorChargesPage.tsx            # Route /simulator/charges (étape 3)
│   └── SimulatorResultsPage.tsx            # Route /simulator/results (étape 4 + paywall)
│
└── components/simulator/
    ├── shared/
    │   ├── SimulatorStepper.tsx            # Barre horizontale 4 étapes (état actif/complété/à venir)
    │   ├── SimulatorPageHeader.tsx         # Titre + sous-titre + bouton "Réinitialiser"
    │   ├── SimulatorFooterNav.tsx          # Boutons "Retour" / "Continuer"
    │   ├── SectionHeading.tsx              # Titre H2 centré + description (répété dans chaque étape)
    │   └── FormField.tsx                   # Wrapper Label + input/select + hint (uniformise le rendu)
    │
    ├── project/                            # Étape 1
    │   ├── ProjectTabs.tsx                 # Tabs "Mon projet" / "Contraintes du local"
    │   ├── ProjectInfoForm.tsx             # Contenu onglet 1 (nom, ville, zone, surface, horaires…)
    │   ├── LocalConstraintsForm.tsx        # Contenu onglet 2 (forme, obstacles, accès, technique)
    │   ├── ProjectIdentityCard.tsx         # Card "Identité du projet"
    │   ├── LocationCard.tsx                # Card "Localisation" (ville + zone type)
    │   ├── SurfaceHoursCard.tsx            # Card "Surface & horaires"
    │   ├── LocalShapeCard.tsx              # Card "Forme du local"
    │   ├── StructuralObstaclesCard.tsx     # Card "Obstacles structurels"
    │   ├── AccessCard.tsx                  # Card "Accès au local"
    │   └── TechnicalConstraintsCard.tsx    # Card "Contraintes techniques"
    │
    ├── machines/                           # Étape 2
    │   ├── MachineMixSummary.tsx           # Bandeau récap (nb machines / capacité totale / CA estimé)
    │   ├── WashersConfigCard.tsx           # Card lave-linges (quantité par capacité + tarif)
    │   ├── DryersConfigCard.tsx            # Card sèche-linges
    │   ├── ExtraServicesCard.tsx           # Card options (centrale, distributeur, etc.)
    │   ├── MachineCounter.tsx              # Ligne "Type X kg" avec stepper +/- et prix
    │   └── PricingHintBanner.tsx           # Alert info tarifs recommandés
    │
    ├── charges/                            # Étape 3
    │   ├── FixedCostsCard.tsx              # Loyer, assurance, abonnements
    │   ├── VariableCostsCard.tsx           # Eau, électricité, produits, maintenance
    │   ├── FinancingCard.tsx               # Apport, emprunt, durée, taux
    │   ├── CostRow.tsx                     # Ligne libellé + input € + périodicité (mens/an)
    │   └── ChargesTotalsBanner.tsx         # Récap total charges fixes/variables
    │
    └── results/                            # Étape 4
        ├── ResultsHeroKpis.tsx             # 3 KPI cards floutés partiellement (CA / marge / ROI)
        ├── ResultsSummaryCard.tsx          # Récap projet (rappel des inputs clés)
        ├── PartialInsightsList.tsx         # Liste d'insights teasés (2 visibles, N floutés)
        ├── PaywallCallout.tsx              # Bloc CTA "Débloquer l'analyse complète"
        └── PackChoiceCard.tsx              # Card d'un pack (Essentiel / Pro), utilisée dans PaywallCallout
```

---

## Modifications du code existant

| Fichier | Changement |
|---|---|
| `src/App.tsx` | Ajouter les 4 routes sous `<Route element={<SimulatorLayout/>}>` (`/simulator/project`, `/simulator/machines`, `/simulator/charges`, `/simulator/results`) + redirect `/simulator` → `/simulator/project`. **Ne pas toucher** aux routes `/simulation/*`. |
| `src/pages/simulation/*` | **Inchangé** (parcours SaaS authentifié). |
| `src/components/simulation/*` | **Inchangé**. Les nouveaux composants vivent sous `src/components/simulator/` pour éviter toute collision. |
| `tailwind.config.ts` / `src/index.css` | **Aucune modification** — on utilise les tokens existants (`primary`, `brand`, `muted`, `border`, `card`, `foreground`). |
| `package.json` | **Aucune dépendance ajoutée** (Shadcn `Card`, `Tabs`, `Button`, `Input`, `Label`, `RadioGroup`, `Select` déjà présents). |

---

## Mapping Figma → tokens Shadcn

| Figma | Token utilisé |
|---|---|
| `#a2c516` (vert lime — étape active, CTA principal) | `bg-primary` / `text-primary` / `border-primary` |
| `#f9941f` (orange — bouton Réinitialiser, badges) | `bg-brand` / `text-brand` |
| `#383838` (texte titres) | `text-foreground` |
| `#737373` / `neutral-500` (texte secondaire) | `text-muted-foreground` |
| `#d9d9d9` / `#e6e6e6` (bordures, séparateurs) | `border-border` / `bg-muted` |
| `rgba(230,230,230,0.3)` (fond stepper) | `bg-muted/30` |
| Font `Outfit` (titres) | `font-heading` (déjà configuré) |
| Font `Inter` (corps) | `font-sans` (défaut) |

---

## Données fictives

Un seul fichier `src/components/simulator/mockData.ts` exporte des constantes typées (`MOCK_PROJECT`, `MOCK_MACHINES`, `MOCK_CHARGES`, `MOCK_RESULTS`) consommées par les pages. Aucune persistance, aucun hook, aucun appel API.

---

## Navigation

- `SimulatorFooterNav` reçoit `previousPath` et `nextPath` en props (ou `null` pour désactiver).
- Étape 4 : bouton "Retour" vers `/simulator/charges`, pas de "Continuer" — remplacé par le CTA paywall.
- Le `SimulatorStepper` reçoit `currentStep: 1 | 2 | 3 | 4` et rend les étapes précédentes cliquables (via `Link`).

---

## Hors périmètre (à traiter plus tard)

- Persistance des données saisies (localStorage / hook partagé).
- Validation des champs.
- Intégration du calcul de rentabilité réel.
- Branchement du paywall Stripe sur les packs.
- Migration éventuelle de `/simulation/*` vers cette nouvelle UI.

---

## Détails techniques

- Layout : `SimulatorLayout` = `<header>` sticky (h-16, logo + `<Link to="/">Accueil</Link>`) + `<SimulatorStepper/>` + `<main class="max-w-4xl mx-auto px-6 py-8">` + `<Outlet/>` + `<SimulatorFooterNav/>` rendu par chaque page.
- Toutes les Cards utilisent `<Card>` / `<CardHeader>` / `<CardTitle>` / `<CardContent>` de Shadcn avec l'icône Lucide en préfixe du titre (pattern déjà utilisé dans `StepLocal.tsx`).
- Les Tabs de l'étape 1 utilisent `<Tabs>` Shadcn (déjà utilisé dans `SimulationProjectPage.tsx`), valeurs `"project"` / `"local"`.
- Le paywall (étape 4) réutilise le pattern visuel de `SimulatorPaywall.tsx` existant mais dans un nouveau composant `PaywallCallout` propre au parcours (pas de dépendance croisée).
- Icônes : Lucide (`Building2`, `MapPin`, `Ruler`, `Clock`, `LayoutGrid`, `Construction`, `DoorOpen`, `Wrench`, `WashingMachine`, `Wind`, `Euro`, `TrendingUp`, `Lock`, `Sparkles`).
- Responsive : `grid gap-6 md:grid-cols-2` pour les paires de cards, stepper horizontal scrollable sur mobile (`overflow-x-auto`).

