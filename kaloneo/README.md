# Kalonéo

Application distincte destinée à créer et valider les tests utilisés par SEB EvalPro.

Flux prévu :

**Créer → Prévisualiser → Contrôler → Tester → Valider → Exporter**

Kalonéo devra notamment gérer :

- scénario ;
- consignes ;
- blocs d'exercice ;
- questions simples ;
- tableaux ;
- médias embarqués ;
- exercices complexes ;
- correction et barème ;
- données produites ;
- destinations de bilan ;
- lignes de bilan manuelles ou automatiques ;
- variables dynamiques ;
- validation bloquante avant export.

L'interface et le moteur seront construits progressivement après import du socle SEB EvalPro.


## Prototype Test Builder

Premier prototype : `kaloneo/test-builder.html`.

Objectif : valider l'utilisation d'une page HTML hors ligne pour construire un test sans créer un programme spécifique par exercice.

Fonctions présentes :
- métadonnées du test ;
- Scénario et Consignes ;
- présentation 1 bloc / 50-50 / 40-60 / 60-40 ;
- blocs Texte, HTML, HTML+JS, Image, Audio, Vidéo et Question ;
- calculatrice compatible ;
- chronomètre commun ;
- intervention Admin ;
- autoévaluation ;
- matériel extérieur ;
- aperçu candidat ;
- sauvegarde locale du brouillon ;
- génération d'un `test.json` KALTEST de prototype.

Ce prototype ne remplace pas encore le futur Setup KALONÉO. Il sert d'abord à valider l'ergonomie et le modèle de génération.
