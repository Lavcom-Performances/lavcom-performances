# Comparateur de scénarios (intra-projet) — PNG haute-fidélité

Même direction visuelle que le comparateur de projets (B+C) : cartes face-à-face + différentiel central + radar + synthèse. Adaptation au **contexte intra-projet** : on compare 2 à 3 scénarios d'un même projet (mêmes lieu/surface/zone), donc l'écart porte sur les **hypothèses** (prix cycle, fréquentation, charges) et non sur l'emplacement.

## Livrable

- `/mnt/documents/comparateur-scenarios-bc.png` (1600×1200, premium quality)
- Aucune modification de code, visuel statique uniquement.

## Composition

```text
┌────────────────────────────────────────────────────────────────────┐
│ Lavcom · Simulateur › Mes projets › Laverie Bastille › Scénarios   │
├────────────────────────────────────────────────────────────────────┤
│ Comparer les scénarios — Laverie Bastille    [⬇ PDF comparatif]    │
│ Paris 11e · 95 m² · Zone B · 3 scénarios sur 9 utilisés            │
├──────────────────┬──────────────────────┬──────────────────────────┤
│ SCÉNARIO 1       │ SCÉNARIO 2 (réf)     │ SCÉNARIO 3                │
│ Prudent          │ Réaliste     [Réf]   │ Optimiste                 │
│ Modifié il y a 3j│ Validé · 1 sem.      │ Brouillon · 2j            │
│ ──── hypothèses ─│ ──── hypothèses ─────│ ──── hypothèses ─────────│
│ Prix lavage 6 €  │ Prix lavage 7 €      │ Prix lavage 8 €           │
│ Cycles/j  60     │ Cycles/j  82         │ Cycles/j  105 ▲           │
│ Charges +5 %     │ Charges  réf         │ Charges −3 %              │
│ ──── résultats ──│ ──── résultats ──────│ ──── résultats ──────────│
│ CA      9 200 €  │ CA     12 400 €      │ CA     16 100 € ▲         │
│ Seuil   8 200 €  │ Seuil   8 200 €      │ Seuil   7 950 € ▲         │
│ Résult. 1 000 €  │ Résult. 3 900 €      │ Résult. 6 850 € ▲         │
│ ROI 38 mois      │ ROI 22 mois          │ ROI 14 mois ▲             │
└──────────────────┴──────────────────────┴──────────────────────────┘
        ┌── Écart Optimiste vs Réaliste (référence) ──┐
        │ Résultat  +2 950 €/mois  (+76 %)             │
        │ CA        +3 700 €/mois  (+30 %)             │
        │ ROI       −8 mois        (−36 %)             │
        └──────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ COURBES ROI (24 mois)              SYNTHÈSE                         │
│ 3 lignes superposées :             ★ Scénario Optimiste atteint le  │
│  · Prudent  (slate)                seuil dès le mois 14, contre 22  │
│  · Réaliste (lime, pleine)         pour Réaliste. Risque : repose   │
│  · Optimiste(jaune, pointillé)     sur 105 cycles/j (+28 %) — à     │
│ Ligne horizontale seuil            valider avec étude de zone.       │
│                                    [Définir Réaliste comme réf]      │
└────────────────────────────────────────────────────────────────────┘
│ Sélectionnez 2 à 3 scénarios · Le scénario « Réf » sert de base     │
└────────────────────────────────────────────────────────────────────┘
```

### Détails clés (différences vs comparateur de projets)

- **3 colonnes** au lieu de 2 — un scénario peut être désigné « Référence » (badge slate), les autres se comparent à lui.
- **Bloc "hypothèses"** distinct du bloc "résultats" dans chaque carte (séparateur visible), pour montrer la cause avant l'effet.
- **Statuts** : `Brouillon`, `Validé`, `Réf` (chips).
- **Différentiel central** = écart du scénario le plus favorable vs la **référence** (pas vs l'autre projet).
- **Visualisation bas-gauche** : **courbes ROI 24 mois** superposées (au lieu d'un radar) — plus pertinent pour montrer la trajectoire d'un même lieu sous différentes hypothèses. Ligne horizontale = seuil.
- **Synthèse** : insiste sur le **risque/hypothèse clé** qui rend un scénario optimiste atteignable, avec CTA « Définir comme référence ».
- CTA primaire : « ⬇ PDF comparatif » (un seul PDF, 3 scénarios côte-à-côte).

### Tokens

- Mêmes que le comparateur de projets : fond `#F7F8FA`, cartes blanches `rounded-xl shadow-sm`, lime `#A3C615` (favorable), jaune `#FCD259` (variante haute), slate `#383838`.
- Référence en slate neutre (pas d'effet "avantage" sur la colonne référence).

## Technique

- Un seul appel `imagegen--generate_image` (`model: premium`, 1600×1200), prompt FR détaillé reprenant la composition ci-dessus.

## Hors-scope

- Aucun code, aucune route, aucun composant. Visuel statique pour validation.
