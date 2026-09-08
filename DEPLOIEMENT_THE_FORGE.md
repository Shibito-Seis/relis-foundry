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
utiliser `v0.1.1`. Le workflow construit `relis-v0.1.1.zip`, crée le tag et la
Release, puis y joint l’archive.

Ne pas créer manuellement une archive différente : le ZIP automatisé garantit que
`system.json` se trouve à sa racine et que les sources de développement ne sont pas
livrées à Foundry.

## 4. Installer sur The Forge

Utiliser l’URL de manifeste suivante dans le gestionnaire de systèmes :

`https://raw.githubusercontent.com/Shibito-Seis/relis-foundry/main/system.json`

Le manifeste téléchargera alors :

`https://github.com/Shibito-Seis/relis-foundry/releases/download/v0.1.1/relis-v0.1.1.zip`

## 5. Recette 10-C

1. Créer un monde avec le système `RE:LIS — RE: Lost in Space`.
2. Ouvrir la console du navigateur et vérifier l’absence d’erreur rouge `relis`.
3. Créer un Actor `character`, le nommer et rouvrir sa fiche.
4. Modifier Dextérité, Tir, PV et niveau ; fermer puis rouvrir la fiche.
5. Cliquer sur `Préparer la démonstration 10-C`.
6. Vérifier la présence d’un Équipement, d’une Action et d’une réserve de 3 CE.
7. Lancer l’Action ; vérifier le d20, le degré et la carte de Chat.
8. Vérifier que le coût retire 1 CE et qu’une réussite crée un effet temporaire.
9. Actualiser le navigateur ; vérifier que l’Actor, ses Items et la CE dépensée
   persistent.
10. Signaler la version Foundry affichée, les erreurs de console et l’étape exacte
    du premier échec éventuel.

Le champ `compatibility.verified` est volontairement absent de la v0.1.1. Il sera
ajouté seulement après cette recette réelle sur Foundry VTT 14.365 via The Forge.
