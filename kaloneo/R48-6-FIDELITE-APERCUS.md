# R48.6 — unique référence d'affichage

Règle KALONÉO : la miniature et l'aperçu plein écran doivent utiliser exactement le même moteur candidat que le parcours réel. La miniature est une capture réduite du rendu KALTEST en viewport 1366×768, et non une grille CSS reconstruite. Chaque édition demande une nouvelle capture, et une image périmée est masquée pendant la mise à jour.

L'aperçu manuel utilise le vrai moteur candidat, ouvert en plein écran dans l'unique fenêtre principale. Le bouton « Fermer l'aperçu » restaure l'Admin / Test Builder avec le brouillon, sans changement d'état candidat.

Sécurité : seules les sessions administrateur sans candidat actif peuvent prévisualiser. Ni l'image réduite ni l'aperçu plein écran ne doivent enregistrer de résultats, ni de replays, ni modifier la dernière route candidat.

Débordements : la miniature montre les véritables erreurs au lieu de les corriger artificiellement. Un avertissement signale le scroll interne/tableau et les images manquantes. Les défauts spécifiques du Restaurant ne sont pas corrigés dans R48.6 : ils seront traités après validation de la fidélité de l'outil.

Protection : R48.4, la R47 historique et le Restaurant V1 original restent inchangés. Aucun test ni barème n'est migré automatiquement.

Vérification : smoke Electron réel sur le rendu candidat, 15 listes, images, viewport 1366×768 et capture hors écran, absence d'enregistrement, sortie du plein écran.
