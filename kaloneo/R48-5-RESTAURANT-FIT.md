# R48.5 — fidélité Restaurant dans Electron et parcours candidat

Référence issue de R48.4, sans modifier la définition canonique V1 du Restaurant, les questions ou la correction.

Constat réel : affichage identique dans aperçu vrai candidat et parcours réel, mais la colonne Vendredi n'est plus visible, un scroll horizontal apparaît, et les dernières indications chevauchent l'image de fond.

Correctifs :
- La grille compacte de 5+ colonnes sans largeur imposée adopte un vrai tableau à largeur fixe répartie à l'intérieur du bloc. Les listes déroulantes sont dimensionnées par cellule.
- Les blocs texte avec image décorative en bas à droite réservent une silhouette invisible dans la zone d'illustration : l'enroulement du texte n'occulte plus le plateau.
- Rien n'est effacé ni masqué pour simuler une correction.
- Vérification Electron 1366x768 : vendredi entièrement affiché, aucun scroll horizontal, quinze menus fonctionnels, illustration non superposée et toutes les indications présentes.

Le réglage de couleur des cellules/colonnes du tableau reste une amélioration indépendante à traiter après validation visuelle.
