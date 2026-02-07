# Architecture de migration lavcom.fr

## Vue d'ensemble

L'architecture cible sépare clairement le site public (WordPress) du SaaS (Lovable Cloud).

```
┌──────────────────────────────────────────────────────────────┐
│                    lavcom.fr (WordPress)                      │
│                        IONOS Hosting                          │
├──────────────────────────────────────────────────────────────┤
│  /                    → Landing page                          │
│  /performances/       → Présentation du SaaS                  │
│  /performances/simulateur → Teaser + CTA vers app            │
│  /performances/pricing → Tarifs publics                       │
│  /performances/beta   → Programme bêta (info)                 │
│  /blog/               → Contenu SEO                           │
│  /contact/            → Formulaire contact                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ CTAs → "Accéder à la plateforme"
                              │        "Tester le simulateur"
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                app.lavcom.fr (Lovable Cloud)                  │
│                    Supabase Backend                           │
├──────────────────────────────────────────────────────────────┤
│  /                    → Redirect → /select-laundromat         │
│  /login               → Connexion                             │
│  /signup              → Inscription                           │
│  /simulateur          → Simulateur complet (paywall)          │
│  /dashboard           → Tableau de bord SaaS                  │
│  /projections/*       → Module projections financières        │
│  /admin/*             → Platform Admin (accès restreint)      │
└──────────────────────────────────────────────────────────────┘
```

## Configuration DNS (IONOS)

### Enregistrements requis

| Type | Nom    | Valeur                | TTL   |
|------|--------|----------------------|-------|
| A    | @      | IP IONOS (existant)  | 3600  |
| A    | www    | IP IONOS (existant)  | 3600  |
| A    | app    | 185.158.133.1        | 3600  |
| TXT  | _lovable | lovable_verify=...  | 3600  |

### Étapes de configuration

1. **Accéder au DNS IONOS**
   - Connexion → Domaines → lavcom.fr → DNS

2. **Ajouter l'enregistrement A pour app**
   ```
   Type: A
   Nom: app
   Valeur: 185.158.133.1
   TTL: 3600
   ```

3. **Ajouter l'enregistrement TXT Lovable**
   ```
   Type: TXT
   Nom: _lovable
   Valeur: [valeur fournie par Lovable Settings → Domains]
   ```

4. **Dans Lovable**
   - Settings → Domains → Connect Domain
   - Entrer: `app.lavcom.fr`
   - Attendre la vérification DNS (jusqu'à 72h)

## Règles de cohérence

### Messages et promesses

| Élément        | WordPress                          | Lovable                           |
|----------------|------------------------------------|------------------------------------|
| Proposition    | "Pilotez votre rentabilité"        | Identique                          |
| CTA principal  | "Essayer gratuitement"             | "Commencer l'essai"                |
| Tarifs         | Affichés (informationnel)          | Stripe Checkout (fonctionnel)      |
| Simulateur     | Teaser + "Accéder au simulateur"   | Outil complet avec paywall         |

### Navigation cross-domain

```html
<!-- WordPress: Bouton vers app -->
<a href="https://app.lavcom.fr/signup" 
   class="btn btn-primary">
  Essayer gratuitement
</a>

<!-- WordPress: Simulateur teaser -->
<a href="https://app.lavcom.fr/simulateur" 
   class="btn btn-secondary">
  Tester le simulateur
</a>
```

### Style cohérent

- **Couleurs**: Utiliser les mêmes tokens (vert LAVCOM #A3C615, jaune #FCD259, bleu #3D4B7A)
- **Typographie**: Même famille (SF Pro, Inter fallback)
- **Iconographie**: Lucide icons sur les deux plateformes

## Checklist de migration

### Avant la migration

- [ ] DNS IONOS accessible
- [ ] Accès admin WordPress
- [ ] Lovable Custom Domain configuré
- [ ] Contenu rédigé pour WordPress

### Pendant la migration

- [ ] Ajouter enregistrement A pour `app`
- [ ] Ajouter enregistrement TXT `_lovable`
- [ ] Configurer `app.lavcom.fr` dans Lovable
- [ ] Attendre propagation DNS (24-72h)
- [ ] Vérifier SSL actif sur app.lavcom.fr

### Après la migration

- [ ] Tester navigation WordPress → Lovable
- [ ] Vérifier aucun lien cassé
- [ ] Tester login/signup depuis WordPress
- [ ] Valider responsive sur mobile
- [ ] Mettre à jour robots.txt WordPress
- [ ] Configurer Google Analytics cross-domain

## Erreurs à éviter

| Erreur                                    | Conséquence                        | Prévention                         |
|-------------------------------------------|------------------------------------|------------------------------------|
| Oublier le www sur app                    | www.app.lavcom.fr cassé            | N/A - pas de www pour subdomain    |
| Auth partagée WP/Lovable                  | Complexité inutile                 | Auth séparée, CTAs explicites      |
| Contenu dupliqué                          | Pénalité SEO                       | Canonical tags + contenu unique    |
| Incohérence de promesses                  | Confusion utilisateur              | Document de référence partagé      |

## Ressources

- [Lovable Custom Domains](https://docs.lovable.dev/features/custom-domain)
- [IONOS DNS Management](https://www.ionos.fr/aide/domaines/configurer-vos-dns/)
- [Cross-Domain Analytics](https://support.google.com/analytics/answer/1034342)

---

*Dernière mise à jour : 2026-02-07*
*Document de référence pour la migration lavcom.fr / app.lavcom.fr*
