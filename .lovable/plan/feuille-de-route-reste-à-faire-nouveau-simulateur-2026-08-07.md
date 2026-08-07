# Feuille de route — Reste à faire (nouveau simulateur)

Création d'un document professionnel `docs/simulateur-v2-roadmap.md`, complémentaire à `docs/simulateur-v2-onboarding.md`, destiné aux nouveaux arrivants pour comprendre ce qui reste à développer.

## Contenu du document

1. **Introduction** — objectif, lien vers le document d'onboarding, convention de lecture (statut, priorité, effort, dépendances).
2. **Tableau de synthèse** — l'ensemble des chantiers avec ID, lot, priorité (P1/P2/P3), effort (S/M/L), dépendances.
3. **Chantiers détaillés**, regroupés en 9 lots :
   - **Lot A — Dette technique & refactoring** : `useAddressSearch`, `AddressAutocomplete`, revue du code des composants `dashboard-simulator` générés.
   - **Lot B — UX/UI étape 1 (`/simulator/project`)** : regroupement visuel des horaires personnalisés, des jours d'ouverture, harmonisation des cartes de l'onglet « Mon projet » avec l'onglet « Contraintes du local ».
   - **Lot C — Règles métier & validation** : réflexion ouverte sur les horaires différenciés par jour (avec impact sur les calculs), avertissements de faisabilité (porte, contraintes techniques) répartis par page + récapitulatif final sur les résultats, validation étape 3 (au moins une charge fixe et une charge variable, message de section dédié).
   - **Lot D — Design system & navigation** : refonte UI du `SimulatorStepper` + passage en sticky, responsive de toutes les pages, thème sombre/clair sur `/simulator/*` et `dashboard-simulator`, accessibilité.
   - **Lot E — Base de données** : mise à jour de l'ERD et du dictionnaire de données selon l'état actuel du localStorage, validation par Raul, puis création des tables/RLS.
   - **Lot F — Monétisation** : maquettes Figma de `/subscribe-simulator` et `/simulator-payment-success`, branchement Stripe.
   - **Lot G — Dashboard porteur de projet** : alignement Figma, branchement back-end, i18n fr/en, liaison avec le simulateur pour un utilisateur connecté.
   - **Lot H — Tests & qualité** : complétion de `simulator-test-plan.md` (tests unitaires + fonctionnels), plan de tests complet du dashboard (fonctionnel, unitaire, intégration, sécurité), test du workflow bout en bout.
   - **Lot I — Intégration site** : redirection du bouton « Essayer le simulateur gratuit » de la page d'accueil vers le nouveau simulateur.

   Chaque chantier détaille : contexte, fichiers concernés, résultat attendu, points d'attention.
4. **Séquencement recommandé** — ordre logique en 4 phases (stabilisation UI → base de données → paiement/dashboard → tests & nettoyage), avec le graphe de dépendances en bloc `text`.
5. **Décisions ouvertes** — section listant les questions à trancher (horaires par jour, granularité des avertissements, gestion de l'état `IS_SIMULATOR_PACK_ACTIVE` via context ou edge function).
6. **Rappel du nettoyage final** — suppression des anciens simulateurs `/simulateur` et `/simulation`.

## Note technique

Document en français, format markdown, sans emoji, cohérent avec le style de `docs/simulateur-v2-onboarding.md`. Aucun code applicatif modifié.
