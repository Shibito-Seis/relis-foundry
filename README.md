# RE:LIS — RE: Lost in Space pour Foundry VTT

Premier socle technique du système `relis`, ciblé sur Foundry VTT 14.365 et The Forge.

La version `0.2.0` ouvre l’étape 10-D avec le socle d’interface 10-D1. Elle conserve
la tranche verticale validée de 10-C et ajoute une coque Personnage/PNJ inspirée des
anciennes cartes d’identité RE:LIS : bandeau ID, ressources visibles, huit onglets
Personnage, six onglets PNJ, navigation clavier et comportement responsive.

Les panneaux qui dépendent des modèles métier des lots 10-D2 à 10-D6 sont annoncés
comme tels et n’enregistrent aucune donnée fictive. Les visuels fonctionnels restent
réalisés en CSS et en SVG interne jusqu’à la passe graphique finale.

## Développement

Prérequis : Node.js 22 ou plus récent.

```bash
npm ci
npm test
npm run package
```

L’archive installable est créée sous `build/relis-v0.2.0.zip`. Son `system.json` se
trouve à la racine de l’archive, conformément au paquet téléchargé par Foundry. Le
paquet exclut les tests, les outils et les dépendances de développement ; il conserve
la source map du bundle afin que les erreurs de la recette distante soient traçables.

## Licence

Tous droits réservés — voir `LICENSE`. La visibilité publique du dépôt n’autorise
pas la réutilisation du code, du contenu ou des médias.
