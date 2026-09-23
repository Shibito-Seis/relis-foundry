# 10-K1-P — Matrice de conformité du pipeline personnel v0.7.0

Base publique inspectée avant modification : `86f5bb5`, tag `v0.6.2`. Canon relu avant codage : Bible v160, contrat documentaire §75.19–75.23, Items §75.28–75.32, compendiums §75.44, version de contenu §84.68–84.71, import et références §84.101 et suivants, ordre révisé §28.5–30.3 et additif cristaux §84–88 ; roadmap révisée et manuel historique. La validation utilisateur de la recette 0.6.2 clôt 10-E4-P. 10-K1-P reste en recette jusqu’à validation explicite de la v0.7.0.

| Exigence canonique ou décision         | Implémentation v0.7.0                                                                                                                    | Contrôle automatisé                                           | Recette |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------- |
| Sources canoniques reconstructibles    | `content/personal`, manifeste versionné, une entrée JSON par Item, bases LevelDB jamais éditées comme source                             | `content:validate`, `personal-content.test.js`                | B       |
| Tous les domaines personnels préparés  | Packs Création, Progression et Matériel couvrant les 18 types utiles à K2-P et D3/D4                                                     | validation du manifeste et test de couverture                 | B       |
| Aucun faux contenu avant K2-P          | Répertoires sources vides et compilation qui ignore les familles vides                                                                   | test du manifeste canonique à zéro entrée ; inspection du ZIP | A/B     |
| Identifiant canonique souverain        | `relisId` obligatoire ; `_id` Foundry SHA-256 stable sur 16 caractères ; collisions bloquantes                                           | tests stabilité, unicité et injection                         | B       |
| Versions distinctes                    | format v1, `contentVersion` 1.0.0, paquet 0.7.0, règles 1.0.0 et schéma Item 7 séparés                                                   | `content:check`, tests et manifeste                           | A/B     |
| Métadonnées non divergentes            | `_id`, `_stats`, `ownership` et `system.meta` interdits en source puis injectés par le générateur                                        | test des champs réservés                                      | B       |
| Types et packs fermés                  | type personnel validé contre le pack ; chemins enfermés sous `content/personal`                                                          | tests d’erreur et validation CLI                              | B       |
| Aliases non réémis                     | table d’aliases versionnée ; origine unique, cible existante, motif et version obligatoires                                              | validation d’aliases                                          | B       |
| Références diagnostiquées              | parcours récursif des `RelisRef`; avertissement en K1-P, blocage `strictReferences` obligatoire avant clôture K2-P                       | test avertissement puis erreur stricte                        | B       |
| Génération déterministe                | tri par identifiant, sérialisation à clés stables, double génération comparée par empreinte                                              | `content:check`, test de génération                           | B       |
| Vrais packs Foundry                    | compilation LevelDB par `@foundryvtt/foundryvtt-cli` 3.0.4 ; intégration au ZIP seulement pour les familles non vides                    | test de compilation sur données locales supprimables          | B       |
| Nomenclature du cristal                | Écarlithe ; forme noire brute, Cœur incolore non accordé, même Cœur accordé                                                              | validation du contrat et tests                                | C       |
| Questionnaire déterministe             | six axes, huit situations, palette à une couleur par axe et départage explicite sans choix direct de couleur                             | validation des axes, couleurs, questions et départage         | C       |
| Permissions et persistance de l’accord | propriétaire ou MJ répond ; MJ répond pour PNJ, modifie directement ou réinitialise ; transfert sans remise à zéro ; historique conservé | test du contrat                                               | C       |
| Pas d’alignement ni bonus implicite    | couleur identitaire, sans CE, charge ou avantage mécanique ; Prana réservé à 10-F                                                        | test du contrat                                               | C       |
| Non-régressions 10-E4-P                | schéma 7 conservé, aucune migration, pipeline uniquement à la construction                                                               | suite existante complète                                      | A/D     |

## Frontières maintenues

- **10-K2-P** remplira toutes les sources personnelles, ajoutera les vrais compendiums au manifeste et réalisera l’interface du questionnaire sur le Cœur d’Écarlithe.
- **Audit P** passera les références personnelles en mode strict et vérifiera couverture, prérequis, gains, réserves, besoins et dotations.
- **10-D3/D4** consommeront les catalogues ; ils ne créeront ni Ascendance, Profil, Voie ou Talent de remplacement.
- **10-F** appliquera les dépenses de munitions, CE et Prana, les activations et les surcharges.
- Aucun contenu de test n’est livré. Les données utilisées pour compiler un pack de contrôle sont créées dans un répertoire temporaire puis supprimées.

## État

10-E4-P est clos. Le code de 10-K1-P est contrôlé localement, mais le lot demeure ouvert jusqu’à la recette explicite de la v0.7.0. Relire cette matrice et la Bible avant toute clôture ou ouverture de 10-K2-P.
