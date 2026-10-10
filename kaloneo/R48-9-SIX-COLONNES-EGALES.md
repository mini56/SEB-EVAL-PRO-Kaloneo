# R48.9 — Restaurant : six colonnes strictement identiques

Décision explicite : dans le tableau Restaurant, « Planning », « Lundi », « Mardi », « Mercredi », « Jeudi » et « Vendredi » ont **toutes exactement la même largeur**.

- Calcul automatique uniquement si les six colonnes ont les réglages de largeur vides, comme dans la capture Builder.
- Chaque colonne = 1/6 de la largeur utile. Aucune règle spéciale 12 % / 88 %.
- Les menus sont contenus dans leurs cellules. Vendredi ne doit pas être coupé, et aucune barre horizontale ne doit être nécessaire.
- Dès qu'une largeur est saisie par le créateur, la largeur manuelle du Builder prime.
- Correction volontairement restreinte à `planning_cantine_r48_demo` : aucun autre test, notamment le Restaurant V1, ne change de géométrie.

Le moteur commun du candidat, la miniature fidèle R48.6, et le bouton de fermeture de R48.7 sont conservés. Aucune modification des questions, des réponses, des barèmes ou des images.

Le smoke Electron réel teste les six en-têtes de largeur identique, la colonne Vendredi entièrement visible, les 15 listes déroulantes et l'absence de scrollbar horizontale, en plus des contrôles de fermeture et de non-sauvegarde.
