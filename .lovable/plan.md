# Subscription Management — Mockup Plan (Direction B)

Generate a single high-fidelity PNG mockup at `/mnt/documents/subscription-management-B.png` (1600×1200, premium model) showing the **Mon abonnement** screen, consistent with the previously approved Dashboard Overview B (sidebar + main area, lime accent, French copy).

## Layout

**Left sidebar (240px, white `#FFFFFF`, right border `#EEF0F3`)**
- Lavcom lime leaf icon + "LAVCOM Simulateur" wordmark
- Nav: Tableau de bord · Mes projets · **Mon abonnement (active, lime 3px left bar, lime text `#A3C615`)** · Mon compte
- Bottom: avatar "Marc Dupont" + `⋯`

**Main area (`#F7F8FA`, 24px gutter)**
1. **Top bar** — search input + "Bonjour Marc 👋" greeting.

2. **Current pack hero card** (white, `rounded-xl shadow-sm`, lime left accent bar)
   - "Pack Pro" pill + green "Actif" badge
   - Subline: "Renouvellement le 22 juin 2026 · 18,90 €/mois"
   - Right: "Gérer le paiement" outline button + "Changer de pack" lime button

3. **Usage meters row** (2 cards, lime progress bars)
   - "Projets utilisés — 4 / 9" (~44%)
   - "Scénarios utilisés — 12 / 27" (~44%)
   - Yellow chip "Renouvellement dans 18 jours"

4. **Billing info strip** (3 mini-cards)
   - Forfait actuel · Prochain paiement (22 juin · 18,90 €) · Carte •••• 4242 (Visa)

5. **Plan comparison & change** (section title "Changer de pack", 3 plan cards side-by-side)
   - **Pack Essentiel** (3 projets · 9 scénarios · 9,90 €/mois) — outline "Choisir"
   - **Pack Pro** — lime border, "Votre pack actuel" badge, disabled CTA
   - **Pack Premium** (illimité · 39 €/mois) — lime "Passer au Premium" CTA
   - Each card: feature checklist (4 items), price, CTA

6. **Historique des factures** (table card)
   - Columns: Date · Description · Montant · Statut · Action (PDF download icon)
   - 4 rows: Mai/Avr/Mar/Fév 2026 — all "Payée" green chip

7. **Cancellation flow preview** (right-side overlay panel showing the in-app modal)
   - Title: "Annuler votre abonnement ?"
   - Retention block: "Vous perdrez l'accès à vos 12 scénarios le 22 juin 2026"
   - Two offers: "Pause 1 mois" / "−20% pendant 3 mois"
   - Footer: "Garder mon abonnement" (lime primary) + "Confirmer l'annulation" (ghost red)

## Tokens
- Background `#F7F8FA`, white cards `rounded-xl shadow-sm`
- Lime `#A3C615`, yellow `#FCD259`, slate `#383838`, muted `#6B7280`, success green `#22A06B`, danger red `#E5484D`
- Inter font, French numbers with non-breaking space before €

## Deliverable
- One PNG: `/mnt/documents/subscription-management-B.png`
- Embedded via `<presentation-artifact>` after QA pass
- No code changes (mockup only)
