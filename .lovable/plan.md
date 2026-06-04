# Export PNG — Dashboard pro data-rich

Generate a high-fidelity PNG mockup of the selected direction (v3 « Dashboard pro data-rich ») for the « Mes projets » simulator dashboard, and deliver it as a downloadable artifact.

## Deliverable
- `/mnt/documents/mes-projets-dashboard-pro.png` (1600×1100, premium quality)

## Visual contents to render
Faithful to v3 selected earlier:

1. **Top bar** — Lavcom logo left, breadcrumb "Simulateur › Mes projets", user avatar right.
2. **Pack status block** (full width card):
   - Title "Pack Comparateur — actif"
   - 3 linear progress bars side-by-side: Projets 2/3, Scénarios 5/9, Jours restants 18/30 (orange tint <15j)
   - CTA buttons right: "Prolonger 30 j" (outline) + "Passer au pack supérieur" (lime green solid)
3. **Toolbar row**: search input, filter chips (Tous / Calculés / Brouillons), sort dropdown, "+ Nouveau projet" (lime), "Comparer 2 emplacements" (outline + tooltip).
4. **Project grid** (3 columns × 2 rows of cards):
   - Card header: project name, city, status badge
   - KPI row: CA estimé, Résultat mensuel (green/red), Seuil de rentabilité
   - Mini sparkline placeholder
   - Footer: scenario count chip "3 scénarios", actions (Ouvrir, Dupliquer, ⋯)
5. **Right rail upsell banner** (dark slate): "Passez au Pack Business Plan — projections 5 ans + export comptable" with CTA.
6. **Bottom contextual alert** (light amber): "Votre pack expire dans 18 jours."

## Style tokens
- Background `#F7F8FA`, cards white with subtle border + shadow-sm
- Lavcom lime green primary `#A3C615`, accent yellow `#FCD259`, neutral slate text `#383838`
- Inter / SF Pro typography, dense spacing, data-rich tabular figures

## Technique
- Single call to `imagegen--generate_image` with `model: premium` (text legibility critical), 1600×1100, prompt describing the layout above with explicit color hex codes and content labels in French.

## Out of scope
- No code changes, no new routes, no component files. This is purely a static PNG visual for review.
