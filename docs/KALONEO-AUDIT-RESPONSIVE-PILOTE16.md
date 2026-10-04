# Audit responsive KALONÉO — PILOTE 16

Date : 2026-10-04

## Constat

Le rendu réel du PILOTE 15 confirme que plusieurs pages avaient été optimisées trop près de l'affichage 1366×768.

Les causes principales relevées dans le code sont :

- plusieurs conteneurs principaux en `height:100vh` alors qu'une barre KALONÉO fixe de 52 px est désormais présente ;
- plusieurs pages ajoutent encore 58 à 60 px de padding inférieur, héritage de l'ancien positionnement des boutons ;
- des `overflow:auto` ont été utilisés pour faire tenir des tableaux ou blocs dans une hauteur artificiellement limitée ;
- certaines zones utilisent des hauteurs minimales fixes importantes ;
- la page de prise en main possède des minimums de colonnes qui totalisent plus que la largeur utile d'un écran 1200 px ;
- les anciens footers de boutons continuent parfois à réserver de la hauteur alors que les actions sont affichées dans la barre commune.

Conséquences observées :
- scrollbar interne inutile sur Conversions ;
- page/colonne Tri décalée lors de l'autoévaluation ;
- scroll global sur certains états ;
- contenu qui peut sortir de l'écran ;
- espace perdu sous les exercices ;
- comportement dépendant de la résolution.

## Règle responsive retenue

KALONÉO ne doit plus utiliser 1366×768 comme dimension imposée.

1366×768 reste uniquement une résolution de référence visuelle.

La zone de travail est calculée à partir de la fenêtre réelle :

`hauteur utile = 100dvh - hauteur barre KALONÉO`

La barre KALONÉO mesure 52 px.

Les proportions fonctionnelles restent exprimées en ratios :
- 50/50 ;
- 60/40 ;
- 40/60.

Les dimensions de composants (boutons, bordures, champs, icônes) peuvent rester en pixels ou rem avec min/max.

Les pages doivent utiliser :
- `min-height:0` dans les conteneurs Flex/Grid ;
- `height:100%` de la zone utile, pas `100vh` lorsqu'elles sont dans le parcours ;
- des tailles adaptatives via media queries/clamp lorsque nécessaire ;
- aucune scrollbar interne si le contenu normal de l'exercice peut tenir à l'écran.

## Résolutions de contrôle obligatoires

- 1366×768 — référence actuelle ;
- 1200×800 — largeur réduite ;
- 1280×720 — hauteur réduite ;
- 1920×1080 — grand écran.

## Adaptations PILOTE 16

- barre KALONÉO plus visible avec dégradé bleu institutionnel ;
- vrai visuel KALONÉO fourni utilisé à gauche ;
- date et heure à droite ;
- Calculatrice déplacée dans la barre lorsqu'elle est autorisée par l'exercice ;
- les anciens boutons déplacés ne réservent plus de hauteur ;
- suppression des cases/boutons vides de la barre ;
- zone de travail réellement réservée au-dessus de la barre ;
- Conversions : suppression de la scrollbar verticale interne artificielle ;
- Tri : autoévaluation contenue dans la même zone sans page longue ;
- Stock : ancienne puce image remplacée par le gros point KALONÉO ;
- Planning : puces image restantes remplacées ;
- NWMail : liste de fichiers sans puces et confirmation « Message envoyé » au style KALONÉO ;
- page finale : Abandonner n'est pas affiché lorsque l'évaluation est terminée.

## Principe anti-régression

Toute nouvelle page KALONÉO doit être vérifiée au minimum aux quatre résolutions ci-dessus avant publication d'un pilote.
