# Fix : recherche d'adresse hors France bloquée par la CSP

## Cause

Quand l'utilisateur sélectionne un autre pays que la France (ex. Suisse), le hook `useAddressSearch` bascule sur l'API Nominatim (`https://nominatim.openstreetmap.org/search`). Les requêtes échouent immédiatement avec :

```
TypeError: Failed to fetch
```

Aucun code HTTP n'est renvoyé — la requête n'est jamais envoyée. C'est le comportement typique d'un blocage par la **Content-Security-Policy**.

Dans `index.html` ligne 12, la directive `connect-src` autorise uniquement :

```
connect-src 'self'
  https://betvwipgtcrhmludzgxw.supabase.co
  wss://betvwipgtcrhmludzgxw.supabase.co
  https://www.google-analytics.com
  https://www.googletagmanager.com
  https://region1.google-analytics.com
  https://api.stripe.com
  https://api-adresse.data.gouv.fr;
```

`https://nominatim.openstreetmap.org` n'y figure pas → le navigateur bloque le `fetch` avant émission, d'où l'absence de requête réseau observable et l'erreur générique. La BAN fonctionne parce qu'elle est déjà listée.

À noter : la mémoire projet `security/csp-configuration` documente cette CSP comme critique, il faut donc étendre la liste, pas la relâcher.

## Correctif

Ajouter le domaine Nominatim (et le domaine officiel `nominatim.osm.org` par sécurité) à `connect-src` dans `index.html` :

```html
connect-src 'self'
  https://betvwipgtcrhmludzgxw.supabase.co
  wss://betvwipgtcrhmludzgxw.supabase.co
  https://www.google-analytics.com
  https://www.googletagmanager.com
  https://region1.google-analytics.com
  https://api.stripe.com
  https://api-adresse.data.gouv.fr
  https://nominatim.openstreetmap.org;
```

Aucun autre fichier n'est modifié : le hook `useAddressSearch` gère déjà correctement Nominatim (parsing `address`, extraction `city/postcode/state`), il était simplement empêché d'émettre la requête.

## Point annexe (à ne pas corriger ici)

Le hook envoie l'en-tête `User-Agent: LavcomPerformances/1.0`. Les navigateurs ignorent silencieusement cette surcharge (header interdit côté client) — ce n'est **pas** la cause du blocage et cela peut rester en l'état ; Nominatim autorise les requêtes CORS sans User-Agent personnalisé.

## Fichiers modifiés

- `index.html` — extension unique de `connect-src`.

## Mémoire à mettre à jour

Mettre à jour `mem://security/csp-configuration` pour lister `nominatim.openstreetmap.org` parmi les domaines `connect-src` autorisés (autocomplétion adresse hors FR).

## Validation

1. Playwright sur `/simulator/project` :
   - Changer le pays en **Suisse**.
   - Taper `Rue du Rhône Genève` dans le champ adresse.
   - Vérifier qu'une requête `GET https://nominatim.openstreetmap.org/search?...&countrycodes=ch...` retourne **200** avec des résultats, et que le dropdown affiche des suggestions.
   - Sélectionner une suggestion → Ville et Code postal se remplissent.
2. Non-régression FR : repasser sur France, vérifier que la BAN répond toujours.
