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
