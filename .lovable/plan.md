# Mise à jour du document d'onboarding du simulateur

Cible unique : `docs/simulateur-v2-onboarding.md`. Aucun code applicatif modifié.

## 1. Statut réel du `/dashboard-simulator`

- Section 8.1 « État actuel » : réécrite pour indiquer explicitement que le dashboard est un **prototype brouillon**, généré par l'IA Lovable à partir des maquettes Figma, destiné à donner un aperçu visuel du dashboard définitif — pas une fonctionnalité livrable (données mock, pas de persistance, pas d'auth, pas d'i18n, thème sombre non traité).
- Ajout d'un encadré d'avertissement en tête de section 8 et d'une mention dans la section 1.2 (périmètre) et 2.2 (routes) pour éviter toute ambiguïté.
- Renvoi explicite vers `docs/simulateur-v2-roadmap.md` pour la liste des chantiers restants sur le dashboard, avec un rappel des lots concernés.
- Ajout du même renvoi dans la section 13 (dette technique) et 13.3 (ressources).

## 2. Nouvelles sections

Insérées avant le « Guide du contributeur », puis renumérotation des sections suivantes.

### Nouvelle section « Démarrer en local »
- Prérequis outillage : Node.js LTS (via nvm), npm (ou bun), Git, VS Code + extensions recommandées (ESLint, Tailwind CSS IntelliSense, TypeScript), accès GitHub au dépôt, accès à l'espace Lovable du projet.
- Procédure : clone du dépôt, installation des dépendances, copie de `.env.example` vers `.env`, lancement du serveur de dev (port 8080), commandes utiles (typecheck, lint, build, `npm audit`).
- Note sur le workflow Git du projet (branche `develop`, PR) tel que décrit dans `.github/`.

### Nouvelle section « Variables d'environnement »
- Explication du double régime : variables `VITE_*` lues côté navigateur au build (publiques, non secrètes) vs secrets backend lus par les Edge Functions via `Deno.env.get()` et configurés dans Lovable Cloud (jamais dans `.env`).
- Tableau des variables nécessaires au dev local (celles de `.env.example` côté Vite), avec ce qu'il faut renseigner et où trouver la valeur.
- Règles : ne jamais committer `.env`, ne jamais mettre de clé secrète (service role, clé Stripe secrète) dans une variable `VITE_`, `.env.example` est la source de vérité à tenir à jour.
- Symptômes classiques d'une config manquante (client backend non initialisé, app blanche).

### Nouvelle section « De la maquette Figma au composant React »
Workflow en 4 étapes, tel que pratiqué sur le projet :
1. Export du design via https://divriots.com/figma.to.code → HTML + Tailwind CSS.
2. Relecture et correction manuelle du HTML pour coller à la maquette validée (espacements, tailles, états).
3. Transmission du HTML à Lovable AI pour générer des composants React conformes à l'architecture du projet (tokens sémantiques, primitives `FormCard`/`Field`, i18n, pas de couleur en dur).
4. Revue du code généré et ajustements finaux pour fidélité à la maquette.
- Checklist de conformité et pièges connus (couleurs codées en dur, chaînes non traduites, composants monolithiques à découper, responsive à revérifier).
- Mention de l'alternative MCP Figma local (app Lovable Desktop) et de son caractère lecture seule.

### Nouvelle section « Documents projet (Google Drive) »
- Tableau de liens à compléter manuellement, avec placeholders `_(lien à ajouter)_` : maquettes Figma, spécifications fonctionnelles, cahier de recette, comptes rendus de réunion, ressources de marque, roadmap produit.
- Note indiquant que l'accès est demandé au responsable projet.

## 3. Cohérence

- Mise à jour du sommaire / de la numérotation des sections après insertion.
- Vérification finale : relecture du document rendu, aucun lien interne cassé.
