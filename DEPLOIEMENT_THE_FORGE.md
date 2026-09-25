# Publication sur GitHub et The Forge

## Mise à jour 0.8.3 depuis le navigateur uniquement

Cette procédure part du dépôt `main` contenant déjà la v0.8.2. Utiliser un
Codespace, qui reste entièrement dans le navigateur et évite les limites du
glisser-déposer GitHub :

1. Sur la page du dépôt, choisir **Code → Codespaces → Create codespace on main**.
2. Dans l’explorateur du Codespace, téléverser
   `relis-foundry-update-v0.8.3.zip` à la racine du dépôt.
3. Ouvrir le terminal intégré et vérifier la cible avec `git rev-parse --show-toplevel`
   puis `git status --short`.
4. Décompresser la mise à jour dans un répertoire temporaire avec
   `mkdir -p /tmp/relis-update-083 && unzip -q relis-foundry-update-v0.8.3.zip -d /tmp/relis-update-083`.
5. Copier la racine fournie sur le dépôt avec
   `rsync -a /tmp/relis-update-083/relis-foundry/ ./`.
6. Supprimer seulement l’archive téléversée avec
   `rm relis-foundry-update-v0.8.3.zip`, puis contrôler `git status --short`.
7. Exécuter `npm ci && npm test`, puis `git add -A`,
   `git commit -m "Release 0.8.3 - lignées Demi-Beastkins"` et `git push origin main`.

L’archive update contient uniquement la différence entre les sources v0.8.2 et
v0.8.3, sous la racine `relis-foundry/`. Cette procédure évite les erreurs HTTP
400/429 du téléversement fichier par fichier.

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
utiliser `v0.8.3`. Le workflow construit `relis-v0.8.3.zip`, crée le tag et la
Release, puis y joint l’archive.

Ne pas créer manuellement une archive différente : le ZIP automatisé garantit que
`system.json` se trouve à sa racine et que les sources de développement ne sont pas
livrées à Foundry.

## 4. Installer sur The Forge

Utiliser l’URL de manifeste suivante dans le gestionnaire de systèmes :

`https://raw.githubusercontent.com/Shibito-Seis/relis-foundry/main/system.json`

Le manifeste téléchargera alors :

`https://github.com/Shibito-Seis/relis-foundry/releases/download/v0.8.3/relis-v0.8.3.zip`

## 5. Recette 10-K2-P

1. Créer un monde avec le système `RE:LIS — RE: Lost in Space`.
2. Ouvrir la console du navigateur et vérifier l’absence d’erreur rouge `relis`.
3. Ouvrir l’ancien Personnage de recette 10-C et confirmer sa conservation.
4. Suivre la recette `RE-LIS_Recette10_K2-P_v0.8.3.md` fournie avec les
   livrables de développement.
5. Vérifier le chargement, la version, la conservation des inventaires et la présence des 23 compendiums regroupés dans Création, Progression et Matériel. Le pipeline, les comptes et les références strictes sont contrôlés par GitHub Actions.
6. Actualiser le navigateur et confirmer la persistance. Le schéma reste 7 et aucune migration de monde n’est ajoutée. Effectuer la recette seul ; ne solliciter aucun autre participant avant la procédure finale.
7. Signaler la version Foundry affichée, les erreurs de console et l’étape exacte
   du premier échec éventuel.

## Recette 0.8.3

Arrêter le monde avant de remplacer le système, puis le relancer après installation. Vérifier 0.8.3 dans le manifeste et les pieds de fiches Actor et Item. Conserver une sauvegarde du monde. L’archive update conserve la racine relis-foundry/ et contient uniquement les fichiers modifiés depuis la v0.8.2 ; l’archive installable construite par GitHub Actions a `system.json` à sa racine. Le schéma reste 7 et aucune migration n’est déclenchée. Ne pas utiliser un remplacement global de version sur package-lock.json.

Exécuter `RE-LIS_Recette10_K2-P_v0.8.3.md`, bloc A d’abord. Recette seul en MJ, aucune invitation d’un autre utilisateur et aucun contrôle visuel automatisé par navigateur. La clôture de 10-K2-P attend la validation explicite.
