# Bouton "Réinitialiser" fonctionnel avec confirmation

## Objectif
Rendre le bouton Reset du header du simulateur opérationnel : il remet le projet de simulation à ses valeurs par défaut (et vide le localStorage), après confirmation explicite de l'utilisateur dans une modale d'avertissement.

## Comportement
1. Clic sur "Réinitialiser" → ouverture d'une modale d'alerte (AlertDialog).
2. La modale explique que toutes les données saisies (projet, local, machines, charges) seront définitivement perdues et remplacées par les valeurs par défaut.
3. Deux actions : "Annuler" (ferme, aucun effet) et "Réinitialiser" (action destructive, style rouge).
4. Confirmation → appel de `resetProject()` du contexte projet : l'état revient à `defaultSimulationProject` et la clé `simulationProject` est supprimée du localStorage. Un toast de confirmation s'affiche.

## Détails techniques
- `SimulatorPageHeader.tsx` :
  - Supprimer la prop `onReset` et définir la logique en interne via `useSimulatorProjectContext()` (`resetProject`).
  - État local `open` pour la modale ; fonction interne `onReset()` qui appelle `resetProject()`, ferme la modale et déclenche un toast.
  - Le même bouton est utilisé dans les deux branches du rendu (étape finale / étapes normales).
- Modale : `AlertDialog` existant (`src/components/ui/alert-dialog.tsx`), avec `AlertDialogAction` en variante destructive (tokens du design system, pas de couleurs en dur).
- Nettoyage : retirer la prop `onReset` là où elle est passée dans `SimulatorProjectPage`, `SimulatorMachinesPage`, `SimulatorChargesPage`, `SimulatorResultsPage` (elle n'est actuellement pas fournie, donc aucun changement de comportement ailleurs).

## Traductions
Ajout d'un bloc `common.resetDialog` dans `src/locales/fr/paid-simulator.json` et `src/locales/en/paid-simulator.json` avec les mêmes clés :
- `title`, `description`, `cancel`, `confirm`, `success`

FR (exemples) : « Réinitialiser la simulation ? », « Toutes les données saisies… seront définitivement perdues et remplacées par les valeurs par défaut. Cette action est irréversible. », « Annuler », « Oui, réinitialiser », « Simulation réinitialisée ».

## Vérification
- Typecheck.
- Test navigateur : ouverture de la modale, annulation sans effet, confirmation qui remet les champs aux valeurs par défaut.
