# Deep User Test Checklist

## Règle Fondamentale
> Un deep user test doit toujours prendre en compte **tous les parcours utilisateurs possibles** — SaaS et hors SaaS.

---

## Matrice des États Utilisateur

Chaque fonctionnalité critique doit être testée dans **tous ces états** :

| État | Description | Exemple |
|------|-------------|---------|
| **Guest** | Visiteur non connecté | Landing page, paywall simulateur |
| **Unverified** | Inscrit, email non vérifié | Blocage accès, relance email |
| **Trial** | Essai gratuit actif | Accès limité, countdown |
| **Trial Expired** | Essai expiré | Paywall, upgrade CTA |
| **Subscribed** | Abonné actif | Accès complet |
| **Churned** | Abonnement annulé/expiré | Downgrade, réactivation |
| **Demo** | Mode démonstration | Données fictives, lecture seule |
| **Admin** | Administrateur plateforme | Back-office complet |
| **Impersonated** | Support en impersonation | Restrictions admin |

---

## Checklist par Fonctionnalité

### 1. Paiement / Checkout
- [ ] **Guest** : Peut acheter sans compte (guest checkout)
- [ ] **Authenticated** : Paiement avec customer Stripe existant
- [ ] **Existing subscriber** : Upgrade/downgrade
- [ ] **Mobile** : Responsive, redirection Stripe fonctionne

### 2. Authentification
- [ ] **Sign up** : Création compte + email vérification
- [ ] **Login** : Connexion standard
- [ ] **Password reset** : Flow complet
- [ ] **Social login** : Google si activé
- [ ] **Session expirée** : Redirection correcte

### 3. Accès aux Features
- [ ] **Guest** : Voit le paywall/teaser
- [ ] **Trial** : Accès avec limitations visibles
- [ ] **Subscribed** : Accès complet sans friction
- [ ] **Expired** : Blocage avec CTA upgrade

### 4. Edge Functions
- [ ] **Avec auth token** : User connecté
- [ ] **Sans auth token** : Guest (si supporté)
- [ ] **Token expiré** : Erreur claire, pas de crash
- [ ] **Vérifier les logs** après chaque test

---

## Protocole de Test

### Avant le test
1. Lister tous les états utilisateur concernés par la feature
2. Préparer les scénarios pour chaque état
3. Identifier les points d'échec potentiels

### Pendant le test
1. Tester chaque état dans l'ordre : Guest → Authenticated → Admin
2. Vérifier les logs (console + edge functions) après chaque action
3. Tester sur mobile ET desktop
4. Documenter les résultats immédiatement

### Après le test
1. Vérifier qu'aucun état n'a été oublié
2. Valider les messages d'erreur (ton neutre, actionnable)
3. Confirmer les redirections post-action

---

## Erreurs Courantes à Éviter

| Erreur | Impact | Prévention |
|--------|--------|------------|
| Tester uniquement en mode connecté | Guest checkout cassé | Toujours commencer par Guest |
| Ignorer les logs edge function | Erreurs silencieuses | Logs obligatoires après chaque test |
| Oublier le mobile | UX cassée sur 60% du trafic | Test mobile systématique |
| Ne pas tester les états expirés | Churn silencieux | Inclure Trial Expired dans la matrice |

---

## Validation Finale

Avant de déclarer un test "DONE" :

- [ ] Tous les états de la matrice ont été testés
- [ ] Logs edge functions vérifiés (pas d'erreur silencieuse)
- [ ] Test mobile effectué
- [ ] Messages d'erreur validés (ton + actionabilité)
- [ ] Redirections post-action correctes

---

## Automated Test Coverage (Browser)

The following can be tested via browser automation:
- ✅ Guest user flows (Profile 1: Future project holder)
- ✅ Public page navigation
- ✅ Simulator form functionality
- ✅ Guest checkout (Edge function + Stripe)
- ✅ Pack/pricing display

The following require **manual testing** with authenticated sessions:
- ⚠️ Profile 2: Single-site operator (auth required)
- ⚠️ Profile 3: Multi-site operator (multi-site access required)
- ⚠️ Profile 4: Beta operator (beta company access required)
- ⚠️ Profile 5: Platform Admin (admin role required)

---

*Dernière mise à jour : 2026-02-07*
*Suite à : TAEX-308 Post-Beta Commercial Rollout*
