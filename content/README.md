# Pipeline de contenu RE:LIS

`content/personal` est la source de vérité versionnée des futurs compendiums personnels. Les bases LevelDB Foundry sont des sorties de construction et ne doivent jamais être corrigées à la main.

## Contrat d’une entrée

Chaque Item canonique occupe un fichier JSON nommé exactement `<relisId>.json` dans la famille de pack appropriée. Il respecte `content/schemas/personal-item.schema.json` et contient au minimum :

- `relisId`, identifiant canonique déjà fixé par la Bible ;
- `name`, libellé français canonique ;
- `type`, parmi les types personnels autorisés par le pack ;
- `system`, données source de l’Item.

Le pipeline refuse `_id`, `_stats`, `ownership` et `system.meta` dans les sources. Il génère lui-même ces champs, dérive un `_id` Foundry stable depuis `relisId`, injecte les versions et trie les sorties par identifiant. Une correction de libellé ou de données conserve `relisId` et augmente `contentVersion`; un concept différent reçoit un autre identifiant.

Les références persistantes sont des objets `RelisRef` complets dans `system`. Les références personnelles non résolues sont des avertissements pendant 10-K1-P ; le manifeste passera à `strictReferences: true` avant la clôture de 10-K2-P et l’Audit P.

## Commandes

```bash
npm run content:validate
npm run content:generate
npm run content:build
npm run content:check
```

`content:generate` produit les JSON Foundry déterministes dans `build/content-source`. `content:build` utilise l’outil officiel Foundry pour compiler les familles non vides dans `build/content-packs`. En 10-K1-P, les trois familles restent volontairement vides : aucun faux contenu n’est livré.

## Aliases et questionnaire

`aliases.json` conserve les anciens identifiants sans jamais les réémettre. `crystal-attunement.json` fixe la nomenclature et le contrat du futur questionnaire d’accord des Cœurs d’Écarlithe. Les vrais Items, l’interface et les compendiums appartiennent à 10-K2-P ; l’activation et la surcharge au Prana appartiennent à 10-F.
