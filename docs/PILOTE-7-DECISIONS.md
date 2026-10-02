# SEB EvalPro KALONÉO — décisions PILOTE 7

Date : 2 octobre 2026

Ce fichier fige les décisions validées pendant le test réel du PILOTE 6 afin d'éviter leur régression.

## Socle conservé

- Le PILOTE 7 repart du tag `seb-kaloneo-pilot-006`.
- La barre Administrateur validée au PILOTE 6 reste la référence : état verrouillé, boutons 15 px, hauteur 36 px dans une barre 44 px, bulles d'aide, `Lister les candidats`, `Tests / Parcours`, `Afficher l’écran d’accueil`, `Quitter`, et `Fermer la session active` uniquement lorsqu'un vrai candidat est actif.
- Les deux boutons `Fermer` du Bilan et leur sauvegarde restent inchangés.
- Le design KALONÉO existant reste la référence pour boutons, calculatrice, chronomètre, audio, couleurs et typographies.
- Les exercices KALTEST, leurs corrections, leurs barèmes et leur pont vers les Résultats/Bilan ne sont pas modifiés par ce lot.

## Quitter / session active

- `Quitter` doit consulter l'état réel de `candidate:active`.
- Sans candidat réellement actif : le dialogue indique simplement qu'aucun parcours candidat n'est en cours et que SEB EvalPro va se fermer.
- Sans candidat actif, `Quitter` ne sauvegarde pas artificiellement la page d'identification comme nouveau parcours.
- Avec un candidat actif : `Quitter` sauvegarde le parcours et le laisse `EN_COURS` pour reprise au prochain démarrage.
- `Fermer la session active` reste distinct de `Quitter` et n'est visible que pour un parcours réellement actif.

## Première page candidat

- Les 8 champs restent présents : Nom, Prénom, Date de naissance, 7 premiers chiffres du n° de sécurité sociale, Ville, Groupe, Date de l'évaluation, Parcours.
- Les champs sont présentés en deux colonnes et leur largeur est réduite par rapport au PILOTE 6.
- La prise en main placée sous l'identité n'est jamais notée et n'entre dans aucun score ni bilan.
- Elle ne bloque pas le bouton `Suivant`.

### Test souris

- Déplacer une maison dans l'emplacement libre entre deux maisons.
- Déplacer une voiture sur une place de parking.
- Les objets reviennent à leur position de départ en cas de dépôt hors cible.
- Les zones correctes valident visuellement `Maison bien placée` et `Voiture bien placée`.

### Test chronomètre

- Modèle à deux boutons conforme au modèle déjà validé : `Démarrer le chronomètre` puis `Arrêter le chronomètre`.
- Affichage numérique `00:00`.
- Style KALONÉO, vert pour démarrer et orange pour arrêter.

### Test calculatrice

- Bouton `Ouvrir` dans le style KALONÉO orange.
- La calculatrice elle-même conserve exactement le composant flottant déjà validé.
- Sur la page d'identification, elle s'ouvre dans une zone réservée à droite.
- Sur la page Introduction et les exercices, elle s'ouvre à l'extrême droite afin de ne pas masquer les consignes.

### Test audio

- Bouton `Écouter le son` dans le style KALONÉO.
- Son local généré hors ligne.
- Confirmation manuelle `Son entendu`.
- Aucun score.

## Page Introduction

- La calculatrice ne doit plus recouvrir le texte.
- L'image de couverture est centrée verticalement dans l'espace libre entre les blocs de texte haut et bas.
- Le contenu et les textes fonctionnels existants sont conservés.
