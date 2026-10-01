# PILOTE #2 — constat du test réel utilisateur

Date : 1er octobre 2026

Statut : **CONSTAT UTILISATEUR — À REPRODUIRE / CORRIGER**

Ce document consigne les observations faites pendant le premier test réel du Setup
`SEB-EvalPro-Kaloneo-PILOTE-2-0.0.2-Windows-Setup.exe`.

Important : le PILOTE #2 ne contient qu'une partie du parcours Build #20. Certaines remarques peuvent donc relever d'un contenu non encore migré. Elles restent néanmoins conservées ici pour contrôle de fidélité.

## 1. Barre Administrateur

Constat :
- les boutons de la barre Administrateur sont plus hauts que la barre elle-même ;
- ils restent visibles pendant tout le parcours candidat.

Référence attendue :
- reprendre le comportement et les proportions visuelles du Build #20 ;
- la barre ne doit pas réduire inutilement la surface candidate.

Statut : **régression probable / à corriger**.

## 2. Surface utile des tests / lisibilité

Constat :
- les tests n'occupent pas toute la surface disponible de la page ;
- la surface réservée aux réponses est donc réduite ;
- la taille de police devient parfois trop faible ;
- certains exercices deviennent difficiles à lire.

Référence attendue :
- Build #20 ;
- utilisation maximale de la surface candidat disponible ;
- pas de réduction artificielle de la zone d'exercice ;
- pas de dégradation de lisibilité.

Statut : **régression importante / à corriger**.

## 3. Bilan vide malgré résultats enregistrés

Constat :
- des résultats sont enregistrés pendant le parcours ;
- après le parcours, le Bilan n'affiche rien.

Référence attendue :
- les résultats KALTEST doivent alimenter correctement les lignes / données de Bilan prévues.

Statut : **bloquant fonctionnel / à reproduire et corriger**.

## 4. Première page — explications Calculatrice manquantes

Constat :
- la première page ne reprend pas les explications d'utilisation de la calculatrice présentes dans le Build #20.

Référence attendue :
- conserver les explications et indications déjà validées dans le Build #20 lorsqu'elles font partie du parcours de référence.

Statut : **écart de fidélité / à rétablir**.

## 5. Fin de parcours non finalisée automatiquement

Constat :
- le candidat arrive au terme du parcours ;
- le parcours reste néanmoins dans un état qui oblige à ouvrir la barre Administrateur ;
- il faut utiliser le bouton Administrateur pour terminer réellement le parcours.

Référence attendue :
- l'arrivée normale sur la page finale doit clôturer le parcours automatiquement selon les règles déjà validées ;
- l'action Administrateur "Fermer la session active" ne doit servir qu'à terminer volontairement un parcours avant sa fin normale.

Statut : **bloquant de cycle de vie / à corriger**.

## 6. Replay incomplet

Constat :
- le Replay ne contient qu'une seule image du parcours.

Référence attendue :
- le Replay doit refléter les pages réellement parcourues et conserver suffisamment de traces pour reproduire le déroulement effectif du parcours.

Statut : **régression importante / à reproduire et corriger**.

## 7. Genre / Nombre — présentation modifiée

Constat :
- le test Singulier / Pluriel / Masculin / Féminin n'est plus présenté sous la forme de deux tableaux ;
- il est présenté comme une question par ligne.

Référence attendue :
- la migration KALTEST doit préserver le rendu et l'ergonomie du Build #20, pas seulement les réponses et le barème ;
- reprendre la structure en deux tableaux si c'est bien la référence Build #20 à conserver.

Statut : **écart de fidélité visuelle / à corriger lors de la migration complète**.

## Synthèse

Ce premier test réel montre que le moteur PILOTE #2 fonctionne suffisamment pour être testé, mais qu'il ne reproduit pas encore fidèlement le Build #20 sur plusieurs points essentiels.

Priorités de correction avant un nouveau test réel :
1. Bilan vide ;
2. fin normale du parcours ;
3. Replay incomplet ;
4. occupation complète de la page et lisibilité ;
5. barre Administrateur ;
6. restitution des éléments de la page d'introduction, notamment la calculatrice ;
7. fidélité de présentation des exercices migrés, notamment Genre / Nombre.

Aucune de ces remarques ne doit être interprétée comme une remise en cause du principe KALTEST lui-même tant que les causes exactes n'ont pas été reproduites et isolées.
