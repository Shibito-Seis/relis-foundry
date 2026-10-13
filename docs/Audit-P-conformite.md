# Audit P — Matrice de conformité de la verticale personnelle v0.8.4

Base exacte de travail : paquet 0.8.3 validé, Bible v166 et catalogues canoniques de 10-K2-P. L’audit ne crée aucun nouveau lot officiel : il vérifie et complète la verticale personnelle avant 10-D3. 10-K1-P et 10-K2-P sont validés et clos ; l’audit personnel reste en recette jusqu’à validation explicite de la v0.8.4.

## Inventaire produit

| Domaine     | Packs et types                                                                                                 |    Nombre |
| ----------- | -------------------------------------------------------------------------------------------------------------- | --------: |
| Création    | 6 packs : 28 documents d’Ascendance, 52 Profils, 48 Origines, 31 Atouts, 37 Handicaps, 11 Postes               |       207 |
| Progression | 11 packs : 12 Voies, 84 Spécialisations, 3 742 Talents, 42 Actions, 252 Pouvoirs                               |     4 132 |
| Matériel    | 7 packs : 111 Armes, 80 Armures, 147 Équipements, 267 Consommables, 66 Munitions, 62 Ressources, 28 Conteneurs |       761 |
| **Total**   | **24 compendiums et 18 types Item personnels**                                                                 | **5 100** |

Les 3 742 Talents comprennent les 1 054 entrées déjà publiées et **2 688 Talents de Spécialisation** ajoutés par l’audit : 84 catalogues × 32 Talents.

## Matrice canon → implémentation → contrôle → recette

| Exigence                   | Implémentation v0.8.4                                                                                                        | Contrôle automatisé                                                              | Recette |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- |
| Catalogues complets        | Chaque Spécialisation référence 32 Talents : deux aux niveaux 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21, 23, 25, 28 et 30    | 84 × 32, deux entrées exactes par palier, identifiants uniques                   | B       |
| Source exploitable sur Git | Un catalogue compact de 84 définitions génère 2 688 Items Foundry déterministes                                              | schéma JSON, double génération et empreinte stable                               | A/B     |
| Prérequis                  | Chaque Talent référence sa Spécialisation ; les deux chaînes A/B référencent leur palier précédent                           | références strictes et ordre des niveaux                                         | B       |
| Actions projetées          | Un Talent actif possédé reste l’unique Item et se projette dans les Actions                                                  | `automaticWhenOwned`, cible `actions`, `duplicateItem: false` et tests unitaires | C       |
| Passifs structurés         | Un Talent passif possède des `ruleElements`; aucune règle n’est extraite de sa description                                   | cible `passiveRules`, activation passive et tests unitaires                      | C       |
| Dotations fixes            | Les dotations automatiques restent séparées des choix ; la liste est vide faute de progression canonique explicite           | `automaticGrants: []` et politique de sélection contrôlée                        | B       |
| PV de Voie                 | Channeler 6 ; sept Voies à 8 ; Bretteur, Soldat et Explorateur 10 ; Briseur 12                                               | table exacte des douze Voies                                                     | D       |
| Ressources d’Ascendance    | PV naturels et profils Mana/Prana/Flux structurés ; valeurs naturelles, apprises et bonus restent séparées                   | profils complets des Ascendances sélectionnables                                 | D       |
| Héritages mixtes           | Deux dominances énergétiques ; un Demi-Beastkin humain a 10 PV, une dominance Beastkin reprend les PV du parent exact        | huit parentés et références parentales contrôlées                                | D       |
| Frontière de création      | 10-D3/10-D4 attribuent les choix et les Items aux Actors ; le catalogue ne modifie aucun Actor existant                      | absence de migration et contrat `attributionLot`                                 | E       |
| Frontière de combat        | 10-F exécute les attaques, coûts, durées et effets ; l’audit ne simule aucun combat                                          | contrat `combatExecutionLot`                                                     | E       |
| Schéma et données          | Paquet 0.8.4, contenu 1.3.0, schéma Item 7, aucune migration de monde                                                        | constantes, manifeste et validation du paquet                                    | A/E     |
| Non-régressions            | Inventaires PJ/PNJ, portraits, permissions, transactions, versions dynamiques et racine neutre de `DialogV2.input` préservés | suite unitaire et validation statique                                            | E       |

## Frontières conservées

- Les 2 688 Talents sont des modèles de compendium ; ils ne sont pas attribués automatiquement à un Actor avant le flux de création/progression de 10-D3/10-D4.
- Une technique active se présente depuis son Talent possédé : aucun Item Action concurrent n’est créé.
- Les éléments de règle déclarent le futur raccord ; leur résolution de combat demeure en 10-F.
- Les PV et énergies d’Ascendance ainsi que les PV de Voie sont prêts à être consommés, mais aucun Actor existant n’est recalculé par migration.
- Les Journaux encyclopédiques d’Ascendance et le navigateur à loupe restent prévus en 10-D3.
- La recette se fait seul en MJ, bloc par bloc, sans participant extérieur et sans contrôle visuel automatisé par navigateur.

## Statut

Le code et les données de l’audit personnel sont construits et contrôlés localement. Cette fabrication ne vaut pas validation : l’audit reste ouvert jusqu’à validation explicite de `RE-LIS_Recette_Audit-P_v0.8.4.md`. Après cette validation, l’étape suivante demeure 10-D3.
