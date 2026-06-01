Créer le fichier `docs/plans/parcours-simulateur-enregistrement.md` contenant le plan complet du parcours « Simuler → Enregistrer → Payer → Récupérer », pour archivage et consultation ultérieure.

## Contenu du fichier

```markdown
# Parcours « Simuler → Enregistrer → Payer → Récupérer »

## Objectif

Permettre à un visiteur **non connecté** d'utiliser le simulateur payant (`/simulation`), de cliquer « Enregistrer ma synthèse » sur la page Résultats, puis d'être guidé : choix du pack → création de compte → paiement Stripe → réception de la synthèse par mail + accès à ses simulations dans son dashboard.

## Flow cible

​```text
/simulation (libre, non connecté)
   └─ Étapes 0→4 (state local + localStorage)
        └─ Étape Résultats
             └─ [Bouton "Enregistrer ma synthèse"]
                  ├─ Sauvegarde brouillon localStorage (pending_simulation)
                  └─ Redirige → /subscribe-simulator?return=save
                       └─ Choix d'un pack
                            ├─ Si non connecté → /signup?pack=XXX&next=checkout
                            │     └─ Création compte (email+password ou Google)
                            │     └─ Email de confirmation
                            │     └─ Après login → reprise auto checkout pack XXX
                            └─ Si connecté → checkout Stripe direct
                                 └─ Stripe Checkout (mode=payment)
                                      └─ /billing/success
                                           ├─ Hydrate entitlements
                                           ├─ Lit pending_simulation
                                           ├─ INSERT simulation_projects
                                           ├─ Edge "send-simulation-summary" → email PDF
                                           └─ Redirige → /simulation/mes-projets
​```

## Changements techniques

### 1. Base de données
Table `public.simulation_projects` (`user_id`, `name`, `project` jsonb, `results_snapshot` jsonb, `deleted_at`). RLS `auth.uid() = user_id`. Trigger BEFORE INSERT : force `user_id` et vérifie quota `profiles.max_projects`.

### 2. StepResults
Bouton « Enregistrer ma synthèse » toujours visible :
- Non connecté / sans accès payant → `localStorage.pending_simulation` + redirect `/subscribe-simulator?return=save`
- Connecté + accès actif → `useSimulationProjects().save()` direct

### 3. SubscribeSimulator
- Bandeau si `?return=save`
- Si non connecté au clic pack → `/signup?pack=<id>&next=checkout`

### 4. Signup / Login
- Page `/signup` (email+password + Google)
- Lit `?pack` et `?next` ; après login auto → invoque `create-simulator-checkout` → Stripe
- Lien « Déjà un compte ? » → `/login` avec mêmes paramètres

### 5. BillingSuccess
Après hydratation entitlements :
1. Lire `localStorage.pending_simulation`
2. Save dans `simulation_projects`
3. Invoke edge `send-simulation-summary`
4. Clear localStorage
5. Redirect `/simulation/mes-projets`

### 6. Edge function `send-simulation-summary`
JWT user, input `simulation_id`, génère PDF, envoie via Resend, log `system_events`.

### 7. Hook `useSimulationProjects`
`list()`, `save()`, `remove()`, `rename()`. Remplace le `projectsUsed = 0` hardcodé dans `useSimulatorAccess`.

### 8. Page `/simulation/mes-projets`
Liste des simulations, quota, actions Voir/Renommer/Supprimer/PDF. Entrée sidebar.

### 9. `/simulation?id=<uuid>`
Charge depuis `simulation_projects` au lieu de localStorage.

## Hors scope
- Migration auto localStorage existant → compte
- Partage public d'une simulation
- `EmailCaptureModal` (free) inchangé
- Guest checkout Stripe désactivé pour ce parcours

## Détails techniques
- `localStorage.pending_simulation` = `{ project, results, ts }`, TTL 24h
- Reprise post-signup via `sessionStorage.post_auth_action`
- Email confirmation requis (pas d'auto-confirm)
- Google OAuth `redirectTo` = `/auth/callback?pack=&next=checkout`
- Si quota atteint → proposer add-on `+1 Projet`

## Risques à valider
1. Confirmation email retarde la reprise checkout — magic link envisageable ?
2. PDF côté serveur (Deno jsPDF) vs client (génération à `/billing/success` puis upload)
3. Alignement des routes (`/signup`, `/auth/callback`, `/simulation/mes-projets`)
```

## Étapes
1. Créer le dossier `docs/plans/` s'il n'existe pas
2. Écrire le fichier markdown ci-dessus

## Hors scope
Aucune modification de code applicatif, aucune migration de base. Seule la documentation est ajoutée.