# KALTEST — contrat commun

Ce dossier contient le contrat versionné entre **Kalonéo** et **SEB EvalPro**.

## Règles principales

- Kalonéo fabrique et valide un paquet de test.
- SEB EvalPro revalide toujours le paquet à l'import.
- Un paquet invalide ou incompatible ne peut jamais entrer dans un parcours.
- Une version déjà utilisée dans une évaluation ne doit pas être modifiée de manière destructive.
- Les identifiants techniques sont stables et indépendants des libellés visibles.

## Métadonnées minimales prévues

Un test doit pouvoir déclarer :

- format KALTEST ;
- version minimale de SEB EvalPro ;
- version de Kalonéo ayant construit le paquet ;
- identifiant stable du test ;
- version du test ;
- titre ;
- catégorie ;
- description ;
- durée ;
- points ;
- type noté ou non noté ;
- compatibilité calculatrice ;
- ressources ;
- capacités de sauvegarde/restauration ;
- données produites ;
- destinations de bilan ;
- validation.

## Données produites

Variables standards prévues :

- `score`
- `scoreMax`
- `pourcentage`
- `temps`
- `tempsMoyen`
- `erreurs`
- `moyenneErreurs`
- `nombreEssais`

Un test peut également déclarer des variables personnalisées, avec identifiant stable et type explicite.

## Bilan

Un test peut contribuer à zéro, une ou plusieurs lignes de bilan.

Pour chaque contribution, le contrat doit permettre de connaître :

- la ligne cible ;
- la ou les variables utilisées ;
- la règle de calcul, si elle appartient au test ;
- le mode manuel ou automatique défini par la ligne ;
- les informations affichables dans les commentaires.

Les seuils et commentaires d'une ligne de bilan appartiennent à la définition de cette ligne et ne sont pas redéfinis par chaque test.

## Contrôle avant export

Kalonéo doit refuser la validation lorsque, par exemple :

- une variable requise par une ligne n'est pas produite ;
- une ressource référencée manque ;
- un identifiant est absent ou dupliqué ;
- le test ne sait pas sauvegarder/restaurer son état ;
- la correction ou le barème requis est incomplet ;
- la destination de bilan n'existe pas ou n'est pas compatible.

## Compatibilité

Le paquet déclare une version minimale de SEB EvalPro.

Dans une même version majeure de SEB EvalPro, les versions mineures et correctives ultérieures doivent préserver la lecture des paquets déjà compatibles.

Les ruptures de contrat nécessitent une nouvelle version majeure du contrat ou du produit concerné.

Les schémas JSON formels seront ajoutés progressivement pendant la migration des premiers tests.
