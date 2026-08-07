# Plan d'ajout dans `docs/simulateur-v2-roadmap.md`

## Objectif

Compléter la feuille de route existante du nouveau simulateur avec deux chantiers manquants :

1. Sécurisation des variables d'environnement exposées dans le dépôt GitHub.
2. Dashboard d'administration du simulateur (basé sur le diagramme de cas d'utilisation `UC-diagram_admin.png` du Google Drive).

## Analyse de l'état actuel

- Le document existe à `docs/simulateur-v2-roadmap.md` (333 lignes, 14 sections).
- Les lots sont actuellement A → I, avec sections numérotées 1 → 14.
- Les conventions sont fixées : IDs de chantier, priorités P1/P2/P3, efforts S/M/L, tableau de synthèse, dépendances, séquencement, décisions ouvertes et nettoyage final.

## Plan de modification

### 1. Ajouter un nouveau lot J — Sécurité et opérations

- **Emplacement** : après la section 11 (Lot I — Intégration site), avant la section 12 (Séquencement recommandé).
- **Contenu** :
  - **Titre** : `## 10. Lot J — Sécurité et opérations` (décalage numérique des sections suivantes).
  - **Chantier J1** : *Nettoyage du dépôt GitHub des variables d'environnement exposées*.
    - **Contexte** : le fichier `.env` contient actuellement la clé publique Supabase et d'autres variables potentiellement sensibles dans l'historique Git. Même si `VITE_SUPABASE_PUBLISHABLE_KEY` est publique, sa présence dans le dépôt complique la rotation et la gestion des secrets. Les variables serveur (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, etc.) ne doivent jamais être versionnées.
    - **Résultat attendu** :
      1. Supprimer `/.env` du dépôt Git et l'ajouter à `.gitignore` s'il n'y est pas déjà.
      2. Supprimer l'historique Git contenant les anciennes valeurs de `.env` (ou considérer une rotation complète des valeurs sensibles comme suffisante, selon la politique choisie).
      3. Reconstruire les variables d'environnement dans Lovable Cloud Secrets pour les secrets serveur (runtime) et dans les variables publiques du projet pour les `VITE_*` (publishable Supabase, Stripe mode, etc.).
      4. Documenter la procédure pour les développeurs afin de récupérer les valeurs nécessaires en local (via l'interface Lovable ou un fichier `.env` transmis par un canal sécurisé) et faire tourner l'application localement.
    - **Priorité** : P1.
    - **Effort** : S.
    - **Dépendances** : aucune.
    - **Fichiers concernés** : `.env`, `.env.example`, `.gitignore`, documentation d'onboarding.

### 2. Ajouter un nouveau lot K — Administration du simulateur

- **Emplacement** : après le Lot J, avant le Séquencement recommandé.
- **Contenu** :
  - **Titre** : `## 11. Lot K — Administration du simulateur`.
  - **Chantier K1** : *Implémenter le dashboard administrateur du simulateur*.
    - **Contexte** : le Google Drive projet contient un diagramme de cas d'utilisation (`UC-diagram_admin.png`) décrivant les fonctionnalités attendues pour l'administrateur du simulateur (gestion des packs, des utilisateurs, des projets, des paiements, des statistiques, etc.).
    - **Résultat attendu** :
      - Créer une nouvelle section dédiée dans le back-office plateforme (sous `/admin/simulator` ou route équivalente) ou une application dédiée selon les maquettes.
      - Implémenter les cas d'utilisation du diagramme : visualisation des packs actifs, suivi des paiements, gestion des projets des utilisateurs, statistiques d'usage du simulateur, éventuellement gestion des contenus et paramétrage des prix.
      - Respecter la séparation des rôles (`super_admin`, `admin`, `billing` dans `public.platform_roles`) et les règles de l'administration existante (`PlatformAdminRoute`, `AdminProtectedRoute`).
      - Protéger les accès admin côté serveur (RLS + vérification du rôle dans les edge functions).
      - i18n fr/en pour toutes les nouvelles chaînes.
    - **Priorité** : P1.
    - **Effort** : L.
    - **Dépendances** : E3 (schéma base de données), G2 (back-end du dashboard projet), F3 (Stripe branché).
    - **Fichiers concernés** : à déterminer après analyse du diagramme ; typiquement nouvelles pages sous `src/pages/admin/simulator/`, nouveaux composants sous `src/components/admin/simulator/`, nouvelles edge functions sous `supabase/functions/admin-simulator-*`, mises à jour des locales.

### 3. Mettre à jour le tableau de synthèse

- Ajouter deux lignes :
  - `J1 | Sécurité | Nettoyage des variables d'environnement exposées | P1 | S | —`
  - `K1 | Administration | Dashboard administrateur du simulateur | P1 | L | E3, G2, F3`

### 4. Renumberoter les sections suivantes

- Séquencement recommandé : `## 10` → `## 12`.
- Décisions ouvertes : `## 13` → `## 14`.
- Rappel : nettoyage final : `## 14` → `## 15`.
- Mettre à jour les références internes si nécessaire.

### 5. Mettre à jour le graphe de séquencement

- Ajouter les nœuds J1 et K1.
- Ajouter les arcs de dépendance : `E3, F3, G2 → K1`.
- S'assurer que le chemin critique reste cohérent.

### 6. Vérification

- Relire le document complet pour cohérence des numéros de section, des IDs de chantier et des références.
- Vérifier que le lien vers `docs/simulateur-v2-onboarding.md` en introduction reste valide.
- Vérifier que le fichier de plan est sauvegardé et affiché à l'utilisateur pour approbation.

## Non inclus dans ce plan

- Aucune modification de code applicatif (`.env`, `.gitignore`, sources React, edge functions) : cette tâche ne concerne que la documentation `docs/simulateur-v2-roadmap.md`.
- Aucune action sur les secrets réels du projet (rotation, suppression) : uniquement la rédaction du chantier dans le document.

## Livrables

- `docs/simulateur-v2-roadmap.md` mis à jour avec les lots J et K, le tableau de synthèse et les sections renumérotées.
