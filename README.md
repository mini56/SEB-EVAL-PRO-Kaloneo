# SEB EvalPro + Kalonéo

Nouveau dépôt de développement pour la prochaine génération de **SEB EvalPro** et **Kalonéo**.

## Objectif

Ce dépôt est volontairement séparé du dépôt actuellement utilisé en production afin de pouvoir refondre progressivement l'architecture sans mettre en risque la version opérationnelle de SEB EvalPro.

Le socle de migration retenu est **SEB EvalPro 0.3.10 — Build #20**, commit source :

`cd7360f33186a41107b84fdd901724c9acb23ea2`

Le dépôt historique `mini56/SEB-EvalPro` reste indépendant et n'est pas modifié par cette refonte.

## Architecture cible

- `seb-evalpro/` : nouvelle génération de SEB EvalPro, initialisée à partir du Build #20 validé.
- `kaloneo/` : application de création, prévisualisation, validation et export des tests.
- `kaltest-contract/` : contrat commun entre Kalonéo et SEB EvalPro.
- `tests/` : tests de compatibilité, de non-régression et parcours de validation.
- `docs/` : décisions d'architecture et règles fonctionnelles.

## Principe de migration

Les exercices actuels sont migrés **un par un** vers le contrat KALTEST. Chaque exercice doit être validé isolément puis dans un parcours réel avant d'être considéré comme compatible.

Aucune migration ne doit casser la version historique actuellement utilisée.
