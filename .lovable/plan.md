# Sécurisation du fichier `.env` et rotation des clés

## Point important avant d'agir

Les trois variables présentes dans `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) sont **publiques par conception** : elles sont compilées par Vite dans le bundle JavaScript envoyé au navigateur. N'importe quel visiteur de l'application peut déjà les lire. Ce ne sont pas des secrets ; la protection des données repose sur les politiques RLS, pas sur ces valeurs. La vraie clé sensible (`service_role`) n'est pas dans ce fichier et n'est jamais exposée au client.

Deuxième point : `.env` est un fichier **généré automatiquement** par la plateforme. Le supprimer casse le build et l'application publiée (le client backend s'initialise avec `undefined`). Il est déjà listé dans `.gitignore` (ligne présente et vérifiée), donc il n'est plus suivi par Git pour les futurs commits.

## Ce que je propose de faire

1. **Ne pas supprimer `.env`** du projet : il reste nécessaire au fonctionnement local et au build. Il est déjà ignoré par Git.
2. **Faire tourner les clés API** du backend : génération de nouvelles clés, invalidation des anciennes, mise à jour automatique du `.env` du projet et de la configuration interne.
3. **Te communiquer les nouvelles valeurs** des trois variables pour que tu les copies dans ton `.env` local.
4. **Vérifier** que l'application démarre toujours et que les requêtes backend passent après rotation.

## Conséquences de la rotation

- Toutes les sessions utilisateurs en cours seront invalidées (reconnexion nécessaire).
- Tout service externe utilisant l'ancienne clé cessera de fonctionner tant qu'il n'est pas mis à jour.
- L'URL et le `project_id` ne changent pas ; seule la clé publiable change.

## Détails techniques

- Rotation via l'outil de rotation des clés API de la plateforme (met à jour `.env` et désactive les anciennes clés legacy).
- `src/integrations/supabase/client.ts` lit `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` : aucun changement de code requis.
- Vérification post-rotation : lecture du `.env` régénéré + appel de test sur une table publique.

## Alternative si tu veux vraiment supprimer `.env`

Ce n'est possible qu'en cassant l'application, sauf à déconnecter puis reconnecter le backend, ce qui régénérerait de toute façon le même fichier. Je ne le recommande pas.
