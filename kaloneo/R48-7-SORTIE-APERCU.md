# R48.7 — Sortie sûre de l'aperçu candidat en plein écran

Constat sur R48.6 (capture du 10/10/2026) : la miniature se rapproche de l'aperçu Electron mais le bouton « Fermer l'aperçu » est invisible. Le moteur candidat place en effet la barre interne de navigation dans une zone de hauteur nulle ; le bouton « kaltest-next », réutilisé par le mode aperçu, y disparaît.

Correctif expérimental :
- Ajouter exclusivement en aperçu interactif un bouton indépendant **✕ Fermer l'aperçu**, fixé en haut à droite, très visible et accessible avec le clavier.
- **Échap** est un raccourci de secours, réservé à l'aperçu administrateur (jamais au parcours candidat).
- Masquer la barre Admin lorsqu'on visualise un aperçu du moteur candidat : elle ne peut plus masquer le bouton ni fausser la capture.
- Le bouton appelle la fermeture autorisée du Builder via le bridge déjà existant et revient au brouillon ; un échec est affiché et le bouton est réactivé.
- Ne rien changer dans le parcours candidat, le score, la définition Restaurant ni le moteur graphique R48.6.
- La miniature créée hors écran n'inclut aucun bouton de sortie.

Validation automatisée en Electron : présence, position et clic effectif du nouveau bouton ; touche Échap ; images Restaurant et 15 listes ; aucune sauvegarde de candidat ; conservation des contrôles R48.6. Vérification visuelle humaine requise avant validation finale.
