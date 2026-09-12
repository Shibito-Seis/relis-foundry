# Publication initiale sur GitHub et The Forge

## 1. Créer le dépôt

Sur le compte `Shibito-Seis`, créer un dépôt public vide nommé `relis-foundry`, avec
la branche principale `main`. Ne pas ajouter de licence automatique : le fichier
`LICENSE` du projet contient la politique « Tous droits réservés ».

Déposer ensuite l’intégralité du contenu du dossier `relis-foundry` à la racine du
dépôt. Le fichier `system.json` doit donc être directement visible à cette adresse :

`https://github.com/Shibito-Seis/relis-foundry/blob/main/system.json`

## 2. Laisser GitHub vérifier le paquet

L’onglet Actions doit exécuter le workflow `Qualité`. Il vérifie TypeScript, le
formatage, les tests unitaires, le build et le manifeste.

## 3. Créer ou actualiser une Release

Dans `Actions`, ouvrir `Publier une Release Foundry`, choisir `Run workflow`, saisir
le tag correspondant exactement au manifeste, puis lancer. Pour la recette corrective,
utiliser `v0.3.6`. Le workflow construit `relis-v0.3.6.zip`, crée le tag et la
Release, puis y joint l’archive.

Ne pas créer manuellement une archive différente : le ZIP automatisé garantit que
`system.json` se trouve à sa racine et que les sources de développement ne sont pas
livrées à Foundry.

## 4. Installer sur The Forge

Utiliser l’URL de manifeste suivante dans le gestionnaire de systèmes :

`https://raw.githubusercontent.com/Shibito-Seis/relis-foundry/main/system.json`

Le manifeste téléchargera alors :

`https://github.com/Shibito-Seis/relis-foundry/releases/download/v0.3.6/relis-v0.3.6.zip`

## 5. Recette 10-E1-P

1. Créer un monde avec le système `RE:LIS — RE: Lost in Space`.
2. Ouvrir la console du navigateur et vérifier l’absence d’erreur rouge `relis`.
3. Ouvrir l’ancien Personnage de recette 10-C et confirmer sa conservation.
4. Ouvrir son Action et son Équipement techniques, puis contrôler leurs nouveaux
   blocs communs sans perte des champs de démonstration.
5. Créer une source `Équipement`, renseigner ses traits et valeurs de catalogue.
6. Déposer cette source sur le Personnage deux fois et vérifier deux identifiants
   `WLD-ITM-*` distincts avec la même référence de source.
7. Modifier un exemplaire et confirmer le badge `Modifié`, sans changement sur
   la source ni sur le second exemplaire.
8. Supprimer ou rendre inaccessible la source et confirmer que l’exemplaire reste
   lisible, jouable et signalé `Source absente`.
9. Vérifier les unités, l’état, l’usure et les totaux physiques d’un objet matériel.
10. Créer une Ascendance vide et vérifier l’absence de bloc physique.
11. Actualiser le navigateur et confirmer la persistance de la migration.
12. Signaler la version Foundry affichée, les erreurs de console et l’étape exacte
    du premier échec éventuel.
