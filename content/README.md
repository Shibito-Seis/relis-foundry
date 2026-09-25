# Pipeline de contenu RE:LIS

`content/personal` est la source de vérité versionnée des compendiums personnels. Les bases LevelDB Foundry sont des sorties de construction et ne doivent jamais être corrigées à la main.

## Contrat d’une entrée

Chaque Item canonique occupe un fichier JSON nommé exactement `<relisId>.json` dans la famille de pack appropriée. Il respecte `content/schemas/personal-item.schema.json` et contient au minimum :

- `relisId`, identifiant canonique déjà fixé par la Bible ;
- `name`, libellé français canonique ;
- `type`, parmi les types personnels autorisés par le pack ;
- `system`, données source de l’Item.

Le pipeline refuse `_id`, `_stats`, `ownership` et `system.meta` dans les sources. Il génère lui-même ces champs, dérive un `_id` Foundry stable depuis `relisId`, injecte les versions et trie les sorties par identifiant. Une correction de libellé ou de données conserve `relisId` et augmente `contentVersion`; un concept différent reçoit un autre identifiant.

Les références persistantes sont des objets `RelisRef` complets dans `system`. Depuis 10-K2-P, `strictReferences: true` bloque la construction dès qu’une cible canonique déclarée est absente. Une relation ambiguë reste descriptive au lieu d’être liée arbitrairement.

## Commandes

```bash
npm run content:validate
npm run content:generate
npm run content:build
npm run content:check
```

`content:generate` produit les JSON Foundry déterministes dans `build/content-source`. `content:build` utilise l’outil officiel Foundry pour compiler 23 compendiums dans `build/content-packs`. En 10-K2-P v0.8.3, ils contiennent 2 412 Items : 207 de Création, 1 444 de Progression et 761 de Matériel. Les 28 documents d’Ascendance comprennent deux groupes non sélectionnables et 26 Ascendances jouables, dont les huit parentés Demi-Beastkins. Les 12 Voies portent une description développée issue de la Bible ; les propositions concernant les 84 Spécialisations restent dans un rapport séparé jusqu’à validation. Les dossiers sources et les dossiers internes Foundry sont générés depuis la même classification stable.

## Aliases et questionnaire

`aliases.json` conserve les anciens identifiants sans jamais les réémettre. `crystal-attunement.json` fixe la nomenclature et le contrat du questionnaire d’accord des Cœurs d’Écarlithe : banque de 48 situations et tirage stable de 20 par Cœur. 10-K2-P fournit les vrais Items, l’interface et les compendiums ; l’activation et la surcharge au Prana appartiennent toujours à 10-F.
