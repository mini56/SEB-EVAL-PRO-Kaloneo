# Charte commune — SEB EvalPro + Kalonéo

Statut : décisions validées.

## 1. Principe général

SEB EvalPro et Kalonéo utilisent la même charte visuelle et les mêmes règles de rendu.

Une page ne doit pas inventer localement un style lorsqu'un composant de la charte existe déjà.

Le rendu de prévisualisation Kalonéo doit être reproductible fidèlement par SEB EvalPro.

## 2. Typographie

- texte courant, champs, tableaux et boutons : **Calibri** ;
- grands titres et titres de section : **Calibri Light** ;
- le gras est autorisé lorsqu'il améliore la hiérarchie ou la lisibilité ;
- polices de secours : Segoe UI, Arial, sans-serif.

## 3. Fond général

```css
body {
  background: linear-gradient(to bottom, #ffffff, #ebeef5);
  min-height: 100vh;
  margin: 0;
}
```

## 4. Palette institutionnelle

### Bleu

| Niveau | RVB | Hex |
| --- | --- | --- |
| 100 % | 0 / 78 / 112 | `#004E70` |
| 80 % | 53 / 103 / 135 | `#356787` |
| 65 % | 93 / 126 / 155 | `#5D7E9B` |
| 50 % | 131 / 152 / 176 | `#8398B0` |
| 25 % | 193 / 201 / 214 | `#C1C9D6` |

### Orange

| Niveau | RVB | Hex |
| --- | --- | --- |
| 100 % | 249 / 178 / 51 | `#F9B233` |
| 80 % | 251 / 194 / 99 | `#FBC263` |
| 65 % | 253 / 206 / 132 | `#FDCE84` |
| 50 % | 254 / 217 / 162 | `#FED9A2` |
| 25 % | 255 / 236 / 210 | `#FFECD2` |

Vert de référence actuel : `#198754`.

Rouge de référence actuel : `#C62828`.

Les logos, images, illustrations et icônes ne sont pas limités à cette palette.

## 5. Boutons Crystal

Tous les boutons utilisent la même géométrie, le même fond clair Crystal, le même arrondi, la même ombre et les mêmes effets de survol/pression.

Seules la couleur du texte et la couleur du contour changent selon le rôle :

- rouge : actions à risque, abandon, suppression, effacement, annulation, fermeture, sortie ;
- vert : navigation, Suivant, Précédent, Continuer, Commencer l'évaluation, Terminer le parcours ;
- orange : calculatrice ;
- bleu : toutes les autres actions fonctionnelles.

La même règle s'applique dans la barre Administrateur et dans Kalonéo.

## 6. Blocs

Les mises en page autorisées restent celles validées dans Kalonéo :

- pleine largeur ;
- 50/50 ;
- 40/60 ;
- 60/40 ;
- orientation horizontale ou verticale selon le modèle ;
- un bloc principal peut contenir un niveau de sous-blocs ;
- aucun sous-bloc dans un sous-bloc.

Un sous-bloc ne peut jamais agrandir son parent.

## 7. Images dans un bloc

Règle non contournable :

- le bloc ne change pas de taille pour l'image ;
- le texte conserve son espace et sa lisibilité ;
- l'image utilise uniquement l'espace restant ;
- si elle tient à sa taille réelle, elle n'est pas redimensionnée ;
- elle n'est jamais agrandie au-delà de sa taille réelle ;
- si nécessaire, elle est réduite proportionnellement ;
- aucun étirement, écrasement ou recadrage ;
- le ratio largeur/hauteur est toujours conservé ;
- si l'image devient trop petite pour rester exploitable, Kalonéo bloque la validation.

Si le texte seul déborde du bloc, Kalonéo bloque également la validation.

## 8. Audio et vidéo dans un test

Le lecteur audio de la dictée Build #20 sert de modèle de comportement.

Un média intégré dans un test peut proposer :

- Lire / Reprendre ;
- Pause ;
- Stop ;
- Recommencer ;
- progression ;
- temps courant / durée ;
- compteur de lectures si le test le demande.

Le lecteur vidéo suit le même principe visuel et fonctionnel.

Les médias conservent toujours leur ratio et ne sont jamais déformés.

## 9. Transitions

`Transition` est une section disponible dans Kalonéo.

Une transition est un élément de parcours, pas un exercice noté. Elle peut être placée librement entre deux tests.

Elle peut utiliser texte, image, audio et vidéo avec les mêmes blocs que les tests.

Deux modes :

- **manuel** : bouton Suivant vert ;
- **automatique** : principalement pour les médias ; démarrage automatique, aucun bouton candidat, passage à l'élément suivant lorsque le média est terminé.

Une transition :

- n'alimente jamais Résultats ou Bilan ;
- n'a aucun score ;
- n'a aucun abandon d'exercice ;
- est enregistrée dans le parcours figé et dans la reprise de session.

Après interruption pendant une transition automatique, le média recommence depuis le début.

## 10. Erreur de média de transition

Le candidat ne peut pas contourner seul une transition en erreur.

SEB EvalPro affiche un message demandant de prévenir le moniteur du plateau.

Le moniteur peut ouvrir le secours Administrateur avec le code `SVG56`, insensible à la casse, puis :

- réessayer le média ;
- passer à la page suivante.

Le contournement est enregistré dans l'historique / Replay.

## 11. Médias locaux

Tout média est embarqué localement dans le contenu exporté.

Aucun test validé ne dépend d'une URL Internet, d'un fichier du Bureau ou d'un chemin externe.

Formats communs Windows/Linux retenus par le contrat :

- vidéo : WebM, VP8 ou VP9, audio Opus ou Vorbis ;
- audio : MP3, WAV PCM, OGG Opus/Vorbis, WebM Opus/Vorbis, FLAC.

Kalonéo vérifie le conteneur et le codec réel, pas seulement l'extension.

Limites applicatives :

- avertissement à partir de 250 Mo pour un média ;
- maximum 500 Mo par média ;
- maximum 1 Go par paquet complet.

## 12. Compatibilité Kalonéo → SEB EvalPro

Chaque paquet déclare au minimum :

- version du format KALTEST ;
- version du builder Kalonéo ;
- version minimale de SEB EvalPro ;
- liste des fonctions requises ;
- identifiant et version du test.

SEB EvalPro refuse avant installation tout paquet qui réclame une version ou une fonction qu'il ne sait pas exécuter.

Un parcours ne démarre pas si un seul de ses éléments n'est pas intégralement compatible.

Les anciens tests validés restent lisibles par les versions plus récentes de SEB EvalPro.

## 13. CI commune

À chaque modification de Kalonéo, la CI vérifie si la version courante de SEB EvalPro sait toujours lire et reproduire tout ce que Kalonéo peut produire.

- si SEB n'a pas besoin d'être modifié, son numéro de version reste inchangé ;
- si SEB doit être adapté, la publication est bloquée jusqu'à la correction et SEB change alors de version.

Les anciennes fixtures KALTEST restent dans la CI afin d'assurer la compatibilité historique.

## 14. Import / export

SEB EvalPro peut importer en lot les tests depuis un dossier, un disque ou une clé USB, sans mot de passe.

Les parcours peuvent être exportés et importés en lot de la même manière.

Un parcours exporté est autonome et embarque les versions exactes des tests et ressources nécessaires.

## 15. Mise à jour non destructive

Une mise à jour de SEB EvalPro ou Kalonéo ne doit jamais supprimer, réinitialiser ni écraser :

- candidats ;
- évaluations ;
- historiques ;
- Replay ;
- bilans ;
- parcours existants ;
- tests existants ;
- versions historiques encore utilisées.

Les contenus prédéfinis fournis avec une mise à jour sont ajoutés uniquement s'ils manquent.

Une version existante n'est jamais écrasée. Un même identifiant + même version + contenu différent est traité comme conflit et n'est pas remplacé silencieusement.
