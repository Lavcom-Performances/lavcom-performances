# Comparateur de projets — Direction B+C (cartes face-à-face + radar analytique)

Mix demandé : la lisibilité commerciale de B (cartes projet côte-à-côte + différentiel) **fusionnée** avec la profondeur analytique de C (radar multi-axes + synthèse IA). Tokens visuels du pack payant Lavcom conservés.

## Livrable

- PNG haute-fidélité `/mnt/documents/comparateur-projets-bc.png` (1600×1200, premium quality)
- Aucune modification de code, aucun nouveau composant — visuel de revue uniquement.

## Composition de l'écran (top → bottom)

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Lavcom · Simulateur › Mes projets › Comparateur               👤    │
├──────────────────────────────────────────────────────────────────────┤
│ Comparer 2 projets                          [⬇ Télécharger 2 PDF]    │
│ Pack Comparateur · 2/3 projets utilisés                              │
├───────────────────────────────┬──────────────────────────────────────┤
│  CARTE PROJET A               │  CARTE PROJET B                       │
│  Laverie Bastille             │  Lyon Part-Dieu                       │
│  Paris 11e · 95 m² · Zone B   │  Lyon 3e · 110 m² · Zone A            │
│  [Scénario ▾ Réaliste]        │  [Scénario ▾ Optimiste]               │
│                               │                                       │
│  CA estimé      12 400 €      │  CA estimé      14 800 € ▲           │
│  Charges fixes   4 200 € ▲    │  Charges fixes   5 100 €              │
│  Taux variable     22 %       │  Taux variable     19 % ▲            │
│  Seuil/mois      8 200 € ▲    │  Seuil/mois      9 100 €              │
│  Résultat/mois   3 900 €      │  Résultat/mois   5 600 € ▲           │
│  ▓▓▓▓▓░░░░ 47 %               │  ▓▓▓▓▓▓▓░░ 71 %                       │
│  Cycles/j req.      82        │  Cycles/j req.      96                │
└───────────────────────────────┴──────────────────────────────────────┘
        ┌────────── Différentiel (Lyon vs Bastille) ──────────┐
        │  Résultat   +1 700 €/mois   (+44 %)                  │
        │  CA         +2 400 €/mois   (+19 %)                  │
        │  Charges     +900 €/mois    (+21 %)                  │
        │  Seuil      +900 €/mois     (+11 %)                  │
        └──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│  RADAR 6 AXES                       SYNTHÈSE                          │
│  (overlay 2 projets)                ★ Lyon Part-Dieu surperforme     │
│         CA                          sur 5 critères / 8.               │
│       ╱     ╲                        Avantage net : résultat mensuel  │
│   Marge   Seuil                      +1 700 €. Bastille reste plus    │
│   ╱    ╲   ╱                         défensif côté charges fixes      │
│ Cycles  Surface                      (−900 €/mois).                   │
│   ╲    ╱                                                              │
│    Zone                              [Voir analyse complète →]        │
│  ── Bastille (lime)  ── Lyon (jaune)                                  │
└──────────────────────────────────────────────────────────────────────┘
│ Rappel : un scénario actif par projet · Recalcul instantané           │
└──────────────────────────────────────────────────────────────────────┘
```

### Détails clés

- **Bandeau "Avantage"** : valeur favorable mise en `bg lime/10` + chip lime « Avantage » avec icône ▲. Toujours visible en un coup d'œil.
- **Barre de progression** sous "Résultat/mois" = % d'atteinte du seuil (visuel B).
- **Différentiel central** : carte blanche flottante entre les 2 cartes, calcul auto € et %, couleur lime quand favorable au projet de droite, slate sinon.
- **Radar (C)** : 6 axes (CA, Marge, Seuil, Cycles, Surface, Zone), aires superposées semi-transparentes (lime `#A3C615` + jaune `#FCD259`). Légende cliquable.
- **Synthèse texte auto** à droite du radar, ton décisionnel, lien « Voir analyse complète ».
- **CTA primaire** « Télécharger les 2 PDF » lime, en haut à droite.
- **Sélecteur de scénario** par carte (dropdown), pour permuter sans quitter l'écran.

### Tokens

- Fond `#F7F8FA`, cartes blanches `border #E5E7EB shadow-sm rounded-xl`.
- Lime `#A3C615` (projet A / favorable), jaune `#FCD259` (projet B), slate `#383838`.
- Inter, chiffres tabulaires, espace insécable avant `€`.

## Technique

- Un seul appel `imagegen--generate_image` (`model: premium`, 1600×1200) avec prompt FR explicite : carte A à gauche, carte B à droite, différentiel central, radar + synthèse en bas, badges « Avantage », CTA téléchargement.

## Hors-scope

- Pas de code, pas de route, pas de composant React. Visuel statique uniquement, pour validation avant build.
