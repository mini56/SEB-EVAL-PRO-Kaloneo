# R48 — Builder Restaurant, branche expérimentale

La R47 reste inchangée. Le test `planning_cantine/1.0.0` n'est pas modifié.

## Nouvelle fonction du Builder
- Grille tableau: option « Tableau de mise en page : bordures invisibles ».
- Style de bloc: choix d'une image de fond depuis la bibliothèque, taille et position, visibilité et texte au-dessus.
- Images: conserver les proportions d'origine et les marges habituelles.

## Exemple Restaurant
Le JSON `seb-evalpro/r48-demo/planning-restaurant-builder-r48.json` contient une **copie indépendante** du test: même scénario, consigne, 15 questions, options, réponses et 8 indications. Il n'est pas ajouté au parcours candidat livré.
Il utilise les images originales récupérées depuis `images_tests` et copiées dans `seb-evalpro/source/imageqcm/r48-*.png`. Importer ce JSON via le Builder pour le modifier et ouvrir l'aperçu Electron.

## Critères de validation
Vérifier visuellement 1366 × 768, les 15 sélecteurs (enregistrement, restauration et évaluation), les listes, les 8 indications et les 2 images. Aucun contenu pédagogique n'est ajouté.
