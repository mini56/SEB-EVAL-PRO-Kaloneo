# Architecture cible — SEB EvalPro + Kalonéo

Statut : décisions fonctionnelles verrouillées avant migration.

## 1. Séparation des produits

Deux programmes Windows distincts :

- **SEB EvalPro** : exécution des parcours candidats, sauvegarde, Replay, résultats, bilan, import/export.
- **Kalonéo** : création, prévisualisation, contrôle, validation et export des tests et des définitions de bilan.

Ils partagent uniquement un contrat commun versionné : **KALTEST**.

## 2. Parcours candidat

Ordre système :

1. Page 1 — Identification candidat.
2. Page 2 — Introduction SEB EvalPro existante.
3. Pages suivantes — tests choisis par l'Administrateur.
4. Dernière page — page finale système existante.

Les pages système ne sont pas créées dans Kalonéo.

Une évaluation possède un parcours figé dès son démarrage. Une modification ultérieure du modèle de parcours ne modifie jamais une évaluation déjà commencée.

## 3. Identité

Champs obligatoires :

- Nom
- Prénom
- Date de naissance
- 6 premiers chiffres du numéro de sécurité sociale
- Lieu
- Groupe
- Date de l'évaluation
- Parcours choisi, affiché en lecture seule

La personne possède un identifiant technique aléatoire permanent `personId`.
Chaque évaluation possède son propre `evaluationId`.

## 4. Parcours dynamiques

L'Administrateur construit un parcours à partir du catalogue des versions de tests validées.

Un parcours exportable doit conserver :

- nom du parcours ;
- ordre exact des tests ;
- version exacte de chaque test ;
- paramètres propres au test ;
- disponibilité de la calculatrice ;
- paramètres de présentation ;
- durées et points ;
- copies exactes des paquets de tests nécessaires ;
- empreintes d'intégrité.

Extension prévue : `.kalparcours`.

## 5. Versionnement des tests

Les anciennes versions validées et compatibles restent utilisables.

Exemple :

- 1.0 — validée — utilisable
- 1.1 — validée — utilisable
- 1.2 — validée — utilisable

Une évaluation figée conserve toujours la version exacte utilisée.

## 6. Bilan dynamique

Hiérarchie :

**Grande section → Sous-section / Module → Famille ou capacité générale facultative → Ligne de compétence**

Une ligne possède notamment :

- identifiant stable ;
- libellé ;
- mode de remplissage `manual` ou `automatic` ;
- commentaires I / II / III / NE ;
- règle de calcul si automatique ;
- variables dynamiques qu'elle sait afficher.

Un même test peut alimenter plusieurs lignes de bilan.

### Remplissage automatique

La ligne reçoit une ou plusieurs données produites par le test et applique ses règles.

Seuils par défaut SEB EvalPro pour une ligne exprimée en pourcentage :

- I : 70 à 100 %
- II : 45 à 69,99 %
- III : 0 à 44,99 %

Une ligne personnalisée peut définir d'autres seuils, à condition qu'ils soient valides et sans chevauchement.

### Remplissage manuel

Aucun niveau n'est calculé automatiquement. L'Administrateur sélectionne NE, I, II ou III dans le bilan.

Des mesures peuvent malgré tout être affichées comme aide à la décision.

## 7. Variables dynamiques

Les définitions de bilan peuvent insérer des valeurs à l'endroit choisi par l'Administrateur, par exemple :

- score ;
- score maximum ;
- pourcentage ;
- temps ;
- temps moyen ;
- erreurs ;
- moyenne des erreurs ;
- nombre d'essais ;
- données personnalisées déclarées et typées par le test.

Kalonéo ne propose que les variables effectivement produites par le test concerné.

## 8. Exercices complexes

Le fonctionnement interne d'un exercice reste libre, mais il doit respecter un petit contrat commun.

Capacités minimales :

1. démarrer ;
2. sauvegarder son état ;
3. restaurer son état ;
4. fournir ses résultats et mesures ;
5. signaler sa fin.

La navigation, le Replay, l'abandon, la session, la page suivante et la page finale sont pilotés par SEB EvalPro, pas par l'exercice.

Un exercice peut déclarer des sorties standards ou personnalisées.

## 9. Abandon et NE

Lors d'un abandon validé par l'Administrateur, la fenêtre comporte :

`☐ Exercice non évalué dans le bilan`

Deux cas uniquement :

- **case non cochée** : les points déjà obtenus sont conservés, le barème complet reste au dénominateur et l'exercice entre dans les calculs ;
- **case cochée** : toutes les contributions de cet exercice sont exclues des calculs du bilan et l'exercice est considéré NE.

Le Replay et l'historique restent toujours conservés.

Si une ligne reçoit plusieurs exercices, elle n'est NE que s'il ne reste aucune contribution évaluée.

Lorsqu'une ligne est NE, l'Administrateur conserve la possibilité de saisir librement une explication dans la colonne Commentaires.

## 10. Sessions

Comportement à préserver du socle validé :

- **Quitter SEB EvalPro** : sauvegarde et reprise ultérieure exactement au même endroit.
- **Fermer la session active** : sauvegarde puis clôture définitive de l'évaluation, même avant la page finale.
- arrivée normale sur la page finale : clôture définitive.

Aucun bilan ne doit être généré pendant un parcours candidat actif.

## 11. Migration

Le socle historique importé dans `seb-evalpro/` est une référence de départ, pas l'architecture finale.

Chaque exercice actuel doit ensuite être :

1. identifié ;
2. adapté au contrat KALTEST ;
3. testé isolément ;
4. importé par la nouvelle chaîne Kalonéo → SEB EvalPro ;
5. testé dans un parcours ;
6. déclaré validé seulement après succès.
