
## Objectif

Rédiger un plan de tests (uniquement le document, sans implémentation) pour les routes `/simulator/project`, `/simulator/machines`, `/simulator/charges`, `/simulator/results`.

## Livrable

Un fichier unique : `docs/testing/simulator-test-plan.md`

Contenu :
1. Bref préambule (portée, environnement, comment lire le tableau, statuts possibles : OK / KO / À tester).
2. Un tableau markdown à 7 colonnes : `Fonctionnalité | Type de test | Données en entrées | Résultats attendus | Résultats obtenus | Statut | Commentaire`.
3. Les colonnes "Résultats obtenus" et "Statut" seront pré-remplies avec `À exécuter` (elles seront complétées lors de l'exécution des tests).

## Périmètre des cas de test (aperçu)

Les cas seront regroupés par étape et couvrent :

### Étape 1 — `/simulator/project` (Fonctionnel)
- Garde-fou : tous champs de l'onglet "Mon projet" vides → clic "Continuer" → toast d'erreur, redirection vers l'onglet en erreur, badges rouges sur les onglets fautifs, messages `FieldError` sous chaque champ obligatoire.
- Onglet "Mon projet" valide + onglet "Contraintes du local" invalide → bascule automatique sur l'onglet "Contraintes du local".
- Nom du projet < 3 caractères → message "min. 3 caractères".
- Surface < 10 m² ou vide → message d'erreur, hint dynamique masqué si valeur nulle.
- Autocomplétion d'adresse FR (BAN) : sélection remplit `address`, `city`, `postalCode` sans duplication du n° de rue.
- Autocomplétion d'adresse non-FR (Nominatim) : appels réseau OK, remplissage adresse.
- Horaires personnalisés : `openAt === closeAt` → erreur "horaires invalides".
- Jours d'ouverture personnalisés : aucun jour coché → erreur "au moins un jour".
- Tous champs valides → navigation vers `/simulator/machines`.

### Étape 2 — `/simulator/machines` (Fonctionnel)
- Aucune machine active (`count = 0` partout) → toast + blocage navigation.
- Configuration valide → passage à `/simulator/charges`.
- Bouton "Retour" → retour à `/simulator/project`.

### Étape 3 — `/simulator/charges` (Fonctionnel)
- Libellé de charge fixe vide → erreur "Libellé requis".
- Montant charge fixe négatif → erreur "Montant invalide".
- Charge variable > 100 % ou somme > 100 % → erreur agrégée.
- Charges valides → navigation vers `/simulator/results`.

### Étape 4 — `/simulator/results` (Fonctionnel)
- Accès direct sans données → comportement attendu (défauts affichés / redirection).
- Affichage cohérent des KPI à partir du projet en contexte.

### Persistance & contexte (Fonctionnel)
- Rechargement de la page : `SimulatorProjectContext` restaure les données depuis `localStorage`.
- Reset du projet → valeurs par défaut restaurées.

### Tests unitaires Vitest
- `simulatorProjectSchema` : parse succès sur `defaultSimulationProject` valide, erreurs ciblées sur chaque champ requis (projectName, scenarioName, address, city, postalCode, zoneType, openingHours, openingDays, surface, doorWidth, machines, variableCosts > 100%).
- `sectionSchemas` : chaque section valide/invalide indépendamment.
- `useSimulatorValidation` : `errorCount`, `sections[x].errorCount`, `isValid`.
- `useSimulatorStep` : `guardNext` retourne `false` + toast + `onInvalid(firstInvalid)` appelé ; `attempted` passe à `true` ; `fieldError` ne renvoie que si `attempted`.
- `FormField` : rend `FieldError` lorsque `error` est défini, `data-invalid` sur le `Field`.
- `ProjectTabs` : affiche badges d'erreur uniquement si `showErrorBadges` et count > 0.
- `SimulatorFooterNav` : `onNext` retournant `false` empêche la navigation ; `nextDisabled` désactive le bouton.
- `useAddressSearch` : formatage `housenumber + street` sans duplication (regression BAN) ; bascule FR ↔ Nominatim selon `country`.
- `SimulatorProjectContext` : `updateProject` merge partiel, persistance localStorage.

## Format du tableau

```markdown
| Fonctionnalité | Type de test | Données en entrées | Résultats attendus | Résultats obtenus | Statut | Commentaire |
| --- | --- | --- | --- | --- | --- | --- |
| ... | Fonctionnel / Unitaire | ... | ... | À exécuter | À exécuter | ... |
```

## Notes techniques

- Le document ne contient **aucun** code de test — seulement la spécification.
- Les cas unitaires référencent les modules cibles (`simulatorProjectSchema`, `useSimulatorStep`, etc.) pour faciliter l'implémentation ultérieure.
- Aucune modification de code applicatif ni installation de dépendance dans ce plan.
