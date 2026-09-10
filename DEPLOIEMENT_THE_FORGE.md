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
utiliser `v0.2.4`. Le workflow construit `relis-v0.2.4.zip`, crée le tag et la
Release, puis y joint l’archive.

Ne pas créer manuellement une archive différente : le ZIP automatisé garantit que
`system.json` se trouve à sa racine et que les sources de développement ne sont pas
livrées à Foundry.

## 4. Installer sur The Forge

Utiliser l’URL de manifeste suivante dans le gestionnaire de systèmes :

`https://raw.githubusercontent.com/Shibito-Seis/relis-foundry/main/system.json`

Le manifeste téléchargera alors :

`https://github.com/Shibito-Seis/relis-foundry/releases/download/v0.2.4/relis-v0.2.4.zip`

## 5. Recette 10-D1

1. Créer un monde avec le système `RE:LIS — RE: Lost in Space`.
2. Ouvrir la console du navigateur et vérifier l’absence d’erreur rouge `relis`.
3. Ouvrir le Personnage de recette 10-C et vérifier la nouvelle coque d’identité.
4. Parcourir les huit onglets à la souris puis avec Gauche, Droite, Début et Fin.
5. Vérifier que PV, énergies, effets et Items affichent les données persistantes.
6. Modifier une CE dans `Capacités & Énergies`, fermer puis rouvrir la fiche.
7. Relancer la démonstration 10-C depuis ce même onglet et contrôler le Chat.
8. Réduire la fiche et confirmer son défilement et l’accès aux huit onglets.
9. Créer un Actor `npc`, ouvrir ses six onglets et confirmer l’absence de faux scores.
10. Ouvrir la fiche avec un compte non propriétaire : navigation et consultation
    doivent rester possibles, tandis que les mutations et jets sont désactivés.
11. Actualiser le navigateur et confirmer la persistance des données existantes.
12. Signaler la version Foundry affichée, les erreurs de console et l’étape exacte
    du premier échec éventuel.
