# Backup & Restore — Guide Opérationnel

> **Version**: 1.0  
> **Dernière mise à jour**: 2026-01-17  
> **Responsable restauration**: CTO uniquement

---

## 1. Vue d'ensemble

### 1.1 Ce qui est sauvegardé

| Élément | Inclus | Fréquence | Rétention |
|---------|--------|-----------|-----------|
| Base de données PostgreSQL (schémas + données) | ✅ | Quotidienne | 7 jours (plan Pico) |
| Schémas système (`auth`, `storage`, `realtime`) | ✅ | Quotidienne | 7 jours |
| Fichiers Storage (avatars, exports) | ✅ | Quotidienne | 7 jours |
| Edge Functions (code) | ❌ | N/A | Via Git |
| Secrets & variables d'environnement | ❌ | N/A | Via Cloud config |

### 1.2 Ce qui n'est PAS sauvegardé

| Élément | Raison | Comment récupérer |
|---------|--------|-------------------|
| Données Stripe (abonnements, factures, paiements) | Données externes | Via `stripe-reconcile-cron` (TAEX-198) |
| Code source de l'application | Géré par Git | Redéploiement depuis repository |
| Logs anciens (>30 jours) | Politique de rétention | Non récupérables |
| Sessions utilisateurs | Éphémères | Reconnexion nécessaire |

---

## 2. Objectifs de Reprise

| Métrique | Objectif | Commentaire |
|----------|----------|-------------|
| **RPO** (Recovery Point Objective) | ≤ 24h | Perte maximale de données = 1 jour |
| **RTO** (Recovery Time Objective) | ≤ 4h | Temps de restauration complet |

---

## 3. Procédure de Restauration

### 3.1 Prérequis

- Accès CTO au projet Lovable Cloud (obligatoire)
- Accès au dashboard Stripe (pour réconciliation post-restore)
- Compte email admin pour notifications

### 3.2 Étapes de restauration

#### Étape 1: Évaluation de l'incident

```
□ Identifier la cause (migration défaillante, suppression accidentelle, corruption)
□ Déterminer le point de restauration cible (date/heure)
□ Estimer l'impact (tables affectées, utilisateurs impactés)
□ Notifier l'équipe via Slack/email
```

#### Étape 2: Restauration de la base de données

1. **Via l'interface Lovable Cloud**:
   - Accéder aux paramètres du projet → Backend → Backups
   - Sélectionner le point de restauration le plus récent avant l'incident
   - Cliquer "Restore" et confirmer

2. **Points d'attention**:
   - La restauration écrase TOUTES les données actuelles
   - Les utilisateurs connectés seront déconnectés
   - Les sessions en cours seront perdues

#### Étape 3: Validation post-restauration

```
□ Vérifier la connexion à la base de données
□ Confirmer que les tables critiques sont présentes:
   - profiles
   - organizations
   - sites
   - operations
   - subscriptions
□ Vérifier un échantillon de données récentes
```

### 3.3 Checklist post-restauration

#### A. Tests de smoke obligatoires

```bash
# Exécuter les tests de smoke via l'API
POST /functions/v1/smoke-tests-cron

# Vérifier les résultats dans system_events
SELECT * FROM system_events 
WHERE source = 'smoke_tests' 
ORDER BY created_at DESC 
LIMIT 10;
```

#### B. Recalcul des analytics

```sql
-- Identifier les sites nécessitant un recalcul
SELECT id, name, updated_at FROM sites 
WHERE updated_at > '[DATE_RESTAURATION]';

-- Trigger le recalcul via l'admin UI ou cron
POST /functions/v1/compute-analytics-cron
```

#### C. Réconciliation Stripe (CRITIQUE)

```
□ Accéder à /admin/system-status
□ Cliquer "Lancer Réconciliation" dans la section Billing Health
□ Vérifier le rapport:
   - fixed_count: corrections automatiques
   - anomalies: éléments à vérifier manuellement
□ Si anomalies > 0:
   - Consulter les détails dans system_events (source=stripe_reconcile)
   - Corriger manuellement si nécessaire via Stripe Dashboard
```

#### D. Vérifications finales

```
□ Tester la connexion utilisateur (login/logout)
□ Tester un import CSV sur un site test
□ Vérifier l'affichage du dashboard principal
□ Confirmer les derniers import_batches visibles:
   SELECT filename, created_at, imported_rows 
   FROM import_batches 
   ORDER BY created_at DESC 
   LIMIT 5;
□ Notifier l'équipe que le service est rétabli
```

---

## 4. Scénarios de Restauration

### 4.1 Suppression accidentelle de données

| Situation | Action |
|-----------|--------|
| Suppression d'opérations (< 24h) | Restaurer depuis backup quotidien |
| Suppression d'un site complet | Restaurer depuis backup + re-réconcilier Stripe |
| Suppression d'un utilisateur | Restaurer depuis backup + reset password |

### 4.2 Migration défaillante

| Situation | Action |
|-----------|--------|
| Migration échoue partiellement | Rollback via Lovable Cloud puis réessayer |
| Migration corrompt les données | Restaurer le backup précédent |
| Contraintes FK cassées | Restaurer + analyser les dépendances |

### 4.3 Corruption de données

| Situation | Action |
|-----------|--------|
| Valeurs incorrectes dans subscriptions | Restaurer + réconciliation Stripe |
| Analytics incohérents | Restaurer + recalcul complet via cron |
| Profils utilisateurs corrompus | Restaurer + vérifier auth.users |

---

## 5. Drill de Restauration Mensuel

### Objectif

Valider la procédure de restauration dans un environnement de test chaque mois.

### Checklist du drill

```
□ Date du drill: _______________
□ Effectué par: _______________
□ Environnement: staging / preview

□ Étapes validées:
   □ Accès au backup vérifié
   □ Restauration effectuée (ou simulée)
   □ Tests de smoke passés
   □ Réconciliation Stripe testée
   
□ Durée totale: _______ minutes
□ Problèmes rencontrés: _______________
□ Actions correctives: _______________
```

### Rappel mensuel

Un événement est loggé dans `system_events` le 1er de chaque mois:
- `source`: `backup_drill`
- `severity`: `info`
- `message`: `Rappel: effectuer le drill de restauration mensuel`

---

## 6. Contacts d'urgence

| Rôle | Contact | Disponibilité |
|------|---------|---------------|
| CTO (restauration) | [À compléter] | 24/7 pour incidents critiques |
| Support Lovable | support@lovable.dev | Heures ouvrées |
| Support Stripe | dashboard.stripe.com | 24/7 |

---

## 7. Historique des restaurations

| Date | Raison | Durée | Données perdues | Effectué par |
|------|--------|-------|-----------------|--------------|
| - | - | - | - | - |

---

## 8. Références

- [TAEX-198 Stripe Reconciliation](../stripe-reconcile.md) - Réconciliation automatique
- [Security Checklist](../security-checklist.md) - Bonnes pratiques sécurité
- [Edge Functions Architecture](../edge-functions-architecture.md) - Architecture backend
