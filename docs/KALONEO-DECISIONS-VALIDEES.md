# KALONÉO — Registre des décisions validées

> **Statut : document de référence fonctionnelle et technique**
>
> Toute évolution de KALONÉO / KALTEST doit être vérifiée contre ce registre.
> Une décision marquée **VALIDÉE** ne doit pas être modifiée, supprimée ou contournée sans une nouvelle décision explicite.
> Lorsqu’une décision évolue, l’ancienne entrée reste traçable et reçoit le statut **REMPLACÉE** avec la référence de la nouvelle décision.

Dernière mise à jour : **1er octobre 2026**

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

**Statut : VALIDÉ**

Le lecteur audio de la dictée du Build #20 sert de référence de comportement.

Un média intégré peut proposer selon le test :

- Lire / Reprendre ;
- Pause ;
- Stop ;
- Recommencer ;
- progression ;
- temps courant / durée ;
- compteur de lectures.

La vidéo suit le même principe visuel et fonctionnel.

Les médias ne doivent jamais être déformés.

Tout média validé doit être embarqué localement dans le contenu exporté.

Aucun test validé ne doit dépendre :

- d’une URL Internet ;
- d’un fichier du Bureau ;
- d’un chemin externe à l’application ou au paquet.

Formats retenus par le contrat :

- vidéo : WebM, VP8 ou VP9, audio Opus ou Vorbis ;
- audio : MP3, WAV PCM, OGG Opus/Vorbis, WebM Opus/Vorbis, FLAC.

KALONÉO vérifie le conteneur et le codec réel, pas seulement l’extension.

Limites actuelles :

- avertissement à partir de **250 Mo** pour un média ;
- maximum **500 Mo** par média ;
- maximum **1 Go** par paquet complet.

---

## 10. Transitions

**Statut : VALIDÉ**

Une transition est un élément de parcours et non un exercice noté.

Elle peut contenir les mêmes familles de contenu que les tests : texte, image, audio et vidéo.

Deux modes sont prévus :

### Mode manuel

- bouton **Suivant** vert.

### Mode automatique

- principalement destiné aux médias ;
- démarrage automatique ;
- aucun bouton candidat ;
- passage automatique à l’élément suivant lorsque le média est terminé.

Une transition :

- ne contribue jamais aux Résultats ;
- ne contribue jamais au Bilan ;
- ne possède aucun score ;
- ne possède aucun abandon d’exercice ;
- reste enregistrée dans le parcours figé et dans la reprise de session.

Après interruption pendant une transition automatique, le média recommence depuis le début.

### Erreur de média pendant une transition

Le candidat ne peut pas contourner seul l’erreur.

SEB EvalPro demande de prévenir le moniteur.

Le secours Administrateur utilise le code `SVG56`, insensible à la casse, et permet :

- de réessayer le média ;
- de passer à la page suivante.

Le contournement doit être enregistré dans l’historique / Replay.

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
- les icônes institutionnelles déjà prévues pour ces blocs sont fournies par KALONÉO et doivent être utilisées de façon cohérente ;
- ces éléments d’en-tête ne doivent pas être réinventés différemment dans chaque exercice ;
- le bloc **Exercice** vient ensuite et reçoit le contenu spécifique du test ;
- les commandes communes comme Calculatrice, Chronomètre, Suivant et Abandonner sont pilotées par la définition du test / du parcours et les composants communs déjà validés.

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
