# KALONÉO — Fabrique de pages

## Principe validé

Une page KALONÉO ne doit pas être dessinée et corrigée indépendamment à chaque exercice.

Le système repose sur quatre couches :

1. **Définition de page** : décrit le contenu, les blocs, les outils et la navigation.
2. **Moteur KALONÉO** : transforme cette définition en DOM et branche les comportements.
3. **Thème KALONÉO commun** : impose les couleurs, tailles, espacements et composants.
4. **Générateur** : produit un HTML autonome à partir des trois éléments précédents.

La page générée n'est donc pas une copie HTML écrite à la main.

## Blocs pris en charge dans la première version

- en-tête / identité KALONÉO ;
- formulaire en grille ;
- bloc de prise en main ;
- glisser-déposer ;
- chronomètre ;
- calculatrice ;
- test audio ;
- navigation Suivant.

Ces blocs doivent être réutilisables. Les futurs blocs prévus doivent pouvoir couvrir notamment :

- texte ;
- image ;
- HTML éventuellement accompagné de JavaScript ;
- tableau ;
- exercice/QCM ;
- vidéo ;
- outils activables par la préparation du parcours ;
- Abandonner / Suivant générés par le parcours.

## Typographie KALONÉO candidate

- titre de page : 28 px ;
- titre de section : 22 px ;
- titre de bloc : 18 px ;
- texte principal : 17 px ;
- boutons / labels : 16 px ;
- texte secondaire : 15 px minimum ;
- champs : 17 px ;
- aucun texte fonctionnel candidat sous 15 px.

## Page 1 étalon

La page 1 validée sert d'étalon visuel.

Définition :
`source/kaloneo/definitions/page1-start.js`

Moteur :
`source/kaloneo/kaloneo-page-engine.js`

Thème :
`source/kaloneo/kaloneo-theme.css`

Commande de génération :

`node scripts/kaloneo-build-page.js source/kaloneo/definitions/page1-start.js source/kaloneo/generated/page1-start.generated.html`

## Règle anti-triche / anti-régression

Le fichier `page1-start.generated.html` ne doit jamais être corrigé directement.

Toute correction visuelle ou fonctionnelle doit être faite dans :
- la définition, si elle concerne le contenu ;
- le moteur, si elle concerne le comportement d'un bloc ;
- le thème, si elle concerne le rendu commun.

Puis la page est régénérée.


## Gabarit questionnaire 60/40 — décision validée

Pour les deux premiers tests KALTEST de type questionnaire simple :

- `calculs_commandes_atelier`
- `calculs_poids_volumes`

KALONÉO utilise le gabarit `questions-table-visual` en ratio **60/40** :

- **60 % à gauche** :
  - liste des questions en haut ;
  - tableau de réponses immédiatement en dessous ;
- **40 % à droite** :
  - emplacement réservé à une **image verticale** ;
  - l’image définitive peut être renseignée ultérieurement dans la définition KALTEST ;
- la calculatrice flottante s’ouvre du côté du visuel et ne doit pas masquer les champs de réponse.

Le troisième test `horaires_reception_controle` utilise une variation **40/60** : image verticale à gauche (40 %) et tableau d’horaires + moyennes à droite (60 %). La calculatrice s’ouvre dans la zone visuelle de gauche afin de ne pas masquer les champs de réponse.

Cette règle doit être appliquée par le moteur KALONÉO à partir de la propriété `presentation.kaloneoLayout`, et non par une page HTML spéciale.


### Variation horaires 40/60

Pour `horaires_reception_controle` :

- **40 % à gauche** : image verticale ;
- **60 % à droite** : tableau d’horaires puis moyennes ;
- calculatrice ancrée dans la zone visuelle de gauche lorsqu’elle est ouverte ;
- cette disposition est déclarée par `presentation.kaloneoLayout.type = "visual-schedule"` et `ratio = "40/60"`.


## Gabarit exercice pratique LEGO 50/50

Pour l'exercice `brique` / Construction à base de briques :

- **50 % à gauche** :
  - scénario et tâche ;
  - consignes ;
  - image de référence de l'exercice ;
  - l'autoévaluation remplace ensuite cette zone après validation de l'exercice ;
- **50 % à droite** :
  - chronomètre ;
  - temps enregistré ;
  - nombre d'erreurs ;
  - déblocage administrateur ;
  - bouton de validation.

Le gabarit commun est `css/kaloneo-practical-exercise.css`.
La page réelle conserve les identifiants fonctionnels historiques afin de préserver la sauvegarde et les résultats : `startBtn`, `stopBtn`, `temps`, `nivDiff`, `secretCode`, `validBtn`, `autoEvalPart`, `autoEvalForm`, `autoEvalBtn`.

La page doit être contrôlée dans Electron en 1366×768 au zoom adaptatif réel.
