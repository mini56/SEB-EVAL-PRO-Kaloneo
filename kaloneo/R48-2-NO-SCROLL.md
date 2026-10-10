# R48.2 — Supprimer les scrollbars artificielles (Restaurant)

Branche d'essai issue de R48.1, sans modification de Restaurant V1, R47, R48 ou R48.1.

Constat utilisateur : dans l'aperçu Electron 1366×768, le planning affiche une scrollbar interne et la colonne gauche une deuxième scrollbar après agrandissement automatique du bloc Indications.

Cause : les grilles en colonne flex pouvaient rétrécir (flex-shrink:1) sous la hauteur naturelle du tableau. La grille utilisait overflow:auto. Le scroll du planning se propageait à la colonne.

Correctif moteur (aperçu Electron et runtime candidat) : empêcher la compression verticale de la grille, laisser le dernier bloc absorber la hauteur restante, garder l'accès au contenu si une page devient réellement trop volumineuse (ne jamais masquer une partie du test).

Le texte, les images et les questions n'ont pas été modifiés.

Test automatisé à 1366×768 : charger Restaurant via le bouton R48, appliquer un interligne aéré de 1,5, ouvrir l'aperçu Electron, vérifier 15 listes déroulantes, absence de dépassement dans le tableau et les deux colonnes, et alignement du bas du bloc Indications.
