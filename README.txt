ÉCHECS V1.2 CORRIGÉ

Bug racine corrigé :
script.js contenait une accolade fermante manquante dans la gestion des déplacements du roi.
Le navigateur arrêtait donc TOUT le JavaScript au chargement : solo, local, menus et multijoueur.

Corrections :
- erreur de syntaxe supprimée et contrôlée avec Node ;
- solo/local indépendants du chargement Firebase ;
- signature by twagirumukiza visible sur l'accueil ;
- fichiers Firebase conservés pour le multijoueur.

Firebase :
Activez Authentication > Anonymous et ajoutez chessRooms aux règles existantes sans supprimer les règles des autres jeux.
