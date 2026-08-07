# Plan : Ajouter une section "Workflow Lovable ↔ GitHub ↔ Local" dans l'onboarding du simulateur

## Objectif

Compléter `docs/simulateur-v2-onboarding.md` avec une section dédiée au workflow de développement : comment Lovable interagit avec GitHub, quelles sont les différences avec le développement local classique, et quelles bonnes pratiques adopter pour ne pas polluer l'historique `develop` avec des versions de test.

## Livrable

Un seul fichier modifié : `docs/simulateur-v2-onboarding.md`.

Aucun code applicatif n'est touché.

## Emplacement dans le document

Insérer la nouvelle section juste après **"12. Démarrer en local"**.

Conséquence : renumérotation des sections existantes :
- `13. Variables d'environnement` → `14. Variables d'environnement`
- `14. De la maquette Figma au composant React` → `15. De la maquette Figma au composant React`
- `15. Documents projet (Google Drive)` → `16. Documents projet (Google Drive)`
- `16. Guide du contributeur` → `17. Guide du contributeur`
- `17. Dette technique et suite` → `18. Dette technique et suite`

Mise à jour des liens internes et du sommaire si nécessaire.

## Contenu de la nouvelle section : "13. Workflow de développement : Lovable, GitHub et local"

### 13.1 Principe de synchronisation

- Le projet Lovable est connecté à un dépôt GitHub.
- Lovable ne pousse que sur la branche `develop`.
- Chaque prompt en mode **Build** génère un commit automatique sur `develop` avec un message générique.
- La branche `main` est la branche de production ; elle n'est pas modifiée directement par Lovable.

### 13.2 Développement local

- Le dépôt peut être cloné et travaillé en local (voir section 12).
- On peut créer des branches dédiées (`feature/...`, `fix/...`, `chore/...`) pour isoler les travaux.
- Les commits sont rédigés manuellement avec des messages explicites.
- On peut tester et itérer sans impacter le dépôt distant.
- Les changements validés sont intégrés via Pull Request vers `develop`, puis promus vers `main` via le workflow de release.

Référence aux fichiers du projet :
- `.github/backup00/SETUP_README.md`
- `.github/backup00/BRANCH_PROTECTION.yml`

### 13.3 Tableau comparatif Lovable vs local

| Aspect | Lovable (mode Build) | Développement local |
|---|---|---|
| Branche cible | `develop` uniquement | Branches dédiées possibles (`feature/*`, `fix/*`, etc.) |
| Commits | Auto-générés à chaque prompt | Rédaction manuelle, messages clairs |
| Itération rapide | Directe dans l'UI, mais chaque build pousse | Test local sans push, plus de contrôle |
| Risque de versions intermédiaires | Élevé : chaque build peut créer un commit sur `develop` | Faible : on ne pousse que ce qui est validé |
| Retour arrière | Possible via l'historique Lovable (crée un commit de revert sur GitHub) | `git revert`, `git reset`, rebase, etc. |

### 13.4 Recommandations pour un développement efficace

1. **Préparer ses prompts avant de builder**
   - Avoir une idée claire du besoin, des fichiers concernés et du résultat attendu.
   - Éviter les prompts vagues qui génèrent plusieurs itérations de commits.

2. **Toujours passer par le mode Plan d'abord**
   - Demander à Lovable de proposer un plan d'action.
   - Relire le plan, le challenger, le faire modifier si besoin.
   - Pour les fonctionnalités critiques ou complexes, tester le plan en local avant de passer en mode Build.

3. **Connaître les fichiers impactés**
   - Demander explicitement dans le plan la liste des fichiers modifiés.
   - Cela permet de mieux relire le diff après build.

4. **Relire systématiquement après un build Lovable**
   - Vérifier le diff réel dans l'éditeur Lovable ou sur GitHub.
   - Lancer le typecheck et les tests en local.
   - Vérifier le rendu dans le preview Lovable.

5. **Privilégier le local pour les modifications simples**
   - Corrections de style, de texte, d'espacement, petits ajustements : les faire à la main en local.
   - Cela évite de solliciter l'IA pour des micro-changements et de générer des commits inutiles sur `develop`.

6. **Attention au mode Build sur du code de test**
   - Si une version n'est pas destinée à être partagée, ne pas la builder avec Lovable.
   - Préférer les tests en local pour les explorations.

### 13.5 Retour à une version antérieure

- Lovable dispose d'un historique intégré permettant de revenir à une version précédente.
- Cette action génère un nouveau commit sur `develop` (revert).
- Il est donc normal de voir des commits de retour arrière dans l'historique GitHub.

## Vérification

- Relire le document pour s'assurer que la renumérotation est cohérente.
- Vérifier l'absence de liens internes cassés (sections 14 à 18).
- Vérifier que le ton reste professionnel et que le contenu reflète bien les pratiques du projet (branche `develop`, CI, PR, etc.).

## Non inclus dans ce plan

Aucune modification de code, de configuration, de base de données ou de déploiement.
