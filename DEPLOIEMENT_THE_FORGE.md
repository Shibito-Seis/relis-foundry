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
le tag correspondant exactement au manifeste, puis lancer. Pour la recette 10-K2-P,
utiliser `v0.8.0`. Le workflow construit `relis-v0.8.0.zip`, crée le tag et la
Release, puis y joint l’archive.

Ne pas créer manuellement une archive différente : le ZIP automatisé garantit que
`system.json` se trouve à sa racine et que les sources de développement ne sont pas
livrées à Foundry.

## 4. Installer sur The Forge

Utiliser l’URL de manifeste suivante dans le gestionnaire de systèmes :

`https://raw.githubusercontent.com/Shibito-Seis/relis-foundry/main/system.json`

Le manifeste téléchargera alors :

`https://github.com/Shibito-Seis/relis-foundry/releases/download/v0.8.0/relis-v0.8.0.zip`

## 5. Recette 10-K2-P

1. Créer un monde avec le système `RE:LIS — RE: Lost in Space`.
2. Ouvrir la console du navigateur et vérifier l’absence d’erreur rouge `relis`.
3. Ouvrir l’ancien Personnage de recette 10-C et confirmer sa conservation.
4. Suivre la recette `RE-LIS_Recette10_K2-P_v0.8.0.md` fournie avec les
   livrables de développement.
5. Vérifier le chargement, la version, la conservation des inventaires et la présence des trois compendiums personnels. Le pipeline, les comptes et les références strictes sont contrôlés par GitHub Actions.
6. Actualiser le navigateur et confirmer la persistance. Le schéma reste 7 et aucune migration de monde n’est ajoutée. Effectuer la recette seul ; ne solliciter aucun autre participant avant la procédure finale.
7. Signaler la version Foundry affichée, les erreurs de console et l’étape exacte
   du premier échec éventuel.

## Recette 0.8.0

Arrêter le monde avant de remplacer le système, puis le relancer après installation. Vérifier 0.8.0 dans le manifeste et les pieds de fiches Actor et Item. Conserver une sauvegarde du monde. L’archive update conserve la racine relis-foundry/ et contient les fichiers modifiés depuis la base publique v0.7.0 ; l’archive installable a `system.json` à sa racine. Le schéma reste 7 et aucune migration n’est déclenchée. Ne pas utiliser un remplacement global de version sur package-lock.json.

Exécuter `RE-LIS_Recette10_K2-P_v0.8.0.md`, bloc A d’abord. Recette seul en MJ, aucune invitation d’un autre utilisateur et aucun contrôle visuel automatisé par navigateur. La clôture de 10-K2-P attend la validation explicite.
