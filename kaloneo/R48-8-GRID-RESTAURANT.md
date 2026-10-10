# R48.8 — largeurs régulières du tableau du Restaurant

Capture du Builder du 10 octobre 2026 : toutes les colonnes ont le champ `caractères` vide (la dernière indique `Reste`). Le rendu vrai candidat produit néanmoins des colonnes irrégulières et un défilement horizontal, masquant Vendredi. La cause est `table-layout:auto` : le navigateur dimensionne les colonnes selon les largeurs intrinsèques des différentes options du `select`.

Correction sans changer les données : pour les tableaux Builder compacts à 5 colonnes ou plus, sans taille personnalisée ni fusion de cellules, affecter un `colgroup` à répartition stable (première colonne libellés 12 %, autres colonnes de largeur égale) et un `table-layout:fixed`. Ajuster les contrôles à leur cellule sans recadrage. Dès qu'une largeur de colonne est définie dans le Builder, le comportement de largeur personnalisée est conservé. Ne jamais supprimer ni transformer les 15 menus ni leurs choix.

Protection : aucune modification du Restaurant V1, des questions, des images, des corrections, de l'aperçu 1366×768 ou du bouton Fermer R48.7. Le mini-aperçu continuera à présenter une photographie exacte du vrai candidat.

Test réel Electron sur la grille Restaurant : six en-têtes, Vendredi visible, égalité des cinq journées au pixel près, quinze listes déroulantes, aucun débordement horizontal, aucune liste tronquée, fermeture de l'aperçu et sauvegarde candidat nulle. Si ce contrôle échoue, ne pas publier la version.
