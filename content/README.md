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

`content:generate` produit les JSON Foundry déterministes dans `build/content-source`. `content:build` utilise l’outil officiel Foundry pour compiler 25 compendiums dans `build/content-packs`. En v0.9.0, les 24 packs Item contiennent toujours 5 100 Items : 207 de Création, 4 132 de Progression et 761 de Matériel. Un vingt-cinquième pack contient 26 Journaux encyclopédiques, dérivés sans nouvelle source parallèle des 26 Ascendances sélectionnables. Les 28 documents d’Ascendance comprennent deux groupes non sélectionnables et 26 Ascendances jouables, dont les huit parentés Demi-Beastkins. Les 12 Voies portent une description développée et leurs PV par niveau structurés. Les 84 Spécialisations référencent chacune 32 Talents générés depuis un catalogue compact contrôlé : deux choix à chacun des seize paliers canoniques. Cette source compacte évite 2 688 fichiers de saisie sur Git tout en produisant 2 688 Items Foundry aux identifiants stables. Les dossiers sources et les dossiers internes Foundry sont générés depuis la même classification stable.

Les Talents actifs possédés sont projetés dans les Actions sans création d’un second Item. Les passifs emploient uniquement leurs éléments de règle structurés. L’attribution effective aux Actors appartient à 10-D3/10-D4 et l’exécution de combat à 10-F.

## Aliases et questionnaire

`aliases.json` conserve les anciens identifiants sans jamais les réémettre. `crystal-attunement.json` fixe la nomenclature et le contrat du questionnaire d’accord des Cœurs d’Écarlithe : banque de 48 situations et tirage stable de 20 par Cœur. 10-K2-P fournit les vrais Items, l’interface et les compendiums ; l’activation et la surcharge au Prana appartiennent toujours à 10-F.
