# Création d'un fichier `.env.example`

## Objectif

Créer un fichier racine `.env.example` qui liste, décrit et catégorise toutes les variables d'environnement nécessaires au projet Lavcom Performances, sans jamais exposer de valeur secrète.

## État actuel

- Seul un fichier `.env` existe à la racine. Il contient les variables publiques Supabase (URL, clé publique, project ID).
- Aucun fichier `.env.example` n'est présent.
- Le projet utilise à la fois des variables Vite (préfixées `VITE_`) et des secrets de Edge Functions (Deno, stockés dans Lovable Cloud / Supabase Vault).
- Un manifeste de secrets existe déjà : `src/config/secretsManifest.ts`.

## Plan d'implémentation

1. **Créer le fichier `.env.example` à la racine du projet.**
   - Utiliser des valeurs vides ou des placeholders explicites (`your_...` / `https://...`) jamais de vraies valeurs.
   - Organiser le fichier en sections claires :
     - `# Application Vite (public, build-time)`
     - `# Edge Functions / Backend (secrets à configurer dans Lovable Cloud Secrets)`
     - `## Required`
     - `## Optional`
     - `# Local / CI (uniquement pour tests ou dev local)`

2. **Variables à inclure.**

   **Section Vite (public)**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID` (non lu directement dans le code, mais utile pour tooling/CLI Supabase)
   - `VITE_STRIPE_PUBLISHABLE_KEY` (utilisé quand `VITE_STRIPE_MODE` vaut `live`)
   - `VITE_STRIPE_MODE` (`test` ou `live`)
   - `VITE_DEV_MODE` (`true`/`false` pour certains helpers de dev)

   **Section Edge Functions / Secrets requis**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `RESEND_TO_EMAIL`
   - `SITE_URL` ou `APP_BASE_URL` (URL canonique du site, utilisée par les emails et certains Edge Functions)

   **Section Edge Functions / Secrets optionnels**
   - `SLACK_WEBHOOK_URL`
   - `DEMO_SITE_ID_ALLOWLIST`
   - `SCREENSHOTONE_API_KEY`
   - `SIRENE_API_KEY`
   - `BACKUP_CALLBACK_SECRET`
   - `GITHUB_PAT` / `GITHUB_REPO` (si utilisés par les fonctions de backup)
   - `ADMIN_ALERT_EMAIL`
   - `ENVIRONMENT` (`staging`, `production`)
   - `LOVABLE_API_KEY` (si appel direct au Lovable AI Gateway)

   **Section Local / Tests (process.env)**
   - `TEST_USER_A_EMAIL`
   - `TEST_USER_A_PASSWORD`
   - `TEST_USER_B_EMAIL`
   - `TEST_USER_B_PASSWORD`
   - `NODE_ENV`

3. **Conseils et avertissements dans le fichier.**
   - Ajouter un commentaire en haut indiquant de copier le fichier en `.env` et de ne jamais commiter `.env`.
   - Indiquer que les variables `VITE_` sont exposées côté client.
   - Indiquer que les variables `SUPABASE_SERVICE_ROLE_KEY` et `STRIPE_SECRET_KEY` ne doivent jamais être utilisées dans le navigateur.
   - Mentionner que pour Lovable Cloud, les secrets backend sont configurés via l'interface Cloud / Secrets, pas dans `.env`.

4. **Vérification.**
   - Lire le fichier généré pour s'assurer qu'il ne contient aucune valeur sensible réelle.
   - S'assurer qu'il est bien à la racine et non dans `src/`.
   - Vérifier que toutes les variables effectivement utilisées dans le code ont été répertoriées (re-scanner `Deno.env.get`, `import.meta.env` et `process.env` après coup si besoin).

## Livrables

- Nouveau fichier : `.env.example`

## Non inclus dans ce plan

- Modification du fichier `.env` existant.
- Modification de la logique de chargement des variables.
- Création d'un script de validation automatique.
