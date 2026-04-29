## Objectif

Produire un fichier `simulateur-gratuit.zip` (dans `/mnt/documents/`) contenant un projet **Vite + React 18 + TypeScript + Tailwind + shadcn/ui** autonome, exécutable hors de Lovable, qui reproduit exactement le simulateur gratuit accessible sur `/simulateur`.

## Périmètre fonctionnel inclus

1. **Page d'accueil = `/`** rendant directement `SimulateurPage` (le projet n'a qu'une seule route principale).
2. **Gate de qualification** (`SimulatorQualification`) : étape, capital, nombre de machines.
3. **Simulateur de CA** : surface, horaires, templates (small/standard/large), parc machines (laveuses/sécheuses S/M/L), prix personnalisables, affluence → calcul du CA journalier/mensuel.
4. **Capture email post-résultat** (`FreeEmailCaptureModal`) → calcul ICI/Gap/segmentation.
5. **Écran de redirection segmentée** (`SegmentedRedirect`) avec recommandation par segment (A/B/C/D).
6. **Footer + SEOHead** simplifiés.

## Ce qui est retiré / remplacé (pour l'autonomie)

| Élément Lovable | Remplacement dans le ZIP |
|---|---|
| `@/integrations/supabase/client` | Stub : log du lead en console + sauvegarde `localStorage`. Un fichier `src/integrations/leadSink.ts` documente comment brancher un backend (fetch POST sur n'importe quelle API). |
| Edge function `create-simulator-lead` + `send-simulator-summary` | Fournies en bonus dans `extras/edge-functions/` (code source Deno) avec un README expliquant le déploiement Supabase optionnel. |
| `react-i18next` (clés `app:simulateur.*`) | Strings FR codées en dur (le projet conserve la même UI sans dépendance i18n). |
| `useABVariant` (table Supabase) | Hook simplifié renvoyant toujours variant `"A"` + label CTA fixe. |
| `trackEmailSubmitted`, `trackSimulationStep`, GTM | `src/lib/analytics.ts` no-op (logs `console.debug`) — point d'extension documenté. |
| `UxClarityQuestion` (dépend de Supabase) | Retiré (composant non essentiel au simulateur). |
| Footer avec liens vers `/pricing`, `/login`, etc. | Footer minimal avec mentions + lien vers `lavcom.fr`. |
| Tokens couleur `lavcom-orange*` | Ajoutés dans `tailwind.config.ts` du nouveau projet. |
| Logo + ebook (`src/assets/*.jpg/png`) | Copiés tels quels dans le ZIP. |

## Structure du projet livré

```text
simulateur-gratuit/
├── README.md                    # install, dev, build, comment brancher un backend
├── package.json                 # react, vite, tailwind, shadcn deps, lucide-react
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── tailwind.config.ts           # tokens lavcom-orange + design system
├── postcss.config.js
├── index.html
├── components.json              # config shadcn
├── .gitignore
├── public/
│   └── placeholder.svg
└── src/
    ├── main.tsx
    ├── App.tsx                  # rend SimulateurPage
    ├── index.css                # variables HSL + reset
    ├── vite-env.d.ts
    ├── assets/
    │   ├── lavcom-performances-header.png
    │   └── ebook-avant-ouvrir.jpg
    ├── lib/
    │   ├── utils.ts             # cn()
    │   └── analytics.ts         # no-op trackers
    ├── integrations/
    │   └── leadSink.ts          # remplace supabase, persiste leads
    ├── hooks/
    │   └── useABVariant.ts      # version simplifiée
    ├── components/
    │   ├── ui/                  # button, card, input, label, dialog (shadcn minimum)
    │   ├── SimulatorQualification.tsx
    │   ├── seo/SEOHead.tsx      # version sans react-helmet (document.title)
    │   ├── layout/Footer.tsx    # version minimale
    │   ├── free-simulator/
    │   │   └── FreeEmailCaptureModal.tsx
    │   └── simulation/
    │       └── SegmentedRedirect.tsx
    └── pages/
        └── SimulateurPage.tsx
└── extras/
    └── edge-functions/          # OPTIONNEL — pour brancher Supabase
        ├── README.md
        ├── create-simulator-lead/index.ts
        └── send-simulator-summary/index.ts
```

## Étapes d'exécution (build mode)

1. **Créer l'arborescence** `/tmp/simulateur-gratuit/` avec tous les fichiers de config (package.json, vite, tailwind, tsconfig, postcss, components.json, index.html, .gitignore).
2. **Copier les composants source** depuis ce projet :
   - `src/pages/SimulateurPage.tsx`
   - `src/components/SimulatorQualification.tsx`
   - `src/components/free-simulator/FreeEmailCaptureModal.tsx`
   - `src/components/simulation/SegmentedRedirect.tsx`
   - `src/components/seo/SEOHead.tsx`, `src/components/layout/Footer.tsx`
   - `src/lib/utils.ts`
   - Les composants shadcn nécessaires (`button`, `card`, `input`, `label`, `dialog`)
   - Assets `lavcom-performances-header.png`, `ebook-avant-ouvrir.jpg`, `placeholder.svg`
3. **Adapter chaque fichier copié** pour retirer les dépendances Lovable :
   - Remplacer imports `@/integrations/supabase/client` → `@/integrations/leadSink`
   - Retirer `useTranslation` → strings FR en dur
   - Retirer `react-i18next` complètement
   - Retirer `UxClarityQuestion` de `SimulateurPage`
   - Footer simplifié (sans liens internes inexistants)
   - SEOHead version `useEffect` + `document.title` (pas de `react-helmet-async`)
   - `EmailCaptureModal` (référence dans `SegmentedRedirect`) → définir le type `LeadData` localement
4. **Ajouter les fichiers stub** : `leadSink.ts`, `analytics.ts` no-op, `useABVariant.ts` simplifié.
5. **Copier les Edge Functions** dans `extras/edge-functions/` avec README de déploiement.
6. **Rédiger le README principal** : prérequis, `npm install`, `npm run dev`, comment activer la persistance backend (3 lignes à modifier dans `leadSink.ts`).
7. **Tester la cohérence** : `tsc --noEmit` rapide dans `/tmp/simulateur-gratuit/` pour s'assurer qu'il n'y a pas de référence cassée.
8. **Zipper** vers `/mnt/documents/simulateur-gratuit.zip` (via `nix run nixpkgs#zip`).
9. **Livrer** via `<lov-artifact>`.

## Détails techniques (dépendances npm finales)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.x",
    "lucide-react": "^0.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "@radix-ui/react-dialog": "^1.x",
    "@radix-ui/react-label": "^2.x",
    "@radix-ui/react-slot": "^1.x"
  },
  "devDependencies": {
    "vite", "@vitejs/plugin-react-swc", "typescript",
    "tailwindcss", "tailwindcss-animate", "autoprefixer", "postcss",
    "@types/react", "@types/react-dom"
  }
}
```

## Validation finale

- Le projet doit `npm install && npm run dev` sans erreur.
- L'utilisateur navigue sur `http://localhost:5173`, voit la qualification → simulateur → email capture → écran segmenté.
- Les leads s'affichent en console + persistance `localStorage` sous la clé `simulateur_leads`.
- Aucun appel réseau vers Supabase / Lovable n'est requis pour fonctionner.

## Hors périmètre (volontairement)

- Authentification, paywall, abonnement Stripe (`/subscribe-simulator` reste un lien externe inactif dans le ZIP).
- Système d'A/B testing complet, GTM, analytics avancés.
- Tests automatisés.
- i18n multi-langues.

Ces éléments peuvent être ajoutés ultérieurement, mais ne font pas partie du "simulateur gratuit" minimal demandé.
