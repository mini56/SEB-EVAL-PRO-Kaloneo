# Intégration TESTS_V1 — pilote isolé

Ce changement ne touche ni au dessin des tableaux ni à la logique candidat.

- Racine GitHub `main/TESTS_V1/<identifiant>.json`.
- Une seule définition KALTEST version `1.0.0` par identifiant, nom de fichier égal au champ `id`.
- Le build des données KALTEST lit la V1 officielle prioritairement.
- La préparation `app/web` remplace uniquement la V1 embarquée correspondante, puis publie le manifeste `TESTS_V1-manifest.json`.
- Au démarrage et à la mise à jour, la bibliothèque utilisateur synchronise la V1 du manifeste officiel même si le fichier exporté par le Builder comporte le drapeau `adminModified`.
- La V1 historique dans le code source n'est pas modifiée. Les autres V1 et les V2/V3 ne le sont pas non plus.
- Les fichiers JSON non valides ou qui ne correspondent pas à une V1 historique font **échouer** la compilation au lieu de produire un Setup douteux.
- Sur GitHub Actions, `build-kaltest-pilot2-data.js` synchronise les références depuis la branche `main`, même si le code de l'application est compilé depuis une branche de développement.
- Les installations déjà publiées ne sont pas changées ; seule une nouvelle compilation raccordée au mécanisme inclura les V1 corrigées.

La fonctionnalité de mot de passe Développeur et l'export du Builder sont un changement distinct ; ne pas diffuser un installateur avant leur validation.
