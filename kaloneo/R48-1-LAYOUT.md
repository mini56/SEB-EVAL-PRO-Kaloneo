# R48.1 — amélioration de l'éditeur des tableaux et des textes

Branche expérimentale `test-builder-r48-1-editor-columns`. La version R47 et la Release R48 restent inchangées.

- Dans la grille de conception : liste de sélection « Colonne 1...n » + boutons précédent/suivant. Chaque cellule reste dans la définition du tableau ; une seule colonne à la fois occupe toute la largeur de l'éditeur.
- Dans « Style du bloc » pour un bloc Texte : alignement gauche / centré / droite, interligne standard / compact (1) / normal (1.2) / aéré (1.5) / large (1.8).
- Dans le rendu candidat et l'aperçu Electron : le dernier bloc textuel dans une colonne occupe automatiquement la hauteur restante. L'image de fond continue à être ancrée en bas à droite.
- Les questions, réponses, barèmes et éléments pédagogiques ne sont pas modifiés.

Test à réaliser dans Electron en 1366 × 768 : charger le Restaurant R48, modifier le 6e jour / une cellule du tableau, tester alignement et interligne, ouvrir la vraie page, contrôler les 15 listes déroulantes et l'absence de débordement.
