# R48.10 — Colonnes automatiques identiques, règle du Builder

Base : R48.7 avec miniature fidèle et fermeture plein écran. R48.8/R48.9 ne sont pas des fondations.

Dans un bloc tableau du Test Builder : si toutes les colonnes ont le champ de largeur vide, elles doivent se répartir le même espace. Restaurant = 6 colonnes de 1/6 chacune. Si une colonne reçoit une largeur personnalisée en caractères, la répartition automatique ne s'applique plus et les largeurs manuelles restent prioritaires. Mise en page sans bordures et tableaux à cellules fusionnées restent inchangés.

La règle est générale, **sans condition sur le nom ou l'identifiant du test**. Elle est appliquée dans l'éditeur, l'ancien aperçu et le moteur candidat réel (source de la miniature). Aucun changement aux 15 réponses ni aux images.

Smoke Electron : même Restaurant avec ID fictif `generic_builder_six_column_grid_smoke`, 6 colonnes égales, Vendredi visible, aucun scroll horizontal, aucun select tronqué ; puis réglage manuel de 12 caractères avec la classe de répartition égale absente. Vérification fermeture par bouton et Échap, aucune sauvegarde des réponses, régressions historiques.
