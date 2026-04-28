## Objectif
Corriger 2 points relevés dans l'audit sécurité frontend, en respectant le mandat "additif, non-breaking".

---

## 1. Bug — `src/components/settings/PaymentStatusIndicators.tsx`

**Problème** : L'indicateur "Mode" lit `VITE_SUPABASE_PUBLISHABLE_KEY` (un JWT Supabase) pour deviner si Stripe est en TEST/LIVE. Ce JWT ne commence jamais par `pk_test_` / `pk_live_` → l'indicateur affiche toujours `UNKNOWN`.

**Correction** (lignes 22-26) : Lire d'abord une variable dédiée `VITE_STRIPE_MODE` (`"test"` ou `"live"`), avec fallback sur `VITE_STRIPE_PUBLISHABLE_KEY` si présente. Si rien n'est défini → reste `UNKNOWN` (comportement actuel préservé, donc non-breaking).

```ts
const stripeModeEnv = (import.meta.env.VITE_STRIPE_MODE || '').toLowerCase();
const stripePubKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const isTestMode = stripeModeEnv === 'test' || stripePubKey.startsWith('pk_test_');
const isLiveMode = stripeModeEnv === 'live' || stripePubKey.startsWith('pk_live_');
```

Aucune autre logique du composant n'est touchée. Aucun fichier supplémentaire à modifier.

---

## 2. Durcir `.gitignore`

Ajouter en fin de fichier un bloc `# Env files` ignorant explicitement les `.env*` (le `.env` actuel ne contient que des `VITE_*` publics, donc aucun risque immédiat — c'est de la défense en profondeur pour éviter qu'un futur `.env.local` avec des secrets soit committé par erreur).

Ajout :
```
# Env files
.env
.env.local
.env.*.local
.env.development
.env.production
```

Note : `*.local` est déjà couvert ligne 13, mais on rend l'intention explicite.

---

## Hors scope (volontairement)
- Pas de changement sur la documentation (`docs/SECURITY.md`, `security-checklist.md`) — l'audit n'a révélé aucune vulnérabilité réelle à documenter.
- Pas de modification de `.env` (auto-généré, interdit).
- Pas de refactor des `price_xxx` Stripe codés en dur — ils sont publics par design Stripe et leur centralisation actuelle dans `stripeConfig.ts` / `stripePriceMap.ts` est déjà correcte.

---

## Fichiers modifiés
- `src/components/settings/PaymentStatusIndicators.tsx` (5 lignes remplacées par 10)
- `.gitignore` (6 lignes ajoutées)

Aucun risque de régression : le mode `UNKNOWN` reste le défaut tant que personne ne définit les nouvelles variables.