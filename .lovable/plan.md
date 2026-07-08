## Objectif
Créer une variante personnalisée de `TabsTrigger` pour le simulateur avec fond vert Lavcom actif et texte gris foncé.

## Étapes

1. **Créer `src/components/simulator/project/SimulatorTabsTrigger.tsx`**
   - Wrapper autour du `TabsTrigger` de `@/components/ui/tabs`
   - Sur les props `className`, fusionner avec :
     - `data-[state=active]:bg-primary`
     - `data-[state=active]:text-foreground`
     - Conserver les autres comportements (rounded-sm, transition, focus-visible, etc.)

2. **Mettre à jour `src/components/simulator/project/ProjectTabs.tsx`**
   - Importer `SimulatorTabsTrigger`
   - Remplacer les deux `<TabsTrigger>` par `<SimulatorTabsTrigger>`

3. **Validation**
   - `bunx tsgo --noEmit` doit passer
   - Visuel : onglet sélectionné = fond vert `#A3C615`, texte gris foncé `#383838`
