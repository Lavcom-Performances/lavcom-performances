# Feuille de route — Nouveau simulateur de rentabilité

> English version: [docs/en/simulateur-v2-roadmap.md](./en/simulateur-v2-roadmap.md)

> Document destiné aux développeurs rejoignant le projet. Il recense **tout ce qui reste à faire** sur le nouveau simulateur (`/simulator/*`) et son tableau de bord (`/dashboard-simulator/*`).
>
> Pour comprendre **ce qui existe déjà** (architecture, contextes, validation, calculs, i18n), lire au préalable [`docs/simulateur-v2-onboarding.md`](./simulateur-v2-onboarding.md).

Dernière mise à jour : 7 août 2026.

---

## 1. Conventions de lecture

Chaque chantier possède un identifiant stable (`A1`, `B2`, ...) réutilisable dans les tickets et les branches.

| Champ | Valeurs | Signification |
|---|---|---|
| Priorité | `P1` / `P2` / `P3` | P1 = bloquant pour la livraison, P2 = nécessaire avant mise en production, P3 = amélioration souhaitable. |
| Effort | `S` / `M` / `L` | S = moins d'une journée, M = 1 à 3 jours, L = plus de 3 jours ou dépendant d'un tiers. |
| Dépendances | IDs de chantiers | Travaux à terminer avant de démarrer celui-ci. |

Règles projet à respecter sur l'ensemble de ces chantiers :

- Modifications **additives et non cassantes** : les anciens parcours `/simulateur` et `/simulation` restent fonctionnels en production tant que le nouveau simulateur n'est pas livré.
- Toute chaîne affichée passe par i18n (namespace `paid-simulator`), jamais de texte en dur.
- Aucune couleur en dur : utiliser les tokens du design system (`bg-primary`, `text-foreground`, `shadow-form`, ...).
- Tout accès base de données respecte l'isolation par utilisateur (`auth.uid()`) et le soft-delete.

---

## 2. Tableau de synthèse

| ID | Lot | Chantier | Priorité | Effort | Dépend de |
|---|---|---|---|---|---|
| A1 | Dette technique | Refactoriser `useAddressSearch` | P2 | S | — |
| A2 | Dette technique | Refactoriser `AddressAutocomplete` | P2 | S | A1 |
| A3 | Dette technique | Revue de code des composants `dashboard-simulator` générés | P1 | M | — |
| B1 | UX étape 1 | Regrouper visuellement les horaires personnalisés | P2 | S | — |
| B2 | UX étape 1 | Regrouper visuellement les jours d'ouverture personnalisés | P2 | S | — |
| B3 | UX étape 1 | Harmoniser les cartes de l'onglet « Mon projet » avec « Contraintes du local » | P2 | M | — |
| C1 | Métier | Décision : horaires différenciés par jour | P2 | M | — |
| C2 | Métier | Compléter les avertissements de faisabilité et leur répartition par page | P1 | M | — |
| C3 | Métier | Validation étape 3 : au moins une charge par carte | P1 | S | — |
| D1 | Design system | Refonte UI du `SimulatorStepper` + sticky | P2 | M | — |
| D2 | Design system | Responsive de toutes les pages | P1 | L | B1, B2, B3, D1 |
| D3 | Design system | Thème sombre/clair `/simulator/*` + dashboard | P2 | M | — |
| D4 | Design system | Audit et corrections d'accessibilité | P1 | M | D2 |
| E1 | Base de données | Mettre à jour l'ERD et le dictionnaire de données | P1 | M | C1 |
| E2 | Base de données | Validation de la conception par Raul | P1 | S | E1 |
| E3 | Base de données | Créer le schéma validé (tables, RLS, grants) | P1 | L | E2 |
| F1 | Monétisation | Refondre `/subscribe-simulator` selon la maquette Figma | P1 | M | — |
| F2 | Monétisation | Refondre `/simulator-payment-success` selon la maquette Figma | P1 | M | — |
| F3 | Monétisation | Brancher Stripe sur le nouveau simulateur | P1 | L | E3, F1, F2 |
| G1 | Dashboard | Aligner les composants sur les maquettes Figma | P1 | L | A3 |
| G2 | Dashboard | Brancher le back-end (remplacer les mocks) | P1 | L | E3, G1 |
| G3 | Dashboard | Relier simulateur et dashboard pour un utilisateur connecté | P1 | M | F3, G2 |
| G4 | Dashboard | Internationalisation i18n fr/en | P2 | M | G1 |
| H1 | Tests | Compléter et implémenter `simulator-test-plan.md` | P1 | L | C2, C3 |
| H2 | Tests | Plan de tests complet du dashboard | P2 | M | G2 |
| H3 | Tests | Test du workflow complet de bout en bout | P1 | M | G3, H1 |
| I1 | Intégration site | Rediriger « Essayer le simulateur gratuit » vers le nouveau simulateur | P2 | S | D2 |
| J1 | Sécurité | Nettoyage des variables d'environnement exposées sur GitHub | P1 | S | — |
| K1 | Administration | Dashboard administrateur du simulateur | P1 | L | E3, G2, F3 |

---

## 3. Lot A — Dette technique et refactoring

### A1. Refactoriser `useAddressSearch`

**Contexte.** `src/hooks/useAddressSearch.ts` interroge deux fournisseurs (API Adresse BAN pour la France, Nominatim/OpenStreetMap pour les autres pays) dans un même hook. La logique de sélection du fournisseur, de normalisation de la réponse et de debounce est mélangée.

**Résultat attendu.**
- Extraire un adaptateur par fournisseur (`searchBan`, `searchNominatim`) exposant la même signature et renvoyant le type normalisé `AddressSearchResult`.
- Le hook ne conserve que l'orchestration : debounce, seuil de 3 caractères, annulation de la requête précédente (`AbortController`), états `results` / `isLoading` / `error`.
- Ajouter la gestion d'erreur explicite (actuellement les erreurs sont silencieusement transformées en liste vide).
- Couvrir les adaptateurs par des tests unitaires avec réponses figées.

**Points d'attention.** Nominatim impose une politique d'usage (un appel par seconde maximum, en-tête d'identification). Conserver le debounce à 300 ms minimum et ne pas déclencher de recherche sur remplissage programmatique du champ.

### A2. Refactoriser `AddressAutocomplete`

**Contexte.** `src/components/simulator/project/AddressAutocomplete.tsx` gère quatre états locaux (`inputValue`, `isOpen`, `justSelected`, `isUserTyping`) pour éviter de relancer une recherche après sélection ou après remplissage depuis le localStorage. C'est fragile et difficile à faire évoluer.

**Résultat attendu.**
- Simplifier la machine à états (un seul état `mode: "idle" | "typing" | "selected"`).
- Rendre le composant accessible au clavier : `role="combobox"`, `aria-expanded`, `aria-activedescendant`, navigation flèches haut/bas, `Entrée` pour valider, `Échap` pour fermer. Envisager `Command` de shadcn plutôt qu'une liste de `button` maison.
- Mutualiser avec la variante historique `src/components/simulation/AddressAutocomplete.tsx` uniquement si le nettoyage de l'ancien simulateur n'est pas déjà planifié — sinon laisser l'ancien intact.

### A3. Revue de code des composants `dashboard-simulator`

**Contexte.** Les composants de `src/components/dashboard-simulator/` et `src/pages/dashboard-simulator/` ont été générés rapidement et n'ont pas encore fait l'objet d'une relecture.

**Résultat attendu.** Relecture systématique : cohérence des conventions de nommage, découpage des composants trop longs, suppression du code mort, typage strict (aucun `any`), remplacement des couleurs en dur par des tokens, factorisation des primitives dupliquées avec `src/components/ui/`.

**Livrable.** Une note de revue listant les corrections faites et celles renvoyées vers G1 (alignement Figma).

---

## 4. Lot B — UX/UI de l'étape 1 (`/simulator/project`)

### B1. Regrouper les horaires d'ouverture personnalisés

**Contexte.** Dans `OpeningHoursCard.tsx`, lorsque l'utilisateur choisit « Horaires personnalisés… », les champs « Heure d'ouverture » et « Heure de fermeture » apparaissent au même niveau visuel que le sélecteur parent. Rien n'indique qu'ils dépendent de ce choix.

**Résultat attendu.** Encapsuler les champs conditionnels dans un bloc visuellement distinct : fond légèrement contrasté (`bg-muted/40`), bordure gauche ou encadrement, titre de sous-section, et transition d'apparition. Le bloc doit clairement se lire comme une extension du champ parent.

### B2. Regrouper les jours d'ouverture personnalisés

**Contexte.** Même problème pour la grille de cases à cocher des jours d'ouverture affichée en mode personnalisé.

**Résultat attendu.** Même traitement visuel que B1, avec une grille responsive (7 colonnes sur desktop, 3 à 4 colonnes sur mobile), un libellé de sous-section, et un état d'erreur lisible si aucun jour n'est coché.

**Point d'attention.** B1 et B2 doivent partager le même composant de sous-section (par exemple `FieldSubGroup`) pour garantir la cohérence visuelle.

### B3. Harmoniser les cartes de l'onglet « Mon projet »

**Contexte.** L'onglet « Contraintes du local » sert de référence visuelle validée : cartes `FormCard` avec `shadow-form`, en-tête icône + titre + description, espacements réguliers. L'onglet « Mon projet » n'a pas encore été aligné.

**Résultat attendu.** Passer toutes les sections de l'onglet « Mon projet » au même gabarit : structure de carte identique, hiérarchie typographique identique, mêmes espacements verticaux, mêmes largeurs de champs, mêmes états d'erreur. Aucun changement de logique métier ni de nom de champ.

---

## 5. Lot C — Règles métier et validation

### C1. Décision : horaires différenciés par jour

**Contexte.** Aujourd'hui, en mode personnalisé, une seule plage horaire s'applique à tous les jours d'ouverture sélectionnés. La question est de savoir s'il faut permettre une plage horaire par jour.

**Éléments à instruire avant de trancher.**
- *Valeur métier* : combien de laveries réelles ont des horaires différents selon le jour ? Le cas le plus fréquent est probablement le dimanche ou un jour de fermeture partielle.
- *Impact sur les calculs* : les formules de `src/utils/machineRevenueCalculations.ts` et `src/utils/profitabilityCalculations.ts` reposent sur un nombre d'heures d'ouverture par jour homogène et sur `DAYS_PER_MONTH = 30`. Passer à un horaire par jour impose de calculer un total d'heures hebdomadaire puis de le ramener au mois, ce qui change la base de calcul du chiffre d'affaires et du seuil de rentabilité.
- *Impact modèle de données* : passage d'un couple `(openTime, closeTime)` à une collection `{ jour, ouverture, fermeture }`, avec conséquence directe sur E1.
- *Impact UX* : sept lignes de champs supplémentaires alourdissent fortement l'étape 1.

**Recommandation à valider.** Conserver une plage unique pour la version 1 et documenter l'hypothèse dans l'interface (« ces horaires s'appliquent à tous les jours sélectionnés »). Si la fonctionnalité est retenue, prévoir un modèle de données déjà compatible dès E1 afin d'éviter une migration ultérieure.

**Livrable.** Une décision écrite dans ce document, section 9.

### C2. Compléter les avertissements de faisabilité

**Contexte.** `ProjectWarnings.tsx` ne couvre qu'une partie des contrôles de faisabilité. Les données saisies à l'étape 1 (largeur de porte, façade modifiable, obstacles structurels, niveau de contraintes techniques, surface, forme du local) permettent d'en produire davantage.

**Résultat attendu.**
- Centraliser les règles dans un module dédié (par exemple `src/utils/feasibilityWarnings.ts`) renvoyant une liste typée `{ id, severity, scope, i18nKey, params }` où `scope` vaut `project`, `machines` ou `results`.
- Afficher les avertissements de portée `project` sur `/simulator/project`, ceux de portée `machines` sur `/simulator/machines` (typiquement : porte trop étroite pour un lave-linge grande capacité, surface insuffisante pour le nombre de machines configuré, puissance électrique et évacuation incompatibles avec le nombre de sèche-linge).
- Afficher **l'intégralité** des avertissements en récapitulatif sur `/simulator/results`, groupés par sévérité.
- Un avertissement n'est jamais bloquant : il informe, contrairement aux erreurs de validation Zod.
- Toutes les chaînes dans `paid-simulator.json` (fr et en).

**Point d'attention.** Ne pas dupliquer la logique entre les pages : les trois pages consomment le même module, seul le filtre sur `scope` change.

### C3. Validation de l'étape 3 : au moins une charge par carte

**Contexte.** Aujourd'hui, la suppression de toutes les charges d'une carte ne produit pas de message clair. Le message générique `charges.invalidFixedCost` / `charges.invalidVariableCost` s'affiche au niveau du champ, ce qui n'a pas de sens lorsque la liste est vide.

**Résultat attendu.**
- L'utilisateur peut supprimer toutes les charges d'une carte (aucun blocage sur le bouton de suppression).
- Si la liste des charges fixes est vide, ou celle des charges variables est vide, la validation de l'étape 3 échoue.
- Le message d'erreur s'affiche **au niveau de la section**, dans un emplacement dédié, et remplace le `<span className="block text-destructive">{t(costType === "fixed" ? "charges.invalidFixedCost" : "charges.invalidVariableCost")}</span>` actuel. Nouvelles clés : `charges.emptyFixedCosts` et `charges.emptyVariableCosts`, formulées comme « Indiquez au moins une charge fixe ».
- Le message de section doit être détectable par `scrollToFirstError` : lui appliquer l'attribut `data-slot="field-error"` déjà utilisé par l'utilitaire.
- Le compteur d'erreurs du toaster doit inclure ces deux erreurs de section.

**Fichiers concernés.** `src/lib/validation/simulatorProjectSchema.ts`, `src/components/simulator/charges/CostsCard.tsx`, `src/hooks/useSimulatorValidation.ts`, fichiers de locale fr/en.

---

## 6. Lot D — Design system, navigation et qualité d'interface

### D1. Refonte UI du `SimulatorStepper` et passage en sticky

**Contexte.** `src/components/simulator/layout/SimulatorStepper.tsx` défile avec le contenu : sur les pages longues (machines, charges) l'utilisateur perd la visibilité de sa progression.

**Résultat attendu.**
- Refonte visuelle alignée sur la maquette validée.
- Positionnement `sticky` sous le header, avec le même comportement d'empilement que celui-ci (attention à l'ordre des `z-index` et au décalage vertical cumulé header + stepper).
- Variante compacte sur mobile (numéro d'étape courant, libellé, barre de progression) pour ne pas consommer trop de hauteur.
- Conserver la navigation vers les étapes déjà complétées et l'`aria-label` de progression.

### D2. Responsive design de toutes les pages

**Résultat attendu.** Passage en revue de `/simulator/project`, `/simulator/machines`, `/simulator/charges`, `/simulator/results`, `/subscribe-simulator`, `/simulator-payment-success` et de l'ensemble du dashboard sur les points de rupture 320, 375, 768, 1024 et 1440 px. Aucun débordement horizontal, aucune troncature de libellé, tableaux transformés en cartes empilées sur mobile, boutons de navigation accessibles sans scroll horizontal.

### D3. Thème sombre et clair

**Résultat attendu.** Vérifier que `/simulator/*` et `/dashboard-simulator/*` respectent les deux thèmes. Remplacer les valeurs de couleur en dur restantes par des tokens sémantiques, vérifier les ombres personnalisées (`shadow-form`, `shadow-profitability`) en thème sombre, contrôler la lisibilité des états masqués (effet de flou du paywall) et des états d'erreur.

### D4. Accessibilité

**Résultat attendu.** Audit complet puis corrections, par ordre de sévérité :
- *Critique* : champs sans libellé associé, boutons icône sans `aria-label`, gestionnaires de clic sur éléments non interactifs, `aria-hidden` sur des conteneurs focusables, autocomplétion d'adresse non navigable au clavier (voir A2).
- *Avertissement* : hiérarchie de titres, présence d'un unique `<main>`, indicateurs de focus visibles, cibles tactiles d'au moins 44x44 px, information portée uniquement par la couleur.
- *Information* : images décoratives en `alt=""`, régions `aria-live` pour les messages de validation et les toasters, listes sémantiques.

---

## 7. Lot E — Base de données

### E1. Mettre à jour l'ERD et le dictionnaire de données

**Contexte.** Le projet en cours de simulation est aujourd'hui persisté uniquement dans le localStorage, via `useSimulatorProject`. La structure a évolué (horaires personnalisés, jours d'ouverture, contraintes du local, listes de machines, charges fixes et variables) depuis la dernière version de l'ERD partagé sur Google Drive.

**Résultat attendu.** ERD et dictionnaire de données à jour, reflétant exactement le type `SimulatorProject` de `src/types/simulator.types.ts`, avec pour chaque attribut : nom, type, nullabilité, valeur par défaut, contrainte, description métier et unité (les montants sont en euros). Intégrer la décision issue de C1 sur les horaires.

### E2. Validation de la conception par Raul

Revue de la modélisation avec Raul avant toute écriture de migration. Points à faire arbitrer : granularité des tables (un projet unique contre projet + scénarios), stratégie de versionnement des scénarios, rattachement au pack acheté, politique de conservation et de soft-delete.

### E3. Créer le schéma validé

**Résultat attendu.** Migrations créant les tables validées, avec dans le même script et dans cet ordre : `CREATE TABLE`, `GRANT` pour les rôles concernés, activation de RLS, puis politiques. Les politiques scopent systématiquement sur `auth.uid()`. Prévoir les index sur les clés étrangères et sur les colonnes de tri, ainsi que les déclencheurs `updated_at`.

---

## 8. Lot F — Monétisation

### F1. Refondre `/subscribe-simulator`

Aligner `src/pages/SubscribeSimulator.tsx` sur la maquette Figma validée : présentation des packs, comparatif, éléments de réassurance, appel à l'action. Toutes les chaînes en i18n, prix issus de la configuration (`src/config/pricingConfig.ts` / `stripeConfig.ts`) et jamais codés en dur dans le composant.

### F2. Refondre `/simulator-payment-success`

Refactoriser `src/pages/SimulatorPaymentSuccess.tsx` selon la maquette validée : confirmation d'achat, récapitulatif du pack, prochaines étapes, accès direct aux résultats débloqués et au tableau de bord.

### F3. Brancher Stripe sur le nouveau simulateur

**Résultat attendu.**
- Réutiliser les identifiants de prix Stripe existants ou en créer de nouveaux, référencés en dur dans la configuration source (jamais de `price_data` dynamique).
- Fonction edge de création de session de paiement compatible **invité et utilisateur connecté** (en-têtes CORS obligatoires pour le parcours invité).
- Fonction de vérification de l'accès au pack, appelée au chargement des résultats.
- Remplacer la constante `IS_SIMULATOR_PACK_ACTIVE` de `PaywallCallout.tsx` et `ProfitabilityCard.tsx` par cet état réel (voir section 9).
- Le masquage des chiffres reste côté serveur autant que possible : ne pas envoyer les valeurs réelles au client tant que le pack n'est pas actif.

---

## 9. Lot G — Tableau de bord porteur de projet

### G1. Aligner les composants sur les maquettes Figma

Reprendre l'ensemble des écrans du `dashboard-simulator` (accueil, projets, scénarios, comparaison, rapports, achats, compte) selon les maquettes validées. À faire après la revue de code A3 pour ne pas refondre du code qui sera ensuite jeté.

### G2. Brancher le back-end

Remplacer les mocks de `src/mocks/dashboard-simulator/` et les hooks `use-mock-query` par de véritables requêtes sur le schéma créé en E3. Gérer explicitement les états de chargement, d'erreur et de liste vide. Pagination côté serveur pour les listes de projets et de rapports.

### G3. Relier simulateur et dashboard

Pour un utilisateur connecté disposant d'un pack : persistance du projet en base plutôt qu'en localStorage, reprise d'un projet existant depuis le dashboard vers `/simulator/project`, enregistrement d'un scénario depuis la page de résultats, et affichage des résultats non masqués. Prévoir la migration du projet présent en localStorage au moment de la connexion.

### G4. Internationalisation fr/en du dashboard

Créer un namespace i18n dédié (par exemple `dashboard-simulator`), déplacer les chaînes actuellement dans `src/constants/dashboard-simulator/*.strings.ts` vers les fichiers de locale, enregistrer le namespace dans `src/lib/i18n-config.ts`, et vérifier la parité des clés fr/en.

---

## 10. Lot H — Tests et qualité

### H1. Compléter et implémenter le plan de test du simulateur

Compléter `docs/testing/simulator-test-plan.md` avec les cas issus de C2 et C3, puis implémenter :
- *Tests unitaires* : `profitabilityCalculations`, `machineRevenueCalculations`, schémas Zod par section, comptage des erreurs de `useSimulatorValidation`, adaptateurs de recherche d'adresse, module d'avertissements de faisabilité.
- *Tests fonctionnels* : parcours complet des quatre étapes, blocage et défilement vers la première erreur, réinitialisation du projet avec redirection, persistance localStorage, bascule fr/en.

### H2. Plan de tests complet du dashboard

Rédiger un plan couvrant le fonctionnel, l'unitaire, l'intégration et la sécurité. Le volet sécurité doit vérifier explicitement l'isolation des données entre utilisateurs, l'impossibilité d'accéder à un projet d'un autre compte, et la non-divulgation des résultats à un utilisateur sans pack actif.

### H3. Test du workflow complet

Scénario de bout en bout : visiteur anonyme → simulation complète → résultats masqués → achat d'un pack → création de compte → résultats débloqués → projet visible dans le dashboard → reprise et modification du projet → génération d'un rapport.

---

## 11. Lot I — Intégration au site

### I1. Rediriger le bouton de la page d'accueil

Sur la page d'accueil, section « Simulateur de rentabilité », le bouton « Essayer le simulateur gratuit » doit pointer vers le nouveau simulateur au lieu de l'ancien parcours. À faire une fois le responsive (D2) validé, pour ne pas exposer une interface incomplète au trafic public.

---

## 12. Lot J — Sécurité et opérations

### J1. Nettoyage des variables d'environnement exposées sur GitHub

**Contexte.** Le dépôt Git contient actuellement un fichier `.env` avec des valeurs de configuration (clé publique Supabase, mode Stripe, etc.). Même si `VITE_SUPABASE_PUBLISHABLE_KEY` est une clé publique destinée au navigateur, la présence d'un fichier `.env` versionné pose un risque opérationnel : toute rotation future, toute erreur de copier-coller d'une clé secrète, ou tout ajout de variable serveur (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, etc.) peut être commité par inadvertance. Les variables serveur ne doivent jamais figurer dans le dépôt.

**Résultat attendu.**
1. Supprimer le fichier `.env` du dépôt Git tout en le conservant localement (`git rm --cached .env`).
2. S'assurer que `.env` est bien listé dans `.gitignore` et qu'il le reste.
3. Faire tourner les valeurs sensibles : regénérer dans Lovable Cloud Secrets les secrets serveur (runtime) et, pour les variables publiques `VITE_*`, les reconfigurer dans les variables d'environnement du projet Lovable.
4. Vérifier que la clé publique Supabase actuelle (`VITE_SUPABASE_PUBLISHABLE_KEY`) est bien tournée/renouvelée si elle a été exposée dans l'historique Git, ou au minimum que la procédure de rotation est documentée.
5. Documenter pour les nouveaux développeurs comment récupérer les valeurs nécessaires en local (via l'interface Lovable ou un canal sécurisé) et comment créer leur propre `.env` à partir du modèle `.env.example` sans jamais le commiter.
6. Mettre à jour la section « Variables d'environnement » de `docs/simulateur-v2-onboarding.md` pour refléter cette nouvelle procédure.

**Points d'attention.**
- Cette opération n'a pas d'impact direct sur l'application en production si les secrets sont bien reconstruits dans Lovable avant le prochain déploiement.
- Prévenir l'équipe qu'une fois `.env` retiré du dépôt, les clones existants devront être nettoyés manuellement pour ne pas réintroduire le fichier.

**Fichiers concernés.** `.env`, `.gitignore`, `.env.example`, `docs/simulateur-v2-onboarding.md`.

---

## 13. Lot K — Administration du simulateur

### K1. Dashboard administrateur du simulateur

**Contexte.** Le Google Drive du projet contient un diagramme de cas d'utilisation (`UC-diagram_admin.png`) décrivant les fonctionnalités attendues pour l'administrateur du simulateur. Aujourd'hui, le back-office plateforme (`/admin/*`) gère les utilisateurs, la facturation et la bêta, mais il n'existe pas encore de section dédiée au suivi et à la gestion du simulateur payant.

**Résultat attendu.**
- Créer une section dédiée dans le back-office plateforme, par exemple `/admin/simulator` (ou route équivalente validée avec les UX designers), afin de centraliser l'administration du simulateur.
- Implémenter les cas d'utilisation du diagramme `UC-diagram_admin.png`, typiquement :
  - Visualisation et gestion des packs achetés (actifs, expirés, à renouveler).
  - Suivi des paiements et des statuts de transaction Stripe.
  - Liste des projets/scénarios créés par les utilisateurs, avec possibilité d'inspection en lecture seule.
  - Statistiques d'usage du simulateur (nombre de simulations démarrées, complétées, taux de conversion vers l'achat).
  - Gestion des paramètres commerciaux du simulateur (prix des packs, durées d'extension, limites d'usage).
- Respecter la séparation des rôles de `public.platform_roles` (`super_admin`, `admin`, `billing`) : le dashboard administrateur doit être accessible aux rôles pertinents, sans élargir les droits d'un rôle existant.
- Protéger les accès côté serveur : les fonctions edge utilisées par ce dashboard doivent vérifier le rôle de l'utilisateur et ne jamais renvoyer de données sensibles (clés, tokens, informations de paiement complètes) au client.
- Réutiliser les composants et patterns du dashboard projet (`src/pages/dashboard-simulator/`, `src/components/dashboard-simulator/`) lorsque c'est pertinent, après la revue de code A3.
- Toutes les chaînes affichées doivent passer par i18n (locales fr/en).

**Points d'attention.**
- Le dashboard administrateur est distinct du dashboard porteur de projet (`/dashboard-simulator/*`). Le premier est un outil interne pour l'équipe Lavcom ; le second est un espace client pour les utilisateurs ayant acheté un pack.
- Les maquettes Figma du dashboard administrateur, si elles existent, doivent être consultées avant le démarrage de K1.
- S'assurer que l'implémentation reste cohérente avec les conventions de la section admin existante (`PlatformAdminRoute`, `AdminLayout`, `AdminSidebar`).

**Dépendances.** E3 (schéma base de données), G2 (back-end du dashboard projet), F3 (Stripe branché).

**Fichiers concernés.** `src/pages/admin/simulator/` (à créer), `src/components/admin/simulator/` (à créer), `supabase/functions/admin-simulator-*` (à créer), fichiers de locale fr/en.

---

## 14. Séquencement recommandé

```text
Phase 1 — Stabilisation du simulateur
  A1 → A2
  B1 → B2 → B3
  C1, C2, C3
  D1
  J1

Phase 2 — Base de données
  C1 → E1 → E2 → E3

Phase 3 — Paiement et tableau de bord
  A3 → G1
  E3 + F1 + F2 → F3
  E3 + G1 → G2 → G3
  G1 → G4
  E3 + F3 + G2 → K1

Phase 4 — Qualité, tests et ouverture
  D2 → D4
  D3
  C2 + C3 → H1 → H3
  G2 → H2
  D2 → I1
  Nettoyage final des anciens simulateurs
```

Le chemin critique passe par `C1 → E1 → E2 → E3 → F3 / G2 → G3 → H3`. Le dashboard administrateur (K1) dépend du back-end du dashboard projet (G2) et de Stripe (F3) : il peut être démarré dès que ces deux chantiers sont stables. La validation de la base de données par Raul (E2) est la dépendance externe la plus susceptible de retarder l'ensemble : la lancer au plus tôt.

---

## 15. Décisions ouvertes

| # | Question | Impact | Statut |
|---|---|---|---|
| 1 | Autoriser des horaires différents par jour d'ouverture ? | Modèle de données (E1), calculs de rentabilité, UX de l'étape 1 | À trancher (voir C1) |
| 2 | Granularité d'affichage des avertissements de faisabilité : au fil de l'eau à chaque étape, ou uniquement en récapitulatif ? | UX, C2 | Hypothèse retenue : les deux, filtrés par portée |
| 3 | Comment porter l'état « pack actif » une fois le dashboard opérationnel : contexte React alimenté par une requête, ou vérification par fonction edge à chaque affichage des résultats ? | Sécurité des résultats, F3 | À trancher avant F3 |
| 4 | Un projet peut-il porter plusieurs scénarios versionnés, ou un scénario est-il un projet à part entière ? | Modèle de données (E1, E2) | À trancher avec Raul |
| 5 | Que devient un projet créé en mode visiteur au moment de la création de compte : migration automatique ou choix explicite de l'utilisateur ? | G3 | À trancher avant G3 |

Les décisions prises doivent être consignées dans ce tableau, avec leur date, plutôt que dans un canal de discussion.

---

## 16. Rappel : nettoyage final

Une fois le nouveau simulateur livré et validé en production, une phase de dépose devra être planifiée :

1. Retirer les routes `/simulateur` et `/simulation` ainsi que leurs pages et composants (`src/components/simulation/`, `src/pages/simulation/`).
2. Supprimer les hooks, types et utilitaires exclusivement utilisés par ces parcours (`useSimulationProject`, `useSimulationValidation`, `src/types/simulation.ts`, etc.).
3. Corriger tous les liens internes, appels à l'action marketing, entrées de menu, sitemap et redirections pour pointer vers le nouveau simulateur (mettre en place des redirections permanentes depuis les anciennes URL pour préserver le référencement).
4. Nettoyer les clés de traduction et les tables devenues inutilisées, après vérification qu'aucune donnée utilisateur n'est perdue.

Ce nettoyage n'est pas un chantier de cette feuille de route : il fait l'objet d'un lot distinct à planifier après la mise en production.
