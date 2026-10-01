# KALONÉO — Registre des décisions validées

> **Statut : document de référence fonctionnelle et technique**
>
> Toute évolution de KALONÉO / KALTEST doit être vérifiée contre ce registre.
> Une décision marquée **VALIDÉE** ne doit pas être modifiée, supprimée ou contournée sans une nouvelle décision explicite.
> Lorsqu’une décision évolue, l’ancienne entrée reste traçable et reçoit le statut **REMPLACÉE** avec la référence de la nouvelle décision.

Dernière mise à jour : **1er octobre 2026 — récupération étendue de la discussion précédente**

---

## 1. Références du projet

**Statut : VALIDÉ**

- Dépôt KALONÉO : `mini56/SEB-EVAL-PRO-Kaloneo`.
- Dépôt de production SEB EvalPro : `mini56/SEB-EvalPro`.
- Le dépôt de production reste indépendant et ne doit pas être modifié par les travaux KALONÉO en cours.
- Branche de développement KALONÉO V2 : `dev-kaloneo-v2`.
- PR de travail : **#1**, conservée en **Draft** tant que le PILOTE #2 n’est pas validé pour un test réel.
- Aucun travail de cette branche ne doit être fusionné dans `main` avant validation explicite.
- Le socle de migration de référence est **SEB EvalPro 0.3.10 — Build #20**.

---

## 2. Principe anti-régression

**Statut : VALIDÉ**

Les évolutions KALONÉO / SEB EvalPro doivent être **additives et non destructives**.

Une mise à jour ne doit jamais supprimer, réinitialiser ni écraser :

- les candidats ;
- les évaluations ;
- les historiques ;
- les Replay ;
- les bilans ;
- les parcours existants ;
- les tests existants ;
- les versions historiques encore utilisées.

Les contenus prédéfinis fournis par une mise à jour sont ajoutés uniquement s’ils sont absents.

Une version existante n’est jamais écrasée silencieusement.

Si un test possède le même **identifiant + version** mais un contenu différent, il s’agit d’un **conflit** qui doit être signalé et refusé jusqu’à décision explicite.

---

## 3. Compatibilité KALONÉO → SEB EvalPro

**Statut : VALIDÉ**

Tout test produit par KALONÉO doit pouvoir être reproduit fidèlement par SEB EvalPro.

Chaque paquet KALTEST déclare au minimum :

- la version du format KALTEST ;
- la version du builder KALONÉO ;
- la version minimale de SEB EvalPro ;
- la liste des fonctions requises ;
- l’identifiant du test ;
- la version du test.

SEB EvalPro doit refuser **avant installation ou exécution** un paquet demandant :

- une version de format non reconnue ;
- une version minimale de SEB EvalPro supérieure à la version installée ;
- une fonction inconnue ou non prise en charge.

Un parcours ne doit pas démarrer si un seul de ses éléments n’est pas intégralement compatible.

Les anciens tests KALTEST validés doivent rester lisibles par les versions plus récentes de SEB EvalPro.

---

## 4. CI commune KALONÉO / SEB EvalPro

**Statut : VALIDÉ**

À chaque évolution de KALONÉO, la CI doit vérifier que la version courante de SEB EvalPro sait toujours lire et reproduire ce que KALONÉO peut produire.

Règles :

- les anciennes fixtures KALTEST restent présentes dans la CI pour vérifier la compatibilité historique ;
- si SEB EvalPro n’a pas besoin d’être modifié, son numéro de version ne change pas ;
- si une nouvelle fonction KALONÉO nécessite une adaptation de SEB EvalPro, la publication est bloquée jusqu’à adaptation ;
- une fonction inconnue ne doit jamais être acceptée silencieusement.

---

## 5. Charte visuelle commune SEB EvalPro / KALONÉO

**Statut : VALIDÉ**

SEB EvalPro et KALONÉO utilisent la même charte visuelle et les mêmes règles de rendu.

Une page ne doit pas recréer localement un style lorsqu’un composant commun existe déjà.

### Typographie

- texte courant, champs, tableaux et boutons : **Calibri** ;
- grands titres et titres de section : **Calibri Light** ;
- secours : Segoe UI, Arial, sans-serif.

### Fond général

Fond en dégradé clair de `#ffffff` vers `#ebeef5`.

### Palette institutionnelle principale

Bleu :

- 100 % : `#004E70`
- 80 % : `#356787`
- 65 % : `#5D7E9B`
- 50 % : `#8398B0`
- 25 % : `#C1C9D6`

Orange :

- 100 % : `#F9B233`
- 80 % : `#FBC263`
- 65 % : `#FDCE84`
- 50 % : `#FED9A2`
- 25 % : `#FFECD2`

Références complémentaires :

- vert : `#198754`
- rouge : `#C62828`

Les logos, images, illustrations et icônes ne sont pas limités à cette palette.

---

## 6. Boutons Crystal

**Statut : VALIDÉ**

Tous les boutons utilisent la même géométrie et le même rendu Crystal.

La couleur indique le rôle :

- **rouge** : risque, abandon, suppression, effacement, annulation, fermeture, sortie ;
- **vert** : navigation, Suivant, Précédent, Continuer, Commencer l’évaluation, Terminer le parcours ;
- **orange** : calculatrice ;
- **bleu** : autres actions fonctionnelles.

Cette règle vaut aussi pour la barre Administrateur et pour KALONÉO.

---

## 7. Blocs de mise en page

**Statut : VALIDÉ**

Mises en page autorisées :

- pleine largeur ;
- 50/50 ;
- 40/60 ;
- 60/40 ;
- orientation horizontale ou verticale selon le modèle.

Un bloc principal peut contenir **un seul niveau de sous-blocs**.

Un sous-bloc ne peut pas contenir lui-même un autre sous-bloc.

Un sous-bloc ne doit jamais agrandir son parent.

---

## 8. Images dans les blocs

**Statut : VALIDÉ**

Règles non contournables :

- le bloc ne change pas de taille à cause de l’image ;
- le texte conserve son espace et sa lisibilité ;
- l’image utilise seulement l’espace disponible ;
- une image qui tient à sa taille réelle n’est pas redimensionnée ;
- une image n’est jamais agrandie au-delà de sa taille réelle ;
- si nécessaire, elle est réduite proportionnellement ;
- aucun étirement ;
- aucun écrasement ;
- aucun recadrage automatique ;
- le ratio largeur/hauteur est toujours conservé.

Si l’image devient trop petite pour rester exploitable, KALONÉO bloque la validation.

Si le texte seul déborde de son bloc, KALONÉO bloque également la validation.

---

## 9. Médias

**Statut : PARTIELLEMENT VALIDÉ — principe et lecteurs validés, valeurs techniques exactes à confirmer**

Décisions explicitement validées :

- KALONÉO ne doit valider aucun média qu’une version compatible de SEB EvalPro ne sait pas reproduire fidèlement ;
- le fonctionnement candidat doit rester entièrement **hors ligne** ;
- les ressources nécessaires au test doivent être intégrées au paquet autonome et ne doivent pas dépendre d’une URL Internet ou d’un chemin externe ;
- les médias ne doivent pas être déformés ni provoquer de débordement du rendu ;
- Image, Audio et Vidéo font partie des types de contenu acceptés par le Builder ;
- le **lecteur audio de la Dictée du Build #20** est la référence fonctionnelle retenue pour l’audio intégré aux pages de test ;
- la vidéo intégrée suit le **même principe de lecteur commun**, adapté au support vidéo ;
- KALONÉO n’accepte que des médias réellement lisibles par le lecteur retenu de façon compatible sous **Windows et Linux** ; un média non compatible avec les deux plateformes doit être rejeté avant utilisation.

Règle anti-duplication :

- un exercice ne doit pas embarquer son propre lecteur audio/vidéo concurrent lorsqu’un composant commun existe ;
- le lecteur commun reste fourni par l’hôte KALONÉO / SEB EvalPro.

Éléments techniques encore **À CONFIRMER** :

- la liste exacte des commandes visibles du lecteur commun lorsqu’il est utilisé hors Dictée ;
- les formats/codecs exacts autorisés (ex. WebM VP8/VP9, Opus/Vorbis, MP3, WAV PCM, OGG, FLAC) ;
- le contrôle du conteneur et du codec réel au-delà de l’extension ;
- avertissement à **250 Mo** ;
- maximum **500 Mo** par média ;
- maximum **1 Go** par paquet complet.

Ces valeurs techniques restent conservées comme pistes de conception mais ne doivent pas être présentées comme décisions définitives tant qu’elles n’ont pas été explicitement validées ou confirmées par le contrat final.

---

## 10. Transitions

**Statut : VALIDÉ POUR LE FONCTIONNEMENT GÉNÉRAL — détails de reprise média à confirmer**

Décisions validées :

- l’Administrateur peut placer une **page de transition** où il le souhaite entre deux tests ;
- la transition fait partie de l’**ordre du parcours** ;
- les deux modes **manuel** et **automatique** sont prévus ;
- le mode automatique est notamment utilisé pour une transition vidéo ;
- lorsqu’une transition vidéo automatique suit un test, elle démarre après l’action **Suivant** du candidat ;
- elle ne présente **aucun bouton candidat** ;
- à la fin de la vidéo, la transition se masque et le **test suivant** est affiché automatiquement ;
- plus généralement, une transition automatique démarre automatiquement et passe à l’élément suivant sans intervention du candidat.

### Erreur ou média bloqué

- le candidat ne peut pas contourner seul l’erreur ;
- il avertit le moniteur / Administrateur ;
- le secours Administrateur utilise le code `SVG56`, insensible à la casse ;
- il permet de réessayer le média ou de passer à la page suivante ;
- un contournement doit être enregistré avec sa date/heure dans l’historique / Replay.

Éléments encore **À CONFIRMER** :

- la règle exacte de reprise d’une transition automatique après interruption (reprendre à la position courante ou redémarrer depuis le début) ;
- les détails de conservation interne de la position du média lorsque le parcours est quitté puis repris.

Le caractère noté/non noté et l’impact éventuel sur Résultats/Bilan doivent rester cohérents avec la définition du type `transition` dans le contrat KALTEST et ne doivent pas être inventés par chaque média.

---

## 11. Import / export des tests et parcours

**Statut : VALIDÉ**

SEB EvalPro peut importer en lot les tests depuis :

- un dossier ;
- un disque ;
- une clé USB.

Cette importation ne demande pas de mot de passe.

Les parcours peuvent également être exportés et importés en lot.

Un parcours exporté doit être autonome et embarquer les versions exactes des tests et ressources nécessaires.

---

## 12. Construction d’un exercice dans KALONÉO

**Statut : DÉCISION DE CONCEPTION VALIDÉE — prototype à poursuivre**

Le bloc **Exercice** doit pouvoir accepter notamment :

- un bloc HTML ;
- éventuellement le fichier JavaScript associé ;
- un bloc de texte ;
- une image ;
- les autres types de contenu prévus par le contrat KALTEST.

Le principe retenu est d’éviter de développer un programme spécifique pour chaque page de test.

Une page HTML de construction/génération peut produire la page de test et son script lorsque nécessaire.

Ce choix doit rester compatible avec le contrat KALTEST et avec le rendu SEB EvalPro.

---

## 13. Calculatrice

**Statut : DÉCISION DE CONCEPTION VALIDÉE**

L’activation de la calculatrice se décide lors de la préparation du parcours / du test.

- Si la case **Calculatrice** est activée, le bouton Calculatrice est disponible sur la page.
- Si elle n’est pas activée, le bouton est simplement invisible.
- Il ne doit pas exister plusieurs implémentations concurrentes de la calculatrice.

La calculatrice commune reste un composant hôte partagé.

---

## 14. Chronomètre

**Statut : DÉCISION DE CONCEPTION VALIDÉE**

Le besoin d’un chronomètre est déclaré au niveau du bloc d’exercice.

Tous les exercices qui utilisent un chronomètre doivent s’appuyer sur **un modèle de code commun**, et non sur des chronomètres différents copiés dans chaque page.

---

## 15. Navigation générée avec le parcours

**Statut : DÉCISION DE CONCEPTION VALIDÉE**

Les boutons de navigation ne doivent pas être recodés arbitrairement dans chaque exercice.

Lors de la préparation du parcours, le système doit générer/raccorder les commandes nécessaires afin de garantir la destination correcte :

- **Suivant** ;
- **Abandonné** lorsque l’exercice permet l’abandon.

La navigation doit utiliser la définition réelle du parcours afin d’éviter les erreurs de page suivante.

---

## 16. Abandon d’un exercice

**Statut : DÉCISION DE CONCEPTION VALIDÉE**

La page d’abandon doit utiliser **un seul modèle commun**, basé sur le fonctionnement déjà validé dans SEB EvalPro.

Les exercices ne doivent pas créer chacun leur propre version de la page d’abandon.

---

## 17. Migrations KALTEST actuellement enregistrées

**Statut : VALIDÉ AU NIVEAU CONTRAT / FIXTURE**

Les étapes suivantes du parcours Build #20 possèdent actuellement une fixture KALTEST contractuelle :

1. `qcm-2` → `calculs_commandes_atelier`
2. `qcm-2_1` → `calculs_poids_volumes`
3. `qcm-3` → `horaires_reception_controle`
4. `qcm-texte-trous` → `texte_a_trous_stage_logistique`
5. `qcm-6` → `conversions_atelier_expedition`
6. `genrenombres` → `genre_nombre`
7. `paronymes` → `paronymes_rapport`

La garde de migration suit **24/24 étapes** du parcours de référence et doit continuer à signaler toute étape inconnue, manquante ou dupliquée.

Les migrations suivantes ne doivent être considérées comme terminées fonctionnellement que lorsque leurs tests réels correspondants sont validés.

---

## 18. PILOTE #2

**Statut au 1er octobre 2026 : EN TEST**

Référence de branche : `dev-kaloneo-v2`.

PR : **#1**.

État connu avant création de ce registre :

- vérification du socle Build #20 : **SUCCESS** ;
- contrat KALTEST : **SUCCESS** ;
- garde de migration : **SUCCESS** ;
- `KALTEST Pilot 2` : pas encore déclaré VERT.

Le premier échec du smoke Electron du PILOTE #2 provenait d’une erreur de syntaxe dans le **script de test** : problème de guillemets dans le sélecteur d’un champ de réponse.

Le moteur KALTEST et les migrations n’étaient pas à l’origine de cet échec.

Correction poussée :

`e8bbcd05b2e4260f4ff4cab80c1c0376982d266a`

Règle de validation :

> **Le PILOTE #2 ne doit être déclaré VERT qu’après un run GitHub réel terminé en SUCCESS, incluant le smoke test Electron.**

---

## 19. Séparation KALONÉO / SEB EvalPro

**Statut : VALIDÉ**

Les deux programmes ont des rôles distincts :

- **KALONÉO** construit, prépare, valide et exporte les tests / transitions au format KALTEST ;
- **SEB EvalPro** reste le programme d’exécution des parcours candidats et doit reproduire fidèlement les contenus validés par KALONÉO ;
- le contrat `.kaltest` constitue l’interface commune entre les deux programmes ;
- le fonctionnement candidat reste **hors ligne** ;
- KALONÉO ne doit pas valider une fonction que SEB EvalPro ne sait pas exécuter ;
- KALONÉO et SEB EvalPro restent distribués comme **deux Setup distincts** ;
- un même run de CI peut produire les deux Setup séparément, sans fusionner les deux applications.

Cette séparation ne doit pas conduire à dupliquer plusieurs moteurs de rendu incompatibles : le contrat KALTEST et les contrôles de compatibilité restent la référence commune.

---

## 20. Structure minimale d’une page de test générée

**Statut : VALIDÉ**

Dans la construction des pages de test :

- le bloc **Scénario** est obligatoire ;
- le bloc **Consignes** est obligatoire ;
- ces deux blocs sont présentés en pleine largeur selon les modèles validés ;
- les icônes institutionnelles prévues pour ces blocs sont fournies par KALONÉO et doivent être utilisées de façon cohérente ;
- ces éléments d’en-tête ne doivent pas être réinventés différemment dans chaque exercice ;
- le bloc **Exercice** vient ensuite et reçoit le contenu spécifique du test ;
- les commandes communes comme Calculatrice, Chronomètre, Suivant et Abandonner sont pilotées par la définition du test / du parcours et les composants communs déjà validés.

### Icône Scénario validée

L’icône **Scénario** retenue est :

- personnage + ordinateur + engrenage ;
- fond transparent ;
- couleurs bleu / orange de la charte ;
- sans texte ;
- lisible à la taille d’affichage de référence d’environ **45 px**.

Pour **Consignes**, la règle retrouvée est de conserver l’icône existante de SEB EvalPro ; aucun nouveau visuel détaillé n’a été validé dans la discussion récupérée.

L’objectif est qu’une page produite par KALONÉO reste structurellement prévisible et reproductible par SEB EvalPro.

---

## 21. Règle de tenue du présent registre

**Statut : VALIDÉ**

À partir de maintenant :

1. toute décision fonctionnelle importante prise pour KALONÉO / KALTEST doit être ajoutée ici ;
2. une décision validée ne doit pas disparaître lors d’un nettoyage ou d’une refactorisation ;
3. une décision remplacée reste dans l’historique et pointe vers sa remplaçante ;
4. les éléments encore expérimentaux doivent être identifiés comme **EN TEST** ou **PROTOTYPE** et ne doivent pas être présentés comme validés ;
5. les commits/builds/runs importants doivent être référencés lorsque cela aide à retrouver la preuve de validation ;
6. avant toute modification importante, ce registre doit servir de contrôle anti-régression.

---

## Historique du registre

### 1er octobre 2026

- création du registre ;
- reprise des décisions déjà validées dans la conception KALONÉO / KALTEST ;
- ajout des règles de compatibilité et de non-régression ;
- consignation de l’état du PILOTE #2 et du correctif `e8bbcd05b2e4260f4ff4cab80c1c0376982d266a`;
- ajout des décisions retrouvées sur la séparation KALONÉO / SEB EvalPro et les deux Setup distincts;
- ajout de la structure minimale validée des pages de test : Scénario, Consignes, icônes institutionnelles et bloc Exercice.


---

## 22. CSS et rendu visuel détaillé

**Statut : VALIDÉ**

Référence CSS anti-régression associée : `docs/KALONEO-CSS-REFERENCE-VALIDEE.md`.

La charte commune doit être appliquée à KALONÉO, à SEB EvalPro et à la prévisualisation du Builder.

Règles retrouvées et validées :

- aucune page ne doit recréer localement une apparence lorsqu’un composant commun existe déjà ;
- le rendu de prévisualisation KALONÉO doit être reproductible fidèlement par SEB EvalPro ;
- fond général : `linear-gradient(to bottom, #ffffff, #ebeef5)` ;
- texte courant, champs, tableaux et boutons : **Calibri** ;
- grands titres et titres de section : **Calibri Light** ;
- le gras reste autorisé lorsqu’il améliore la hiérarchie ou la lisibilité ;
- les conteneurs et blocs conservent les tailles, formes et proportions définies par les modèles KALONÉO validés ;
- arrondis, ombres discrètes et espacements doivent rester harmonisés ;
- les champs utilisent un état de focus bleu cohérent avec la charte ;
- les tableaux utilisent le rendu institutionnel commun ;
- les états **survol**, **actif/appuyé** et **désactivé** doivent être prévus et rester cohérents ;
- une page candidat prévue sans défilement ne doit pas acquérir de scroll à cause d’une modification CSS ;
- aucune apparence institutionnelle ne peut être modifiée silencieusement sans nouvelle règle validée.

### Boutons Crystal

Le rendu Crystal est commun à SEB EvalPro, KALONÉO et la barre Administrateur :

- même géométrie ;
- même fond clair ;
- même arrondi ;
- même ombre ;
- mêmes effets de survol et de pression ;
- seules la couleur du texte et celle du contour varient selon le rôle déjà défini : rouge, vert, orange ou bleu.

---

## 23. Présentations disponibles dans Test Builder

**Statut : VALIDÉ**

La présentation d’une page construite dans KALONÉO suit les règles suivantes :

- **Scénario** : pleine largeur ;
- **Consignes** : pleine largeur ;
- **Exercice** : peut être présenté en un bloc ou en deux blocs ;
- un modèle permet également de placer les **informations à gauche** et l’**exercice à droite** ;
- pour une présentation à deux zones, les ratios disponibles sont :
  - **50/50** ;
  - **40/60** ;
  - **60/40** ;
- le choix de présentation est montré dans le Builder par des miniatures afin que l’auteur voie clairement la disposition choisie ;
- un seul niveau de sous-blocs est autorisé ;
- aucun sous-bloc ne peut contenir un autre sous-bloc.

Le choix de présentation fait partie de la définition KALTEST afin que le rendu soit reproductible dans SEB EvalPro.

---

## 24. Bibliothèque d’icônes du Test Builder

**Statut : VALIDÉ — objectif actuel : 80 icônes ; historique documenté : 70**

La bibliothèque d’icônes du Test Builder est fixée à **80 icônes** comme objectif validé actuel.

Traçabilité de la discussion précédente :

- première bibliothèque validée : environ **30 icônes** ;
- ajout validé ensuite : **40 icônes supplémentaires**, soit **70 icônes** explicitement documentées dans l’historique ;
- le 1er octobre 2026, l’objectif **80 icônes** a été retenu explicitement pour ne pas perdre la bibliothèque prévue lors de la récupération de la discussion précédente.

Règles déjà validées pour la bibliothèque :

- icônes petites ;
- même taille ;
- même style ;
- bibliothèque harmonisée ;
- recherche et sélection dans **Test Builder V5** ;
- l’icône sélectionnée est enregistrée dans le fichier `.kaltest` ;
- les icônes sont réutilisables dans le projet.

Pour les zones **Scénario** et **Consignes**, les icônes institutionnelles prévues sont gérées automatiquement par KALONÉO et ne doivent pas être recréées exercice par exercice.

> **Contrôle anti-régression :** conserver la nuance historique : 70 icônes sont précisément documentées (30 + 40). L’objectif actuel est 80 ; les 10 icônes complémentaires doivent être intégrées sans supprimer ni remplacer silencieusement les 70 déjà documentées.

---

## 25. Validation d’un test et mode noté / non noté

**Statut : VALIDÉ**

Chaque test doit déclarer s’il est :

- **noté** ;
- **non noté**.

Un test non noté reste présent dans le parcours mais **ne contribue pas au score de la section**.

### Validation obligatoire et bloquante

La validation se fait à deux niveaux :

1. **KALONÉO / Builder** valide le paquet avant qu’il puisse devenir un test utilisable ;
2. **SEB EvalPro** revalide le paquet à l’import / avant utilisation selon le contrat KALTEST.

Règles :

- un test non validé ne peut pas entrer dans le **catalogue actif** ;
- un test non validé ne peut pas être utilisé dans un parcours ;
- un parcours doit être refusé si un de ses tests n’est pas valide ou compatible ;
- une erreur de structure, de compatibilité ou de contenu bloquant doit être corrigée avant utilisation ;
- la sauvegarde, la reprise et le Replay restent basés sur les mécanismes du Build #20.

Principe : **aucune injection silencieuse d’un test en échec**.

---

## 26. Structure du Bilan et calcul des compétences

**Statut : VALIDÉ**

Le tableau institutionnel du Bilan conserve les **6 colonnes** :

`Modules | NE | I | II | III | Commentaires`

### Trois grandes familles conservées

Le Bilan conserve les trois familles institutionnelles existantes :

1. **Compétences techniques** ;
2. **Utilisation des techniques de l'information et de la communication** ;
3. **Savoirs fondamentaux**.

Règles de construction :

- les lignes sont dynamiques selon les compétences réellement évaluées ;
- le rattachement d’un test à une ou plusieurs lignes de Bilan est défini lors de la **création du test dans KALONÉO** ;
- un test peut alimenter **plusieurs lignes de compétence** lorsque sa définition le prévoit ;
- un test absent du parcours ne crée aucune ligne artificielle ;
- plusieurs tests peuvent alimenter une même compétence ;
- pour une compétence alimentée par plusieurs tests, les points obtenus et les maximums sont additionnés avant calcul du niveau ;
- les définitions de Bilan créées dans KALONÉO doivent être transférées avec le test et reproductibles par SEB EvalPro, au même titre que les autres éléments contractuels du test ;
- hiérarchie possible :
  - Grande section ;
  - Sous-section / module ;
  - famille éventuelle ;
  - lignes de compétence ;
- les seuils et textes de commentaires I / II / III / NE peuvent être configurés ;
- des variables dynamiques peuvent être insérées dans les commentaires.

### Seuils validés

- **I** : de 70 % à 100 % ;
- **II** : de 45 % à 69,99 % ;
- **III** : de 0 % à 44,99 % ;
- **NE** : uniquement lorsqu’une compétence est réellement non évaluée.

---

## 27. Abandon, points conservés et NE

**Statut : VALIDÉ**

Lorsqu’un exercice est abandonné :

- les points déjà obtenus sont conservés ;
- si l’abandon intervient au début, le score obtenu est 0 ;
- sauf décision NE explicite de l’Administrateur, l’exercice reste inclus dans la moyenne.

L’Administrateur dispose de la décision **« Exercice non évalué dans le bilan »** :

### Case cochée

- l’exercice est considéré comme non évalué pour le Bilan ;
- ses contributions sont exclues du calcul ;
- il alimente le statut **NE** lorsque la compétence n’a aucune autre contribution évaluée.

### Case décochée

- les points déjà réalisés sont conservés ;
- l’exercice reste pris en compte dans le calcul de la compétence et dans la moyenne.

Dans tous les cas :

- le Replay et l’historique sont conservés ;
- si une ligne de compétence possède d’autres contributions réellement évaluées, elle ne devient pas globalement NE ;
- lorsqu’une case NE apparaît dans le Bilan, l’Administrateur peut ajouter un commentaire explicatif dans la colonne prévue.

---

## 28. Structure obligatoire d’un parcours candidat

**Statut : VALIDÉ**

Tous les parcours suivent la structure commune suivante :

1. **Page 1 — Identification** ;
2. **Page 2 — Introduction obligatoire** ;
3. **Tests à partir de la page 3** ;
4. **Page finale obligatoire**.

Le parcours choisi et ses versions de tests doivent rester figés pour l’évaluation concernée afin que l’historique et le Replay restent reproductibles.

### Identification candidat

La décision initiale de 6 chiffres a été **REMPLACÉE** le 1er octobre 2026.

Règle actuelle :

- utiliser exactement les **7 premiers chiffres** de l’identifiant candidat basé sur le numéro de sécurité sociale ;
- le champ et le contrôle de validation doivent imposer exactement 7 chiffres.

---

## 29. Replay, Quitter et fermeture définitive

**Statut : VALIDÉ**

- la **Page 1** démarre le Replay ;
- la **Page finale** clôture normalement le Replay ;
- **Quitter** sauvegarde l’état courant et permet la reprise ultérieure de l’évaluation ;
- **Fermer la session active** termine définitivement l’évaluation ;
- si l’Administrateur ferme volontairement la session avant la page finale, le Replay est finalisé et conservé jusqu’au point réellement atteint ;
- les pages réellement parcourues doivent rester traçables afin que le Replay corresponde au parcours effectivement réalisé.

---

## 30. Compatibilité ascendante des tests

**Statut : VALIDÉ**

Un test validé pour une version de SEB EvalPro doit rester lisible par les versions mineures ultérieures de la même génération tant que le contrat reste compatible.

Exemple de règle validée : un test validé pour SEB EvalPro **1.1** doit rester compatible avec **1.2 et les versions mineures ultérieures** de la même génération.

Pour protéger cette règle :

- les tests / fixtures historiques restent dans la CI ;
- une nouveauté incompatible est refusée avant le parcours ;
- la publication KALONÉO est bloquée si SEB EvalPro ne sait pas reproduire le nouveau contenu ;
- SEB EvalPro ne change de version que lorsqu’une adaptation est réellement nécessaire.

---

## Historique complémentaire — récupération de la discussion précédente

### 1er octobre 2026 — seconde passe

Ont été réintégrées dans le registre les décisions qui manquaient après la première reconstruction :

- CSS et rendu visuel détaillé ;
- comportements hover / actif / désactivé et focus ;
- préservation des pages sans scroll lorsque prévu ;
- présentations Scénario / Consignes / Exercice et ratios 50/50, 40/60, 60/40 ;
- bibliothèque validée de **70 icônes** et enregistrement dans `.kaltest` ;
- test noté / non noté ;
- validation KALTEST obligatoire et bloquante ;
- structure et seuils du Bilan ;
- agrégation de plusieurs tests sur une même compétence ;
- règles abandon / NE ;
- structure obligatoire Page 1 / Page 2 / tests / page finale ;
- correction de 6 à **7 chiffres** pour l’identification candidat ;
- démarrage et clôture du Replay ;
- différence entre **Quitter** et **Fermer la session active** ;
- compatibilité ascendante et conservation des fixtures historiques.


---

## 31. Contenus et types de questions du bloc Exercice

**Statut : VALIDÉ**

Le bloc **Exercice** de KALONÉO doit proposer l’élément **Question** et accepter les familles de contenus validées suivantes :

### Contenus généraux

- Texte ;
- HTML ;
- HTML + JavaScript associé ;
- Image ;
- Audio ;
- Vidéo.

### Types de réponse validés pour une Question

- texte ;
- nombre ;
- nombre + unité ;
- choix unique ;
- choix multiple ;
- vrai / faux ;
- liste déroulante.

Les ressources nécessaires doivent être intégrées au paquet KALTEST selon les règles de médias locaux et de compatibilité déjà définies.

---

## 32. Questions d’exemple

**Statut : VALIDÉ**

KALONÉO doit permettre de créer une **question d’exemple**.

Une question d’exemple :

- est affichée au candidat ;
- n’est pas notée ;
- reçoit automatiquement **0 point** ;
- est exclue du score ;
- est exclue du Bilan ;
- est exclue du résultat de section.

Elle sert uniquement à montrer au candidat le fonctionnement attendu avant les questions évaluées.

---

## 33. Tableau insérable dans un exercice

**Statut : VALIDÉ**

Le Builder doit permettre d’insérer un tableau dans un exercice.

Types de cellules validés :

- texte fixe ;
- réponse candidat ;
- unité ;
- liste déroulante ;
- image.

Le tableau doit permettre :

- l’ajout de lignes ;
- la suppression de lignes ;
- l’ajout de colonnes ;
- la suppression de colonnes ;
- la fusion de cellules.

Des médias peuvent également être utilisés dans une cellule lorsque le type de contenu le nécessite :

- image ;
- audio ;
- vidéo.

Les ressources utilisées par le tableau doivent être embarquées dans le `.kaltest` afin que le test reste autonome.

---

## 34. Lignes de Bilan : mode manuel ou automatique

**Statut : VALIDÉ**

Chaque ligne de compétence du Bilan doit déclarer son mode de remplissage :

- **Automatique** ;
- **Manuel**.

### Automatique

Le niveau et les informations de la ligne sont calculés à partir des données produites par le ou les tests rattachés.

### Manuel

L’Administrateur choisit le niveau lors du Bilan pour les compétences qui ne peuvent pas être déterminées automatiquement.

Exemples déjà utilisés comme référence :

- certaines lignes de l’**étoile 3D** sont manuelles ;
- le **puzzle** peut alimenter automatiquement ses lignes.

Lorsqu’une nouvelle ligne de Bilan est créée dans KALONÉO, sa définition doit prévoir au minimum :

- sa grande section ;
- sa sous-section / son module ;
- son identifiant stable ;
- son mode Manuel / Automatique ;
- ses niveaux NE / I / II / III ;
- ses commentaires ;
- ses seuils lorsqu’ils sont nécessaires ;
- les données dynamiques dont elle a besoin.

KALONÉO doit refuser la validation d’un nouvel exercice automatique si les données nécessaires au calcul de ses lignes de Bilan ne sont pas définies.

---

## 35. Gestion des parcours dans SEB EvalPro

**Statut : VALIDÉ**

La page **Gestion des parcours** comporte les commandes dédiées suivantes :

- **Créer** ;
- **Ouvrir** ;
- **Dupliquer** ;
- **Supprimer** ;
- **Exporter** ;
- **Importer**.

Règles :

- **Supprimer** est une action à risque et suit la règle visuelle rouge ;
- Créer, Ouvrir, Dupliquer, Exporter et Importer suivent la règle des actions fonctionnelles bleues ;
- l’import/export d’un parcours ne doit modifier, supprimer ni écraser aucun candidat ni aucun résultat existant.

L’export d’un parcours doit conserver :

- l’ordre exact des éléments ;
- les versions exactes des tests ;
- les tests nécessaires ;
- les médias et autres ressources nécessaires ;
- les informations d’intégrité permettant de vérifier que le parcours importé est identique à celui exporté.

Objectif : permettre de reproduire une session identique sur plusieurs PC sans dépendance extérieure.

Cette règle complète la décision déjà enregistrée d’un import/export en lot depuis un dossier, un disque ou une clé USB, sans mot de passe pour les tests et parcours.

---

## 36. Contrat des résultats complexes

**Statut : REPORTÉ — NE PAS PRÉSENTER COMME IMPLÉMENTÉ**

La discussion précédente a explicitement décidé de **reporter le contrat générique des résultats complexes**.

Conséquence :

- les mécanismes simples déjà définis et migrés restent utilisables ;
- les règles de Bilan déjà validées restent applicables ;
- les exercices complexes doivent déclarer explicitement les données qu’ils produisent lorsqu’ils en ont besoin ;
- aucun moteur générique de résultats complexes ne doit être considéré comme terminé tant qu’une décision ultérieure ne l’a pas validé.

Cette entrée empêche une future refactorisation de supposer à tort que ce contrat avait déjà été finalisé.

---

## Historique complémentaire — troisième passe

### 1er octobre 2026

Ajouts retrouvés dans la discussion précédente :

- types de contenus du bloc Exercice ;
- types de réponses Question ;
- questions d’exemple à 0 point hors score/Bilan ;
- tableaux éditables avec cellules spécialisées et fusion ;
- médias dans les cellules et embarquement KALTEST ;
- lignes de Bilan manuelles ou automatiques ;
- contrat minimal d’une nouvelle ligne de compétence ;
- page Gestion des parcours et conservation de l’intégrité ;
- résultats complexes explicitement reportés.

---

## 37. Conservation des anciennes versions validées

**Statut : VALIDÉ**

Une ancienne version d’un test qui a déjà été validée et importée reste utilisable tant qu’elle demeure compatible avec le contrat KALTEST et la version de SEB EvalPro installée.

La publication d’une version plus récente :

- n’invalide pas automatiquement les versions précédentes ;
- ne supprime pas les versions déjà utilisées ;
- ne remplace pas silencieusement une version existante ;
- ne doit pas empêcher la relecture d’un parcours historique qui dépend d’une version antérieure.

Cette règle complète le principe de mise à jour additive et la compatibilité ascendante.

---

## 38. Référence CSS anti-régression

**Statut : VALIDÉ**

Le fichier suivant fait partie de la documentation de référence :

`docs/KALONEO-CSS-REFERENCE-VALIDEE.md`

Il enregistre :

- les fichiers CSS canoniques ;
- leurs blobs Git de référence au 1er octobre 2026 ;
- les variables de couleurs et polices ;
- les rayons, ombres et dimensions principales ;
- les états des boutons Crystal ;
- les règles de focus ;
- les règles images/vidéos ;
- le rendu des tableaux ;
- le comportement sans scroll du PILOTE #2 ;
- les dimensions/règles de Scénario et Consignes ;
- les ratios d’exercice ;
- les règles responsive actuellement utilisées.

Une modification CSS qui change le rendu ne doit pas être classée comme simple nettoyage. Elle doit être réévaluée comme une modification fonctionnelle/visuelle.

---

## 39. Formats `.kaltest` et `.kalparcours`

**Statut : VALIDÉ**

Les deux formats ont des rôles distincts.

### `.kaltest`

Paquet autonome décrivant un test construit et validé par KALONÉO.

Il comprend ou référence de façon autonome les éléments nécessaires au test, notamment :

- version du format KALTEST ;
- version du Builder ;
- version minimale de SEB EvalPro ;
- identifiant du test ;
- version du test ;
- fonctions requises ;
- ressources et médias locaux nécessaires.

KALONÉO valide le paquet avant export. SEB EvalPro le **revalide à l’import** et le refuse en cas d’incompatibilité, de fonction inconnue ou d’incohérence.

### `.kalparcours`

Paquet autonome servant à transférer un parcours à l’identique entre plusieurs PC.

Il doit embarquer :

- la configuration du parcours ;
- l’ordre exact des éléments ;
- les réglages du parcours ;
- les versions exactes des `.kaltest` utilisés ;
- les tests nécessaires ;
- les médias et ressources nécessaires ;
- les informations / empreintes d’intégrité nécessaires au contrôle.

Un `.kalparcours` :

- ne contient pas de données candidat ;
- n’altère jamais les candidats ni les résultats déjà présents ;
- est revalidé par SEB EvalPro à l’import ;
- est refusé s’il est incompatible ou incohérent ;
- conserve les versions de tests nécessaires afin de reproduire exactement la session prévue.

L’import/export en lot depuis dossier, disque ou clé USB reste sans mot de passe pour les tests et parcours.


---

## 40. Calculatrice — compatibilité du test et activation par le parcours

**Statut : VALIDÉ — décision récupérée de la discussion précédente**

La calculatrice fonctionne sur deux niveaux distincts :

1. dans le **Test Builder**, le test déclare `Calculatrice compatible : OUI / NON` ;
2. lors de la **création du parcours**, l’Administrateur décide si la calculatrice est effectivement affichée pour chaque test compatible.

Conséquences :

- si le test déclare `Calculatrice compatible : NON`, l’option **Afficher la calculatrice** n’est pas proposée dans la création du parcours ;
- si le test est compatible mais que la case n’est pas cochée dans le parcours, aucun bouton Calculatrice n’apparaît côté candidat ;
- si la case est cochée, le bouton Calculatrice apparaît automatiquement ;
- le test n’embarque jamais son propre code de calculatrice ;
- il n’existe qu’une seule calculatrice officielle commune, fournie par l’hôte KALONÉO / SEB EvalPro.

Cette précision complète la section 13.

---

## 41. Bloc Exercice — éditeur continu et insertion de Questions

**Statut : VALIDÉ — décision récupérée de la discussion précédente**

Le bloc **Exercice** fonctionne comme un éditeur de contenu continu.

Familles d’éléments prévues :

- **Question** ;
- Texte ;
- HTML ;
- HTML + JavaScript ;
- Image ;
- Audio ;
- Vidéo.

Le bouton **Question** insère un bloc Question **à l’endroit du curseur** dans le contenu en cours.

L’auteur peut donc construire une page dans un ordre libre, par exemple :

`texte → image → texte → question → texte → question → audio → question → HTML`.

Les champs d’un bloc Question ne doivent pas être limités à une petite zone fixe : ils s’agrandissent ou passent sur plusieurs lignes à mesure que le contenu augmente.

---

## 42. Bloc Question — champs et aide à la saisie

**Statut : VALIDÉ POUR LE NOYAU — options avancées à confirmer séparément**

Chaque groupe Question possède au minimum :

- un **ID automatique** ;
- **Question** ;
- **Réponse(s) attendue(s)** ;
- **Unité(s)** ;
- **Points**.

Règles de saisie :

- plusieurs réponses acceptées sont séparées par un point-virgule `;` ;
- plusieurs écritures d’unité acceptées sont également séparées par `;` ;
- l’unité peut rester vide si aucune unité n’est demandée ;
- l’interface doit fournir une aide au survol expliquant le rôle de chaque champ ;
- le champ de correction doit être nommé **Réponse(s) attendue(s)** afin de ne pas le confondre avec la réponse saisie par le candidat ;
- le candidat ne voit jamais les réponses attendues ni le nombre de points attribué.

### Options avancées retrouvées mais non encore reclassées comme décision définitive

La discussion proposait derrière un bouton **Options** :

- type de réponse ;
- réponse obligatoire ;
- respect des majuscules/minuscules ;
- respect des accents ;
- tolérance numérique.

Ces options sont conservées ici comme **À CONFIRMER** tant qu’une validation explicite ultérieure n’a pas été retrouvée.

---

## 43. Identifiant automatique et stable des Questions

**Statut : VALIDÉ**

L’identifiant d’une Question est généré automatiquement à partir :

- de son numéro séquentiel ;
- de l’identifiant normalisé du titre du test.

Format retenu :

`ID<n>_<titre_normalise>`

Exemples :

- `ID1_calculs_de_surface` ;
- `ID2_calculs_de_surface` ;
- `ID1_fractions` ;
- `ID1_paronymes`.

Normalisation du titre :

- passage en minuscules ;
- suppression des accents ;
- espaces remplacés par `_` ;
- caractères spéciaux supprimés.

Règles anti-régression :

- l’ID est généré automatiquement ;
- il n’est pas modifiable manuellement ;
- une fois le test enregistré, l’ID reste stable ;
- modifier le texte de la question ne change pas son ID ;
- déplacer une question ne doit pas casser son ID historique ;
- cette stabilité protège les réponses enregistrées, le barème, le Replay, le Bilan et les anciens résultats.

---

## 44. Question d’exemple — comportement détaillé

**Statut : VALIDÉ POUR LE NOYAU**

Chaque Question peut proposer l’option :

`Question d’exemple`

Lorsqu’elle est activée :

- un ID normal est tout de même généré ;
- la question est affichée au candidat ;
- elle peut disposer d’une réponse attendue ;
- **Points = 0** automatiquement ;
- le champ Points est verrouillé à 0 ;
- elle ne compte pas dans le score maximum ;
- elle ne compte pas dans le résultat de la section ;
- elle n’influence pas le Bilan ;
- le Builder l’identifie visuellement comme **EXEMPLE — non noté** ;
- côté candidat, une indication discrète **Exemple** peut être affichée.

Le document évoquait la possibilité de conserver l’action du candidat dans le Replay, mais cette partie n’était pas formulée comme une décision ferme. Elle reste donc **À CONFIRMER**.

---

## 45. Points techniques retrouvés comme restant à verrouiller

**Statut : À VALIDER — NE PAS PRÉSENTER COMME IMPLÉMENTÉ OU DÉFINITIVEMENT VALIDÉ**

La discussion précédente avait explicitement identifié les points suivants comme encore incomplets. Ils sont consignés ici pour éviter de les perdre.

### Contrat commun des réponses candidat

Prévoir un format capable de représenter selon l’exercice :

- champ texte ;
- plusieurs réponses ;
- cases cochées ;
- ordre d’éléments ;
- glisser-déposer ;
- nombre d’erreurs ;
- durée ;
- résultat d’une activité physique ou d’une manipulation.

### Correction et barème

Points à définir complètement :

- réponses attendues ;
- points par réponse ;
- score maximum ;
- réponses alternatives acceptées ;
- cas où la correction est gérée par le JavaScript de l’exercice.

### Résultat standard

La discussion proposait un résultat commun comprenant au minimum :

- score obtenu ;
- score maximum ;
- pourcentage ;
- statut terminé / abandonné / non réalisé ;
- données détaillées.

Cette partie reste liée au **contrat des résultats complexes reporté** de la section 36.

### Sauvegarde et reprise fine

Le principe général de sauvegarde/reprise du Build #20 est validé. Le contrat KALTEST doit encore formaliser précisément la restauration des états internes propres à certains exercices, notamment :

- positions d’objets ;
- chrono interne ;
- étape interne ;
- autoévaluation éventuelle ;
- autres états complexes spécifiques.

### Replay

Le Replay reste centralisé et hérité du Build #20 : un exercice ne doit pas embarquer son propre moteur Replay.

Restent à formaliser dans le contrat les déclarations éventuelles de :

- événements utiles ;
- captures ;
- état avant/après validation ;
- autres données spécifiques nécessaires au Replay d’un exercice complexe.

### Contenu réel du paquet `.kaltest`

Le principe d’un paquet **autonome et hors ligne** est validé. Le détail final du manifeste doit encore formaliser l’organisation des ressources, par exemple :

- manifest ;
- HTML ;
- JavaScript ;
- CSS ;
- images ;
- audio ;
- vidéo ;
- correction ;
- définition Bilan ;
- données/tests nécessaires.

Une simple référence à une ressource externe n’est pas suffisante.

### Paramétrage avancé du chronomètre commun

Le **moteur de chronomètre unique** est validé. Restent à formaliser comme paramètres contractuels les cas avancés tels que :

- chrono répété, par exemple 3 à 5 mesures ;
- remise à zéro automatique ;
- focus automatique après arrêt ;
- temps affiché ou masqué.

### Intervention Administrateur — contrat technique

La présence d’une capacité **Intervention Administrateur** dans le Builder est une exigence validée. Reste à formaliser son contrat technique commun afin qu’un exercice n’invente pas son propre mot de passe ni son propre mécanisme de sécurité.

Exemples de besoins identifiés :

- saisir un nombre d’erreurs ;
- confirmer qu’un exercice est terminé.

### Fin d’exercice standardisée

Le principe de navigation centralisée par le parcours est validé : un exercice ne doit pas décider arbitrairement de sa page suivante.

Le nom exact et l’API du signal de fin d’exercice restent à verrouiller. La discussion avait proposé un contrat du type `EXERCICE_TERMINE`, après quoi l’hôte prend en charge :

- sauvegarde ;
- calcul ;
- Replay si nécessaire ;
- ouverture du prochain élément selon l’ordre réel du parcours.

**Le nom `EXERCICE_TERMINE` reste une proposition tant que l’API finale n’est pas validée.**

### Version minimale et manifeste de capacités

La compatibilité minimale avec SEB EvalPro et les fonctions requises sont déjà validées dans le contrat KALTEST.

Reste à formaliser précisément le manifeste des capacités particulières et leur schéma de données commun.

### Checklist de validation automatique proposée

Avant injection d’un test, la discussion proposait de vérifier :

- ouverture ;
- scénario ;
- consignes ;
- exercice ;
- saisie ;
- sauvegarde ;
- rechargement ;
- correction ;
- score ;
- abandon ;
- chronomètre si utilisé ;
- résultat ;
- Bilan ;
- fin d’exercice ;
- fonctionnement sans Internet ;
- absence de ressources externes manquantes.

Le principe général **validation bloquante / injection interdite en cas d’échec** est déjà validé. Le détail exact de cette checklist reste à consolider dans le Validateur.

---

## Historique complémentaire — récupération via l’historique de la discussion partagée

### 1er octobre 2026 — contrôle de provenance

La récupération étendue de la discussion précédente a permis de corriger le registre sur deux points :

- les formats/codecs et limites 250 Mo / 500 Mo / 1 Go des médias étaient des propositions de conception dont la validation explicite n’a pas été retrouvée : elles sont désormais **À CONFIRMER** ;
- plusieurs règles détaillées des transitions n’avaient pas de validation explicite retrouvée : elles restent consignées sans être présentées comme définitivement validées ;
- la page **Gestion des parcours** est confirmée avec **Créer, Ouvrir, Dupliquer, Supprimer, Exporter, Importer** ;
- l’import/export d’un parcours ne doit toucher ni aux candidats ni aux résultats existants.

---

## Historique complémentaire — extrait de discussion fourni le 1er octobre 2026

Le document `Oui.docx` fourni par l’utilisateur a permis de récupérer et de distinguer :

- les précisions de calculatrice compatible / activation par parcours ;
- le fonctionnement de l’éditeur continu du Bloc Exercice ;
- l’insertion des Questions au curseur ;
- les champs et aides de saisie d’une Question ;
- la règle d’identifiant `ID<n>_<titre_normalise>` stable ;
- le comportement détaillé des Questions d’exemple ;
- plusieurs chantiers explicitement identifiés comme encore à verrouiller, conservés avec le statut **À VALIDER** afin de ne pas les transformer artificiellement en décisions acquises.

---

## 46. Interface candidat — référence Build #20

**Statut : VALIDÉ**

La référence fonctionnelle et visuelle du parcours candidat reste l’interface réelle du **Build #20**. Le pilote simplifié ne doit pas devenir la nouvelle référence par accident.

Règles explicitement validées :

- pages candidat conçues **sans scroll ni débordement** dans les conditions prévues ;
- conservation de l’image / zone **Découverte** lorsqu’elle appartient au modèle de page concerné ;
- conservation de la **calculatrice flottante existante** lorsqu’elle est activée par le parcours ;
- conservation du mécanisme d’**abandon** du Build #20, avec les cases / raisons prévues et validation Administrateur ;
- conservation de la **barre Administrateur** et de son comportement ;
- la prévisualisation KALONÉO doit correspondre au rendu que SEB EvalPro produira réellement ;
- une migration KALTEST ne doit pas remplacer silencieusement une page Build #20 par une version visuellement simplifiée si cette simplification n’a pas été validée.

Cette règle est prioritaire lors des migrations : le contrat KALTEST doit reproduire le fonctionnement validé, pas seulement les réponses et les scores.

---

## 47. Capacités particulières déclarées par un test

**Statut : VALIDÉ POUR LA PRÉSENCE DANS LE BUILDER — contrat détaillé à formaliser**

Le Test Builder doit pouvoir déclarer des capacités particulières lorsqu’un exercice en a besoin, notamment :

- **Calculatrice compatible** ;
- **Utiliser le chronomètre KALONÉO** ;
- **Intervention Administrateur** ;
- **Autoévaluation** ;
- **Matériel extérieur**.

Règles déjà validées :

- la calculatrice suit le fonctionnement à deux niveaux décrit en section 40 ;
- le chronomètre utilise un moteur commun, jamais un chronomètre recodé exercice par exercice ;
- Intervention Administrateur, Autoévaluation et Matériel extérieur font partie des capacités que le Builder doit pouvoir déclarer.

Le détail technique de leur représentation dans le manifeste KALTEST reste à formaliser. Le statut de cette section valide **l’existence des capacités dans le Builder**, pas encore leur API interne finale.

---

## Historique complémentaire — récupération des conversations du Projet ChatGPT

### 1er octobre 2026 — quatrième passe de consolidation

Le déplacement des conversations KALONÉO dans le même Projet ChatGPT a permis de retrouver plusieurs validations explicites supplémentaires :

- objectif actuel de **80 icônes**, avec conservation de la trace historique des 70 précisément documentées ;
- lecteur audio de la Dictée Build #20 retenu comme modèle commun et vidéo sur le même principe ;
- médias limités à ce qui est réellement compatible avec le lecteur retenu sous Windows et Linux ;
- transition vidéo automatique sans bouton candidat : démarrage après **Suivant**, masquage à la fin et affichage automatique du test suivant ;
- transitions manuelles / automatiques et positionnement libre dans l’ordre du parcours ;
- interface candidat Build #20 conservée comme référence, notamment pages sans scroll, calculatrice flottante, abandon et barre Administrateur ;
- présence dans le Builder des capacités Intervention Administrateur, Autoévaluation et Matériel extérieur.

Les points encore seulement proposés ou insuffisamment documentés restent marqués **À CONFIRMER** ou **À VALIDER** au lieu d’être transformés artificiellement en décisions acquises.

---

## 48. Création d’un parcours — catalogue, sélection et ordre

**Statut : VALIDÉ**

La page de création d’un parcours s’appuie sur un **catalogue dynamique des tests ACTIFS**.

### Catalogue et stabilité

- le catalogue est rechargé avec les tests actuellement **ACTIFS** ;
- un nouveau test ajouté au catalogue n’est **jamais ajouté automatiquement** à un parcours déjà enregistré ;
- un parcours enregistré reste stable tant que l’Administrateur ne le modifie pas volontairement ;
- les tests déjà sélectionnés conservent leur version et leurs réglages conformément aux règles de versionnement du présent registre.

### Sélection des tests

Le créateur de parcours prévoit :

- glisser-déposer des tests ;
- refus d’un dépôt dans une mauvaise section lorsqu’il ne respecte pas la configuration prévue ;
- interdiction des doublons d’un même élément dans le parcours lorsque le modèle n’en prévoit pas ;
- sections extensibles ;
- totalisation des points par section ;
- enregistrement du parcours.

### Sections de catalogue explicitement validées

Les sections retrouvées comme validées sont notamment :

- **Mathématiques** ;
- **Français** ;
- **Organisation** ;
- **Numérique** ;
- **Technique** ;
- **Planification**.

**Raisonnement / Logique** a été proposé dans la discussion mais sa validation explicite n’a pas été retrouvée : ne pas le traiter comme acquis sans nouvelle preuve/décision.

### Ordre de passage

Pour chaque test sélectionné :

- l’Administrateur définit un **ordre de passage** ;
- cet ordre est **unique** ;
- il est **continu** ;
- il est **sauvegardé** avec le parcours ;
- l’ordre de passage détermine l’exécution côté candidat ;
- la **section** sert au regroupement / au Bilan et ne détermine pas l’ordre d’exécution.

### Informations non modifiables du test

Dans la création du parcours :

- la **durée** provient de la définition du test ;
- les **points** proviennent de la définition du test ;
- ces valeurs ne sont pas modifiées arbitrairement par le créateur du parcours.

### Contrôles de la création

La maquette validée prévoit également :

- contrôles avant enregistrement ;
- résumé du parcours ;
- possibilité de modification ;
- alerte en cas de sortie avec modifications non enregistrées.

La calculatrice, la navigation et l’abandon suivent les règles communes déjà définies dans les sections 15, 16 et 40.

---

## 49. Autonomie des parcours et absence de Bilan global multi-parcours

**Statut : VALIDÉ**

La décision de conception conserve les résultats d’une évaluation **par parcours**.

Il n’existe pas de Bilan global mélangeant automatiquement plusieurs parcours d’un même candidat.

Chaque parcours conserve ses propres éléments associés :

- Résultats ;
- Replay ;
- Bilan ;
- documents / Word associés lorsque le parcours en produit.

L’export/import `.kalparcours` décidé ultérieurement sert uniquement à **déployer la définition d’un parcours** sur plusieurs ordinateurs. Il ne réintroduit pas de Bilan global multi-parcours et ne transporte pas les données candidat.

Cette distinction doit être conservée afin de ne pas confondre :

- **définition de parcours** transférable ;
- **données d’évaluation d’un candidat**, rattachées à son parcours réalisé.

---

## Historique complémentaire — cinquième passe de récupération

### 1er octobre 2026

La relecture des conversations du Projet a permis d’ajouter :

- l’icône Scénario validée (personnage + ordinateur + engrenage, transparent, bleu/orange, sans texte, lisible à 45 px) ;
- les trois grandes familles exactes du Bilan ;
- le catalogue dynamique des tests ACTIFS ;
- la stabilité des parcours enregistrés face aux nouveaux tests ;
- le glisser-déposer contrôlé, l’interdiction des doublons et les points par section ;
- l’ordre de passage unique, continu et sauvegardé, indépendant de la section Bilan ;
- les sections de catalogue validées Mathématiques, Français, Organisation, Numérique, Technique et Planification ;
- durée et points issus du test et non modifiables dans la création du parcours ;
- le maintien d’un Bilan propre à chaque parcours, sans Bilan global multi-parcours.


---

## 50. Socle contractuel des exercices — résultat, reprise, fin, chrono, Admin, autonomie et compatibilité

**Statut : VALIDÉ — décision explicite du 1er octobre 2026**

Cette section verrouille les points d’architecture qui étaient encore partiellement classés `À VALIDER` dans la section 45. En cas de contradiction, la présente section fait foi.

### 50.1 Résultat standard minimal

Tout exercice, quel que soit son type, doit produire au minimum un résultat commun comprenant :

- **score obtenu** ;
- **score maximum** ;
- **pourcentage** ;
- **statut** : terminé / abandonné / non réalisé ;
- **données détaillées propres à l’exercice**.

Les exercices complexes peuvent ajouter des données spécifiques, mais ne doivent pas supprimer ce noyau commun.

### 50.2 Sauvegarde et reprise obligatoires — référence Build #20

La sauvegarde doit empêcher toute perte totale **ou partielle** d’un parcours.

Après fermeture/rechargement, l’exercice doit pouvoir restaurer exactement les données et états nécessaires, notamment selon le type d’exercice :

- réponses ;
- cases et sélections ;
- positions d’objets ;
- état du chronomètre ;
- étape interne ;
- autoévaluation éventuelle ;
- autres états nécessaires à une reprise fidèle.

Le comportement robuste déjà constaté et testé dans le **Build #20** constitue la référence à préserver.

La reprise doit rester fiable y compris après des interruptions système telles que :

- fermeture de session Windows ;
- mise en veille ;
- arrêt puis redémarrage du PC.

Le Validateur KALTEST doit contrôler la sauvegarde/reprise afin qu’une régression ne puisse pas être injectée silencieusement.

### 50.3 Fin d’exercice centralisée par KALONÉO / SEB EvalPro

Un exercice ne choisit **jamais lui-même** sa page suivante et ne contient pas de navigation codée vers un nom de page fixe.

Il signale uniquement qu’il est terminé.

L’hôte KALONÉO / SEB EvalPro prend ensuite en charge :

1. la sauvegarde ;
2. le calcul / la consolidation du résultat ;
3. l’enregistrement Replay lorsque nécessaire ;
4. l’ouverture de l’élément suivant selon **l’ordre réel du parcours**.

Cette règle est obligatoire afin qu’un même test puisse être réutilisé dans des parcours différents, avec des tests précédents et suivants différents.

Le nom technique exact de l’événement ou de l’API de fin d’exercice reste un détail d’implémentation à formaliser ; il ne doit pas remettre en cause cette règle fonctionnelle.

### 50.4 Chronomètre unique normalisé

Il n’existe qu’**un seul moteur de chronomètre officiel KALONÉO / SEB EvalPro**.

Un exercice déclare qu’il utilise le chronomètre commun et lui fournit les paramètres nécessaires.

Aucun exercice ne doit embarquer ou recoder son propre moteur de chronomètre concurrent.

Les variantes fonctionnelles nécessaires — chrono simple, mesures répétées, remise à zéro, focus après arrêt, affichage ou masquage du temps, etc. — doivent devenir des **paramètres du moteur commun**, et non des implémentations séparées.

Le Tri de chevilles et les futurs exercices chronométrés doivent donc utiliser cette norme commune.

### 50.5 Intervention Administrateur unique

Il n’existe qu’**un seul mécanisme sécurisé d’Intervention Administrateur**, fourni par KALONÉO / SEB EvalPro.

Un exercice peut demander une intervention — par exemple saisir un nombre d’erreurs ou confirmer une fin d’exercice — mais :

- il ne crée pas son propre mot de passe ;
- il ne crée pas son propre système de sécurité ;
- il utilise la fenêtre / le composant commun fourni par l’hôte.

### 50.6 Paquet `.kaltest` totalement autonome et hors ligne

Un `.kaltest` doit être **entièrement autonome**.

Toutes les ressources nécessaires à son fonctionnement doivent être fournies au moment de la **création du test** et intégrées au paquet ou à sa structure autonome, notamment selon les besoins :

- HTML ;
- JavaScript ;
- CSS ;
- images ;
- audio ;
- vidéo ;
- correction ;
- définition Bilan ;
- autres ressources nécessaires.

Exemple : si un test a besoin d’une vidéo, **la vidéo est fournie lors de la création du test**.

Elle ne doit pas être téléchargée pendant la création, l’import, l’exécution ou le parcours candidat depuis Internet.

Un test ne doit dépendre d’aucune URL Internet ni d’aucun fichier externe non embarqué pour fonctionner.

### 50.7 Identifiant, version et compatibilité minimale

Chaque `.kaltest` possède au minimum :

- un **identifiant unique** ;
- une **version** ;
- la compatibilité / version minimale requise de KALONÉO / SEB EvalPro lorsque nécessaire ;
- la déclaration des capacités utilisées.

Objectif : empêcher le lancement d’un parcours contenant un test incompatible et éviter qu’une fonction non prise en charge fasse planter le parcours.

Règles :

- une version historique déjà utilisée reste disponible et reproductible ;
- une version existante n’est jamais écrasée silencieusement ;
- un paquet incompatible est refusé avant exécution ;
- le parcours complet est bloqué avant démarrage si l’un de ses éléments n’est pas compatible.

### Conséquence sur la section 45

Les points suivants de la section 45 sont désormais **VALIDÉS dans leur principe** par la présente section :

- résultat standard minimal ;
- sauvegarde/reprise fine obligatoire ;
- fin d’exercice centralisée ;
- chronomètre commun ;
- intervention Administrateur commune ;
- autonomie réelle du paquet `.kaltest` ;
- identifiant/version/compatibilité minimale.

Restent à formaliser uniquement les **schémas techniques exacts**, noms d’API, structures JSON et paramètres détaillés qui n’ont pas encore été arrêtés.

---

## Historique complémentaire — validation du socle contractuel

### 1er octobre 2026

Validation explicite des sept règles d’architecture suivantes :

1. résultat standard minimal commun ;
2. sauvegarde/reprise sans perte totale ou partielle, avec Build #20 comme référence de robustesse face aux interruptions système ;
3. fin d’exercice pilotée par l’ordre du parcours, jamais par une URL/page codée dans le test ;
4. chronomètre unique normalisé ;
5. intervention Administrateur unique fournie par KALONÉO ;
6. `.kaltest` totalement autonome, ressources fournies à la création et jamais téléchargées pendant le parcours ;
7. identifiant/version/compatibilité minimale afin de bloquer les incompatibilités avant démarrage.
