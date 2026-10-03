# KALONÉO / SEB EvalPro — Référence CSS validée

Statut : **référence anti-régression**  
Date de capture : **1er octobre 2026**

Ce document complète `KALONEO-DECISIONS-VALIDEES.md`.

Toute modification volontaire de la charte commune doit mettre à jour cette référence. Un nettoyage ou une refactorisation ne doit pas modifier silencieusement ces règles.

## 1. Fichiers CSS canoniques

### Design system commun

`seb-evalpro/source/css/seb-design-system.css`

Blob Git de référence :

`5bf6e1bc266c5ce4a5ce072da5c864dfe4b2e524`

### Rendu PILOTE #2

`seb-evalpro/source/css/kaltest-pilot2.css`

Blob Git de référence :

`fa00c1300259049558eb2c33ed1ace0a147f79c3`

Le premier fichier définit la charte commune. Le second constitue la référence actuelle du rendu des pages KALTEST PILOTE #2 et ne doit pas être confondu avec une obligation universelle lorsque sa valeur est spécifique au pilote.

## 2. Variables du design system commun

```css
--seb-blue-100: #004E70;
--seb-blue-80: #356787;
--seb-blue-65: #5D7E9B;
--seb-blue-50: #8398B0;
--seb-blue-25: #C1C9D6;

--seb-orange-100: #F9B233;
--seb-orange-80: #FBC263;
--seb-orange-65: #FDCE84;
--seb-orange-50: #FED9A2;
--seb-orange-25: #FFECD2;

--seb-green: #198754;
--seb-red: #C62828;

--seb-font-main: "Calibri", "Segoe UI", Arial, sans-serif;
--seb-font-light: "Calibri Light", "Calibri", "Segoe UI", Arial, sans-serif;

--seb-page-background: linear-gradient(to bottom, #ffffff, #ebeef5);
--seb-card-radius: 12px;
--seb-card-shadow: 0 4px 14px rgba(0, 0, 0, .15);
--seb-control-radius: 10px;
```

## 3. Titres

- `h1`, `h2`, `.seb-page-title`, `.seb-section-title` utilisent la police légère ;
- `font-weight: 300`.

## 4. Cartes

Référence `.seb-card` :

- fond : `rgba(255,255,255,.88)` ;
- rayon : `12px` ;
- ombre : `0 4px 14px rgba(0,0,0,.15)` ;
- flou arrière-plan : `4px`.

## 5. Boutons Crystal

Référence `.seb-action-btn` :

- hauteur minimale : `42px` ;
- padding : `10px 20px` ;
- bordure : `1.5px solid` ;
- rayon : `10px` ;
- taille de police : `16px` ;
- graisse : `700` ;
- interstice icône/texte : `7px` ;
- fond Crystal : dégradé clair ;
- ombre extérieure et reflet intérieur ;
- transition : `.15s`.

États :

- survol : déplacement vertical `-1px` et ombre renforcée ;
- appui : déplacement `+1px` et ombre réduite ;
- focus clavier : contour `2px`, offset `3px` ;
- désactivé : opacité `.45`, curseur normal, aucun déplacement.

Couleur par rôle :

- fonctionnel / confirmation / outil : bleu ;
- navigation : vert ;
- calculatrice : orange ;
- danger : rouge.

### Chronomètre commun KALONÉO

Le chronomètre utilise la géométrie, les ombres, le focus et les états du bouton Crystal commun.

- **Démarrer** : bouton plein vert `#198754`, texte blanc ;
- **Arrêter** : bouton plein rouge `#C62828`, texte blanc ;
- le bouton indisponible conserve sa couleur de rôle avec une opacité réduite ;
- le libellé commun est **« Arrêter »**, et non « Stop ».

Cette règle s’applique à la page d’accueil / prise en main, à LEGO / Briques et à tout futur exercice utilisant le chronomètre commun.

## 6. Champs

Pour texte, nombre, mot de passe, date, select et textarea :

- bordure : `1px solid #8398B0` ;
- rayon : `8px` ;
- fond blanc.

Focus :

- bordure `#004E70` ;
- halo `0 0 0 3px rgba(0,78,112,.12)`.

## 7. Images et vidéos

Référence commune :

- `width: auto` ;
- `height: auto` ;
- `max-width: 100%` ;
- hauteur maximale limitée à l’espace disponible ;
- `object-fit: contain`.

Aucun étirement ni recadrage automatique.

## 8. Tableaux

Référence `.seb-table` :

- largeur `100%` ;
- bordure `1px solid #8398B0` ;
- rayon `10px` ;
- en-tête bleu `#004E70` avec texte blanc ;
- ligne/zone secondaire `#C1C9D6`.

## 9. Référence PILOTE #2 — écran sans scroll

Le rendu PILOTE #2 actuellement validé utilise :

```css
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}
```

Shell :

- padding normal : `24px 34px` ;
- hauteur et largeur : `100%`.

Sous `760px` de hauteur :

- padding du shell : `14px 24px` ;
- réduction des espacements et tailles de tableaux/contenus afin de conserver la page sans scroll.

Sous `1100px` de largeur :

- grille identité : 2 colonnes ;
- mise en page simple de l’exercice : 2 colonnes égales.

## 10. Référence PILOTE #2 — en-tête

- gap : `24px` ;
- titre : `28px`, bleu `#004E70` ;
- sous-titre : `17px` ;
- logo : hauteur `74px`, largeur auto, max-width `360px`.

## 11. Référence PILOTE #2 — Scénario / Consignes

Zone de contexte :

- grille 2 colonnes égales ;
- gap : `12px` ;
- hauteur minimale : `72px` ;
- padding : `10px 14px`.

Icône :

- `45px × 45px` ;
- `object-fit: contain`.

Sous `760px` de hauteur :

- hauteur minimale : `60px` ;
- icône : `38px × 38px`.

## 12. Référence PILOTE #2 — Exercice

Zone principale :

- `flex: 1 1 auto` ;
- `min-height: 0` ;
- `overflow: hidden` ;
- padding : `10px 12px`.

Ratios :

- 50/50 : `1fr 1fr` ;
- 40/60 : `.8fr 1.2fr` ;
- 60/40 : `1.2fr .8fr`.

## 13. Référence PILOTE #2 — éléments spécifiques

Tableaux KALTEST :

- bordure `#8398B0` ;
- rayon `10px` ;
- en-tête bleu `#004E70` ;
- cellules blanches translucides ;
- séparateurs `#C1C9D6`.

Banque de mots :

- max `760px` ;
- 3 colonnes ;
- bordure `#8398B0` ;
- rayon `10px`.

Choix :

- survol `#FFECD2` ;
- sélection `#F9B233` avec texte foncé et gras.

## 14. Règle anti-régression CSS

Une modification d’un des deux fichiers CSS de référence doit être considérée comme une modification fonctionnelle/visuelle à examiner.

Elle ne doit jamais être introduite comme simple « nettoyage » si elle modifie :

- les dimensions ;
- les couleurs ;
- les polices ;
- les espacements ;
- les arrondis ;
- les ombres ;
- les états des contrôles ;
- le comportement sans scroll ;
- le ratio ou le dimensionnement des médias ;
- le rendu des tableaux ;
- la géométrie des boutons.

Toute évolution volontaire doit être documentée dans le registre des décisions et accompagnée des contrôles visuels/CI appropriés.

## 15. Priorité fonctionnelle — rendu candidat Build #20

**Statut : VALIDÉ**

Les valeurs CSS du PILOTE #2 servent de référence technique pour le pilote, mais elles ne doivent pas remplacer silencieusement l’interface candidat réelle du **Build #20**.

La référence fonctionnelle prioritaire impose :

- pages candidat sans scroll ni débordement dans les conditions prévues ;
- conservation de la géométrie et du comportement des composants existants lorsque le test migré les utilise ;
- calculatrice flottante identique au composant Build #20 lorsqu’elle est activée ;
- mécanisme d’abandon et barre Administrateur conservés ;
- Scénario / Consignes et leurs icônes reproduits conformément au modèle validé ;
- prévisualisation KALONÉO et rendu SEB EvalPro équivalents.

Une règle CSS spécifique au PILOTE #2 ne devient pas automatiquement une règle universelle du produit. Si elle modifie le rendu Build #20, elle doit être explicitement validée comme évolution avant généralisation.

## 16. Médias communs — principe de rendu

**Statut : VALIDÉ POUR LE PRINCIPE**

- l’audio intégré utilise comme référence le lecteur de Dictée du Build #20 ;
- la vidéo suit le même principe de composant commun ;
- les médias restent contenus dans leur zone, sans déformation ni débordement ;
- seuls les médias compatibles avec le lecteur retenu sous Windows et Linux peuvent être validés ;
- aucun exercice ne doit recréer localement un lecteur concurrent lorsque le composant commun peut être utilisé.

Les codecs exacts et limites de taille restent définis dans le registre principal comme éléments à confirmer.

