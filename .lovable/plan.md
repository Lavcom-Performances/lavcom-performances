# Correction du bug "5 5 avenue Charles de Gaulle"

## Cause

Dans `src/hooks/useAddressSearch.ts` (branche FR, lignes 91-93), on construit `address` ainsi :

```ts
const address = p.housenumber
  ? `${p.housenumber} ${p.name ?? ""}`.trim()
  : String(p.name ?? p.label);
```

Or l'API BAN (`api-adresse.data.gouv.fr/search/`) renvoie déjà, pour un résultat de type `housenumber`, un champ `properties.name` qui **inclut le numéro de rue**. Exemple concret pour "5 avenue Charles de Gaulle" :

```json
{
  "label": "5 Avenue Charles de Gaulle 75008 Paris",
  "name": "5 Avenue Charles de Gaulle",
  "housenumber": "5",
  "street": "Avenue Charles de Gaulle",
  "postcode": "75008",
  "city": "Paris",
  "type": "housenumber"
}
```

En concaténant `housenumber` + `name`, on obtient donc `"5 5 Avenue Charles de Gaulle"`, qui est ensuite écrit dans l'input via `setInputValue(r.address)` au moment de la sélection dans `AddressAutocomplete.tsx`.

C'est un vestige de l'ancienne API `data.geopf.fr` où `name` correspondait uniquement au nom de la voie (sans numéro). Sur la BAN actuelle ce n'est plus le cas.

## Correctif

Dans `src/hooks/useAddressSearch.ts`, remplacer la construction de `address` par une version qui n'ajoute le `housenumber` que si `p.name` ne le contient pas déjà. Le plus propre est d'utiliser `p.street` (nom de voie sans numéro) quand `housenumber` est présent, avec fallback sur `p.name` :

```ts
// BAN : pour un résultat "housenumber", p.name inclut déjà le numéro.
// On préfère donc utiliser p.name tel quel, et ne recomposer à partir
// de p.street que si p.name est absent.
const address = p.housenumber && p.street
  ? `${p.housenumber} ${p.street}`.trim()
  : String(p.name ?? p.label ?? "").trim();
```

Comportement final :
- Type `housenumber` avec `street` → `"5 Avenue Charles de Gaulle"` (via `housenumber + street`).
- Type `housenumber` sans `street` (rare) → `p.name` brut.
- Type `street` / `municipality` / `locality` → `p.name` (nom de rue ou ville).

## Fichiers modifiés

- `src/hooks/useAddressSearch.ts` — lignes 91-93 uniquement, aucun autre changement.

## Validation

1. `bunx tsgo --noEmit` — type-check.
2. Playwright sur `/simulator/project` : taper "5 avenue Charles de Gaulle", sélectionner la première suggestion, vérifier que l'input affiche exactement `"5 Avenue Charles de Gaulle"` (screenshot) et que Ville / Code postal se remplissent (`Paris` / `75008`).
3. Cas de non-régression : taper "Paris" et sélectionner une commune (résultat de type `municipality`, sans `housenumber`) → l'adresse doit rester `"Paris"`.
