# R48.4 — Aperçu Electron fidèle au candidat

Les R47/R48/R48.1/R48.2 sont conservées sans modification. La branche R48.4 reprend aussi les libellés de bibliothèque de R48.3.

## Défaut constaté
L'aperçu Builder `kaloneo-builder/test-preview.html` utilisait un renderer séparé du candidat. Les deux pouvaient diverger même sur un même test Restaurant.

## Correction
- Le bouton « Voir la vraie page dans Electron » charge `kaltest-pilot2.html?kaloneoPreview=1`.
- Le main Electron fournit au moteur candidat exactement la définition du test en cours dans le Builder (en mémoire seulement), sans passer par le parcours sélectionné.
- Le candidat réel et l'aperçu utilisent dorénavant la même page, le même CSS et le même runtime.
- Le mode d'aperçu commence sur l'exercice et affiche « Fermer l'aperçu », qui revient au Builder.
- L'aperçu est explicitement isolé de l'enregistrement, des résultats, des replays et du parcours réel.
- L'ancienne page d'aperçu interne est conservée pour les contrôles de compatibilité, elle n'est plus utilisée par le bouton principal.

## Tests
Smoke Electron du véritable moteur et de l'image Restaurant, 15 listes déroulantes, image plateau en fond, fermeture sans sauvegarde; maintient des anciennes régressions Electron. Le test original V1 et les questions restent intacts.
