## Dashboard Overview — Plan

Generate **1 high-fidelity PNG mockup** (1600×1200, premium model) for the **Simulator Dashboard Overview**, following the same B+C visual direction already validated for the project workspace and scenario comparator.

### Layout

**Left sidebar (240px, persistent, white `#FFFFFF`, right border `#EEF0F3`)**
- Lavcom lime leaf logo + "LAVCOM Simulateur" wordmark at top
- Nav items (Inter 14px, slate `#383838`, lime active state with left lime bar + light lime bg `#A3C615/10`):
  1. **Tableau de bord** (active, lime)
  2. **Mes projets**
  3. **Mon abonnement**
  4. **Mon compte**
- Bottom: user avatar + name "Marc Dupont" + small `⋯`

**Main area (`#F7F8FA` background, 32px padding)**

1. **Top bar:** Search input (left), help `?` + bell + lime "Nouveau projet +" button (right)

2. **Page header:** "Bonjour Marc 👋" (28px slate) + subtitle "Voici votre activité simulateur"

3. **Pack card (full-width hero, white `rounded-xl shadow-sm`, lime left accent bar):**
   - Left: lime pill "Pack Pro", title "Abonnement actif", line "9 projets · 27 scénarios · PDF illimités"
   - Center: progress strip "4 / 9 projets utilisés" with lime fill + "12 / 27 scénarios"
   - Right: yellow chip "Renouvellement dans 18 jours" + ghost button "Gérer mon abonnement →"

4. **KPI strip (4 cards, white `rounded-xl shadow-sm`):**
   - Projets actifs: **4**
   - Scénarios créés: **12**
   - Meilleur ROI simulé: **18 mois** (lime ▲)
   - PDF générés ce mois: **7**

5. **"Mes projets" section header:** title + filter chips (Tous · Récents · Validés) + link "Voir tous mes projets →" (lime)

6. **Project cards grid (3 columns, 4 cards):**
   Each card (white `rounded-xl shadow-sm`, hover lift):
   - Top: project name (16px slate bold) + status chip (lime "Validé" / yellow "En cours" / slate "Brouillon")
   - Subtitle: city · surface · zone
   - Mini KPI row: CA réf · ROI · scénarios count
   - Footer: "Modifié il y a 2j" + lime "Ouvrir →"
   
   Cards: "Laverie Bastille" (Validé, 3 scénarios), "Laverie République" (En cours, 2), "Projet Lyon Part-Dieu" (Brouillon, 1), "+ Nouveau projet" (dashed lime border, centered "+")

7. **Footer row (2 cards side by side):**
   - **Activité récente** (timeline): "Scénario Optimiste créé · Bastille · il y a 1h", "PDF comparatif généré · il y a 3h", "Nouveau projet créé · Lyon · hier"
   - **Suggestions** (lime star icon): "3 scénarios prêts à comparer sur Bastille", "Votre pack expire bientôt — économisez 20% en annuel"

### Design tokens (unchanged from prior mockups)
- Background `#F7F8FA`, cards white `rounded-xl shadow-sm`
- Lime `#A3C615`, yellow `#FCD259`, slate `#383838`, muted `#6B7280`
- Inter font, French numbers with non-breaking space before €
- Sidebar active = left lime bar 3px + bg `#A3C615/10` + lime text

### Out of scope
- No code changes — static PNG only for validation
- No mobile variant
- Subscription/account detail pages not generated (just nav entries)

Deliverable: `/mnt/documents/dashboard-overview-B.png`
