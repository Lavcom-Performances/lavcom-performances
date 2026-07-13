# Diagnostic

## Test effectué
Playwright sur `/simulator/project` → focus sur `#address` → frappe "10 rue de rivoli".
Résultat observé :
- Aucune requête réseau vers `api-adresse.data.gouv.fr` n'est déclenchée.
- Aucun log `[AddressSearch] Fetching FR addresses:` n'apparaît dans la console.
- La liste déroulante ne s'ouvre jamais.

## Cause racine
Dans `src/components/simulator/project/AddressAutocomplete.tsx`, la synchronisation `value` (prop) ↔ `inputValue` (state local) casse le flux :

```tsx
// Sync quand le parent modifie la valeur (ex. reset au changement de pays).
useEffect(() => {
  setInputValue(value);
  setIsUserTyping(false);   // ← problème
}, [value]);
```

Enchaînement à chaque frappe :

```text
user tape "1"
  → handleChange
    → setIsUserTyping(true)
    → onInputChange("1")
      → parent handleAddressInputChange
        → onProjectLocationChange({ ...projectLocation, address: "1", city: "", ... })
          → parent re-render, prop `value` passe à "1"
            → useEffect([value]) se déclenche
              → setIsUserTyping(false)   ❌ annule l'intention de recherche
```

Le hook `useAddressSearch` est appelé avec :
```tsx
useAddressSearch(justSelected || !isUserTyping ? "" : inputValue, 3, country)
```
Comme `isUserTyping` retombe à `false` immédiatement après chaque keystroke, la query envoyée au hook est toujours `""` → jamais de fetch.

Ce bug n'existe pas dans le composant legacy `src/components/simulation/AddressAutocomplete.tsx` parce qu'il est **non contrôlé** (le parent ne réécrit pas `value` pendant la frappe). Ici on l'a rendu **contrôlé** pour piloter city/postalCode → il faut adapter la logique de sync.

# Correctif proposé

Un seul fichier à modifier : `src/components/simulator/project/AddressAutocomplete.tsx`.

Ne synchroniser depuis la prop `value` que quand elle diverge **réellement** de l'état interne (cas légitime : reset au changement de pays, sélection d'une suggestion qui remplit `address`). Ne pas réinitialiser `isUserTyping` dans ce sync — laisser la frappe piloter ce flag.

```tsx
// Sync uniquement quand la prop diffère de l'état interne
// (reset pays, hydratation initiale, sélection). On NE touche PAS à
// isUserTyping ici : sinon chaque keystroke, qui remonte via
// onInputChange -> parent -> value, effacerait l'intention de recherche.
useEffect(() => {
  setInputValue((prev) => (prev === value ? prev : value));
}, [value]);
```

Effets attendus :
- Frappe : `isUserTyping=true` reste vrai → `useAddressSearch` reçoit la query → fetch BAN → dropdown.
- Sélection : `handleSelect` fait déjà `setIsUserTyping(false)` + `setJustSelected(true)` → pas de re-fetch après clic.
- Reset pays : le parent passe `address=""`, `inputValue` était non vide → sync met à `""`, `isUserTyping` reste à sa valeur courante (false au montage, sinon inoffensif car query vide).

# Validation

1. `bun run build` (typecheck).
2. Playwright refait le même scénario : vérifier qu'une requête `api-adresse.data.gouv.fr/search/?q=...` part et que le dropdown affiche des suggestions.
3. Cliquer une suggestion → `Ville` et `Code postal` se remplissent, pas de nouvelle requête.
4. Changer le pays → champs vidés, aucune requête parasite.
5. Passer en Belgique (`BE`), taper "rue neuve bruxelles" → requête Nominatim visible, dropdown rempli.

Aucune autre modification (pas de changement au hook, au parent, ni au composant legacy `/simulation`).
