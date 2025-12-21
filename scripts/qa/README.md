# QA Smoke Test Suite - Lavcom Performances

## Description

Suite de tests automatisés pour valider :
- **Isolation multi-tenant (RLS)** sur `sites`, `operations`, `import_batches`
- **Rate limiting** sur login/signup/import/export + edge functions
- **Edge Functions** : `fetch-from-siret`, `create-demo`, `import-csv-check`
- **Sécurité** : logs anonymisés, ownership checks

## Prérequis

1. Node.js 18+ avec support TypeScript
2. Accès à l'instance Supabase (URL + clés)
3. Deux comptes utilisateur de test

## Installation

```bash
# Installer les dépendances
npm install @supabase/supabase-js typescript ts-node @types/node

# Ou avec bun
bun add @supabase/supabase-js
```

## Configuration

Créer un fichier `.env.qa` à la racine du projet :

```env
# Supabase
SUPABASE_URL=https://betvwipgtcrhmludzgxw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...  # Optionnel, pour cleanup

# Utilisateurs de test
TEST_USER_A_EMAIL=qa-test-a@votredomaine.com
TEST_USER_A_PASSWORD=MotDePasseSecurise123!
TEST_USER_B_EMAIL=qa-test-b@votredomaine.com
TEST_USER_B_PASSWORD=MotDePasseSecurise456!
```

⚠️ **Important** : Ne jamais committer ce fichier ! Il est dans `.gitignore`.

## Exécution

### Méthode 1 : npx (recommandé)

```bash
# Charger les variables d'environnement et exécuter
source .env.qa && npx ts-node scripts/qa/smoke.ts
```

### Méthode 2 : npm script

Ajouter dans `package.json` :

```json
{
  "scripts": {
    "qa:smoke": "ts-node scripts/qa/smoke.ts"
  }
}
```

Puis :

```bash
source .env.qa && npm run qa:smoke
```

### Méthode 3 : bun

```bash
source .env.qa && bun run scripts/qa/smoke.ts
```

## Interprétation des résultats

### Sortie console

```
============================================================
  LAVCOM PERFORMANCES - QA SMOKE TEST SUITE
  TAEX-107 - Multi-tenant Isolation & Rate Limiting
============================================================

--- SETUP ---

✓ User A: qa***@vot*** (a1b2c3d4...)
✓ User B: qa***@vot*** (e5f6g7h8...)
✓ Site A: 12345678...
✓ Site B: 87654321...

--- RLS ISOLATION TESTS ---

✓ PASS: RLS: User A cannot see User B sites
  User A cannot access User B site (RLS working)
✓ PASS: RLS: User A cannot see User B operations
  RLS blocked query with error (expected)
...

--- TEST SUMMARY ---

  Total:  9
  Passed: 9 ✓
  Failed: 0 ✗
  Rate:   100.0%
```

### Codes de sortie

- `0` : Tous les tests passent ✓
- `1` : Au moins un test a échoué ✗

## Tests inclus

| Test | Description | Criticité |
|------|-------------|-----------|
| RLS: Sites isolation | User A ne voit pas les sites de User B | 🔴 Critique |
| RLS: Operations isolation | User A ne voit pas les opérations de User B | 🔴 Critique |
| RLS: Import batches isolation | User A ne voit pas les imports de User B | 🔴 Critique |
| RLS: Cross-insert blocked | User A ne peut pas insérer sur un site de User B | 🔴 Critique |
| Rate limit: import-csv-check | 1 import / 2 min / site | 🟡 Important |
| Rate limit: create-demo | 1 création / 24h / user | 🟡 Important |
| Rate limit: fetch-from-siret | 10 appels / 5 min | 🟡 Important |
| Security: Ownership check | Edge function vérifie la propriété du site | 🔴 Critique |
| Security: Safe logs | Rappel de vérification manuelle | 🟢 Info |

## Checklist SQL

Pour des vérifications manuelles approfondies, voir [`sql-checklist.md`](./sql-checklist.md).

## Checklist Responsive

Écrans à vérifier visuellement sur mobile (375px) et tablette (768px) :

- [ ] Login (`/login`)
- [ ] Signup (`/signup`)
- [ ] Import CSV (dialog)
- [ ] Multi-import wizard
- [ ] Dashboard
- [ ] Comparatif sites
- [ ] Profil

## Dépannage

### "Cannot find module '@supabase/supabase-js'"

```bash
npm install @supabase/supabase-js
```

### "User A failed to authenticate"

1. Vérifier que les utilisateurs de test existent
2. Vérifier que "Confirm email" est désactivé dans les paramètres auth
3. Créer manuellement les utilisateurs via l'interface

### Tests rate limit échouent

Les rate limits peuvent avoir été atteints lors d'exécutions précédentes. Attendre le cooldown ou nettoyer la table `rate_limits` :

```sql
DELETE FROM rate_limits WHERE identifier LIKE '%qa-test%';
```

## Intégration CI (futur)

```yaml
# .github/workflows/qa.yml
name: QA Smoke Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run qa:smoke
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          # ... autres secrets
```
