# RE:LIS — RE: Lost in Space pour Foundry VTT

Premier socle technique du système `relis`, ciblé sur Foundry VTT 14.365 et The Forge.

La version `0.2.2` ouvre 10-D2 avec les modèles persistants communs aux Personnages
et PNJ. Elle conserve le socle d’interface validé de 10-D1 et ajoute identité,
âges, corps actif, Attributs, Compétences, santé, Stress, Fatigue, Surmenage,
Contrecoup, besoins, références et trois densités fonctionnelles de PNJ.

Les opérations qui dépendent des assistants, de la Garde-Robe, des Items et des
dossiers restent réservées aux lots 10-D3 à 10-F. Les visuels fonctionnels restent
réalisés en CSS et en SVG interne jusqu’à la passe graphique finale.

## Développement

Prérequis : Node.js 22 ou plus récent.

```bash
npm ci
npm test
npm run package
```

L’archive installable est créée sous `build/relis-v0.2.2.zip`. Son `system.json` se
trouve à la racine de l’archive, conformément au paquet téléchargé par Foundry. Le
paquet exclut les tests, les outils et les dépendances de développement ; il conserve
la source map du bundle afin que les erreurs de la recette distante soient traçables.

## Licence

Tous droits réservés — voir `LICENSE`. La visibilité publique du dépôt n’autorise
pas la réutilisation du code, du contenu ou des médias.
