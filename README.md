# RE:LIS — RE: Lost in Space pour Foundry VTT

Premier socle technique du système `relis`, ciblé sur Foundry VTT 14.365 et The Forge.

La version `0.3.1` corrige et reprend 10-E1-P : les 26 types d’Items partagent
un noyau persistant de catalogue, références, versions et provenance. Les sept
familles matérielles reçoivent en plus quantité, unité, masse, volume,
encombrement, état, usure, charges et identification. La migration depuis 0.2.4
est additive et conserve les Items techniques de 10-C.

La fiche commune n’affiche que les champs applicables au type. Les traits sont
choisis dans le vocabulaire canonique par sélection multiple, la description
utilise l’éditeur riche de Foundry et le portrait ouvre son sélecteur d’image.
La version 0.3.0 est rejetée car ses mises à jour partielles pouvaient effacer
les autres champs d’un Item.

Les opérations de conteneur, transferts, équipement, assistants, Garde-Robe et
dossiers restent réservées aux lots suivants. Aucun catalogue fictif ni contenu
canonique n’est livré par 10-E1-P. Les visuels fonctionnels restent réalisés en
CSS et en SVG interne jusqu’à la passe graphique finale.

## Développement

Prérequis : Node.js 22 ou plus récent.

```bash
npm ci
npm test
npm run package
```

L’archive installable est créée sous `build/relis-v0.3.1.zip`. Son `system.json` se
trouve à la racine de l’archive, conformément au paquet téléchargé par Foundry. Le
paquet exclut les tests, les outils et les dépendances de développement ; il conserve
la source map du bundle afin que les erreurs de la recette distante soient traçables.

## Licence

Tous droits réservés — voir `LICENSE`. La visibilité publique du dépôt n’autorise
pas la réutilisation du code, du contenu ou des médias.
