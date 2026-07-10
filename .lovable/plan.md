# Déplacement de `SimulatorLayout.tsx`

## Objectif
Déplacer `src/components/simulator/layout/SimulatorLayout.tsx` vers `src/components/layout/SimulatorLayout.tsx` et mettre à jour les imports.

## Étapes

1. **Déplacer le fichier** via `mv` :
   - `src/components/simulator/layout/SimulatorLayout.tsx` → `src/components/layout/SimulatorLayout.tsx`

2. **Vérifier les imports internes du fichier déplacé**
   Le fichier importe :
   - `SimulatorStepper` depuis `@/components/simulator/layout/SimulatorStepper` — chemin absolu (`@/`), reste valide après le déplacement. Aucun changement.

3. **Mettre à jour le seul consommateur** (`src/App.tsx`, ligne 97) :
   ```ts
   import SimulatorLayout from "@/components/layout/SimulatorLayout";
   ```

4. **Validation**
   - `rg -n "simulator/layout/SimulatorLayout"` doit retourner 0 résultat.
   - `bun run build` doit passer.

## Portée
Aucun autre fichier n'importe `SimulatorLayout` (vérifié via ripgrep). Les autres fichiers du dossier `src/components/simulator/layout/` (`SimulatorStepper`, `SimulatorPageHeader`, `SimulatorFooterNav`) restent en place.
