# PILOTE #2 — constat du test réel utilisateur

Date : 1er octobre 2026

Statut : **CONSTAT UTILISATEUR — À REPRODUIRE / CORRIGER**

Ce document consigne les observations faites pendant le premier test réel du Setup
`SEB-EvalPro-Kaloneo-PILOTE-2-0.0.2-Windows-Setup.exe`.

Important : le PILOTE #2 ne contient qu'une partie du parcours Build #20. Certaines remarques peuvent donc relever d'un contenu non encore migré. Elles restent néanmoins conservées ici pour contrôle de fidélité.

## 1. Barre Administrateur

Constat :
- les boutons de la barre Administrateur sont plus hauts que la barre elle-même ;
- ils restent visibles pendant tout le parcours candidat ;
- la barre a perdu le délai d'environ **1 seconde** avant de se replier ;
- elle se ferme donc trop rapidement et devient difficile à manœuvrer lorsque l'utilisateur déplace la souris vers un bouton.

Référence attendue :
- reprendre le comportement et les proportions visuelles du Build #20 ;
- rétablir le délai de fermeture d'environ **1 seconde** après la sortie de la zone active ;
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


## 8. Exemples de réponses affichés dans Réception / Contrôle

Constat :
- dans l'exercice Réception / Contrôle, des exemples sont affichés dans les zones de réponse ;
- ces exemples n'ont pas lieu d'être dans le test réel et peuvent guider inutilement le candidat.

Référence attendue :
- conserver uniquement les champs de réponse prévus dans le Build #20 ;
- ne pas afficher d'exemples de réponses lorsqu'ils n'étaient pas présents dans la référence.

Statut : **écart fonctionnel / à corriger**.

## 9. Calculatrice non fermée au changement de page

Constat :
- lorsqu'elle est ouverte, la calculatrice reste visible après le passage à la page suivante.

Référence attendue :
- la calculatrice est un outil de la page courante ;
- au changement d'étape, elle doit être refermée / réinitialisée visuellement ;
- sa présence sur la page suivante ne doit dépendre que du réglage Calculatrice de cette nouvelle étape.

Statut : **régression fonctionnelle / à corriger**.

## 10. Résultats de pages / scores non retrouvés

Constat utilisateur confirmé lors d'un second parcours :
- les pages sont parcourues mais leurs scores / résultats ne sont pas retrouvés comme attendu dans les résultats enregistrés ;
- le Bilan automatique reste vide malgré le parcours terminé.

Conséquence :
- le problème du Bilan vide ne doit pas être traité comme un simple défaut d'affichage tant que la chaîne complète KALTEST → résultats persistés → Bilan n'a pas été vérifiée.

Statut : **bloquant fonctionnel / priorité haute**.

## 11. Page finale Build #20 manquante

Constat :
- la page finale du Build #20 avec le message de fin de parcours (« Félicitations… » et contenu associé) n'est pas reproduite ;
- le candidat n'a donc pas le même signal clair de fin normale de parcours.

Référence attendue :
- reprendre la page finale Build #20 dans le parcours KALONÉO ;
- cette page doit en même temps déclencher la clôture normale du parcours selon les règles déjà validées.

Statut : **écart de fidélité + cycle de vie / à corriger**.

## 12. Confirmation visuelle par capture — page Identification

Capture utilisateur : `Capture d’écran (35).png`.

Constats visibles :
- les boutons de la barre Administrateur sont coupés par le bord supérieur de la fenêtre ;
- seule leur partie basse apparaît, ce qui confirme un mauvais positionnement / dimensionnement de la barre ;
- la zone principale d'identification n'utilise qu'une faible partie de la hauteur disponible ;
- une très grande zone vide reste sous le formulaire ;
- le bouton « Afficher l'écran d'accueil » apparaît isolé en bas à droite ;
- l'ensemble confirme que la composition verticale du PILOTE #2 n'exploite pas correctement la surface d'écran disponible.

Statut : **confirmation visuelle des régressions de barre et de mise en page**.

## 13. Second parcours réel — portée du constat

Le second parcours utilisateur confirme :
- Replay limité à une seule image ;
- Bilan automatique vide ;
- absence / non-récupération des scores et résultats de pages attendus ;
- calculatrice persistante au changement de page ;
- page finale Build #20 absente ;
- exemples indésirables dans Réception / Contrôle.

Ces observations restent consignées comme **constats de test réel**. Les exercices non présents dans le PILOTE #2 ne doivent pas être jugés sur cette base.
