# Mon Compte — Mockup Plan (Direction B)

Generate a single high-fidelity PNG mockup at `/mnt/documents/mon-compte-B.png` (1600×1200, premium model) showing the **Mon compte** screen, consistent with the previously approved Dashboard, Projects, and Subscription screens (sidebar + main area, lime accent, French copy).

## Scope (per user answers)
- Personal info only — no security/notifications/documents sections on this page
- Account deletion danger-zone included
- Logout button visible directly in the sidebar (no dropdown)

## Layout

**Left sidebar (240px, white `#FFFFFF`, right border `#EEF0F3`)**
- Lavcom lime leaf icon + "LAVCOM Simulateur" wordmark
- Nav: Tableau de bord · Mes projets · Mon abonnement · **Mon compte (active, lime 3px left bar, lime text `#A3C615`)**
- Bottom block: avatar "Marc Dupont" + email muted, then a full-width outline **"Se déconnecter"** button with door-arrow icon (red text `#E5484D`, red-50 hover)

**Main area (`#F7F8FA`, 24px gutter)**

1. **Top bar** — search input + "Bonjour Marc 👋" greeting (consistent with other screens).

2. **Page header** — "Mon compte" H1 + subline "Gérez vos informations personnelles et votre accès".

3. **Profile identity card** (white, `rounded-xl shadow-sm`, lime left accent)
   - Left: large avatar (96px) with lime ring + "Changer la photo" / "Supprimer" small links underneath
   - Right block: "Marc Dupont" name (lg/semibold), email "marc.dupont@laverie-pro.fr", "Membre depuis mars 2025" muted, green "Email vérifié ✓" pill

4. **Informations personnelles card** (form)
   - Two-column grid: Prénom · Nom · Email (disabled, muted bg + "L'email ne peut pas être modifié" helper) · Téléphone
   - Section divider "Entreprise"
   - Two columns: Raison sociale · SIRET
   - Footer: outline "Annuler" + lime "Enregistrer les modifications" with floppy icon

5. **Mot de passe card**
   - Title "Sécurité du compte" + lock icon
   - Two inputs: Nouveau mot de passe (eye toggle) · Confirmer le mot de passe
   - Password strength meter (3 segments, "Fort" green label)
   - Footer note "Vous serez invité à confirmer votre identité avant la mise à jour"
   - Right-aligned lime button "Mettre à jour le mot de passe"

6. **Préférences card** (light, condensed)
   - Toggle row: Langue de l'interface — Français ▾
   - Toggle row: Recevoir les emails de récap mensuel — switch ON (lime)

7. **Zone de danger card** (red-tinted, `border-l-4 border-[#E5484D]`, `bg-[#FFF5F5]`)
   - Title "Supprimer mon compte" + ⚠ icon (red)
   - Body: "Cette action est définitive. Vos 4 projets, 12 scénarios et l'historique des factures seront supprimés sous 30 jours."
   - Ghost-red button "Supprimer mon compte"

8. **Deletion confirmation modal** (right-side overlay, shown on top of the page)
   - Title: "Supprimer définitivement votre compte ?"
   - Red warning block listing what will be lost (projets, scénarios, abonnement actif annulé)
   - Input "Tapez SUPPRIMER pour confirmer"
   - Footer: lime primary "Annuler" + ghost red "Confirmer la suppression"

## Tokens
- Background `#F7F8FA`, white cards `rounded-xl shadow-sm`
- Lime `#A3C615`, slate `#383838`, muted `#6B7280`, success green `#22A06B`, danger red `#E5484D`, danger bg `#FFF5F5`
- Inter font, French copy throughout

## Deliverable
- One PNG: `/mnt/documents/mon-compte-B.png`
- Embedded via `<presentation-artifact>` after QA pass
- No code changes (mockup only)
