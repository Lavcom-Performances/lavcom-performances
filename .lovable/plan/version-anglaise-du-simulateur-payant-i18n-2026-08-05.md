# Version anglaise du simulateur payant (i18n)

## Objectif
Ajouter la traduction anglaise complète du namespace `paid-simulator`, aujourd'hui disponible uniquement en français.

## Ce qui sera fait

1. **Créer `src/locales/en/paid-simulator.json`**
   - Copie fidèle de la structure du fichier FR (mêmes clés, même imbrication, mêmes variables d'interpolation : `{{surface}}`, `{{count}}`, `{{city}}`, `{{postalCode}}`, `{{machineName}}`, `{{category}}`, `{{washerCount}}`, `{{dryerCount}}`).
   - Traduction anglaise naturelle de toutes les sections : `common`, `stepper`, `project`, `machines`, `charges`, `results`, `warnings`, `options`, `validation`.
   - Adaptations locales : "CA" → "Revenue", "m²" conservé, formats d'horaires adaptés (ex. "7am - 9pm (standard)"), jours abrégés en anglais (Mon, Tue, ...), noms de pays en anglais.

2. **Enregistrer le namespace anglais dans `src/lib/i18n-config.ts`**
   - Ajouter l'import `enPaidSimulator` et l'entrée `'paid-simulator': enPaidSimulator` dans les ressources `en`.

3. **Vérification**
   - Contrôle que les clés EN et FR sont strictement identiques (aucune clé manquante ou en trop).
   - Typecheck et rendu des pages `/simulator/*` en anglais.

## Détails techniques
- Aucun composant n'est modifié : ils utilisent déjà `useTranslation("paid-simulator")`.
- Les messages de validation Zod passent par `i18n.t`, donc ils basculeront automatiquement en anglais.
- Changement 100 % additif.
