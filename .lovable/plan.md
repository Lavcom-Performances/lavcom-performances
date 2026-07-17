## Objectif
Aligner les locales EN / ES / IT / DE / NL sur la nouvelle version FR de la clé `futursExploitants` dans `src/locales/*/landing.json`.

## Diff détecté par rapport aux autres locales

| Clé | Action | Note |
|---|---|---|
| `simulator` | **Modifiée** | "Simulateur" → "Simulateur **de rentabilité**" |
| `profitability` | **Supprimée** | (fusionnée dans `simulator`) |
| `trySimulator` | **Supprimée** | remplacée par les deux clés ci-dessous |
| `tryPaidSimulator` | **Ajoutée** | "Essayer le simulateur de rentabilité" |
| `tryFreeSimulator` | **Ajoutée** | "Essayer le simulateur gratuit" |
| `timeEstimate` | **Ajoutée** | "Obtenez une estimation complète en moins de 10 minutes" |

Toutes les autres clés (`badge`, `title`, `benefit*`, `packEssentiel`, etc.) restent inchangées.

## Traductions proposées

### EN
- `simulator`: "Profitability simulator"
- `tryPaidSimulator`: "Try the profitability simulator"
- `tryFreeSimulator`: "Try the free simulator"
- `timeEstimate`: "Get a complete estimate in less than 10 minutes"

### ES
- `simulator`: "Simulador de rentabilidad"
- `tryPaidSimulator`: "Probar el simulador de rentabilidad"
- `tryFreeSimulator`: "Probar el simulador gratis"
- `timeEstimate`: "Obtén una estimación completa en menos de 10 minutos"

### IT
- `simulator`: "Simulatore di redditività"
- `tryPaidSimulator`: "Prova il simulatore di redditività"
- `tryFreeSimulator`: "Prova il simulatore gratis"
- `timeEstimate`: "Ottieni una stima completa in meno di 10 minuti"

### DE
- `simulator`: "Rentabilitätssimulator"
- `tryPaidSimulator`: "Rentabilitätssimulator ausprobieren"
- `tryFreeSimulator`: "Kostenlosen Simulator testen"
- `timeEstimate`: "Erhalten Sie in weniger als 10 Minuten eine vollständige Schätzung"

### NL
- `simulator`: "Rentabiliteitssimulator"
- `tryPaidSimulator`: "Probeer de rentabiliteitssimulator"
- `tryFreeSimulator`: "Gratis simulator uitproberen"
- `timeEstimate`: "Ontvang een volledige schatting in minder dan 10 minuten"

## Étapes d'implémentation
1. Pour chacun des 5 fichiers `src/locales/{en,es,it,de,nl}/landing.json` :
   - Remplacer la valeur de `simulator`.
   - Supprimer les clés `profitability` et `trySimulator`.
   - Ajouter `tryPaidSimulator`, `tryFreeSimulator`, `timeEstimate` (en respectant l'ordre relatif de la version FR).
2. Vérifier que la structure JSON reste valide (parse OK) et que l'ordre des clés reflète celui du fichier FR.
3. Aucun changement de code TS/TSX — les composants qui référencent encore `trySimulator` ou `profitability` seront à mettre à jour séparément si nécessaire (à confirmer si tu veux que je vérifie les usages dans un second temps).

## Hors périmètre
- Pas de modification des composants React (à traiter uniquement si tu veux qu'on chasse les références obsolètes après coup).
- Pas de modification des autres clés du fichier.
