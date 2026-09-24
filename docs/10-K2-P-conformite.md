# 10-K2-P — Matrice de conformité des compendiums personnels v0.8.0

Base publique inspectée avant modification : `0b09c92e063b0cb3b7b330474f23d87e433c0714`, tag `v0.7.0`. Canon relu avant codage : Bible v162, notamment les catalogues personnels, les contrats documentaires et les §§90–100 ; roadmap révisée et manuel historique. La validation utilisateur de la recette 0.7.0 clôt 10-K1-P. 10-K2-P reste en recette jusqu’à validation explicite de la v0.8.0.

## Inventaire produit

| Pack        | Types                                                                                                |    Nombre |
| ----------- | ---------------------------------------------------------------------------------------------------- | --------: |
| Création    | 20 Ascendances, 52 Profils, 48 Origines, 31 Avantages, 37 Handicaps, 11 Postes                       |       199 |
| Progression | 12 Voies, 84 Spécialisations, 1 054 Talents, 42 Actions, 252 Pouvoirs                                |     1 444 |
| Matériel    | 111 Armes, 80 Armures, 147 Équipements, 267 Consommables, 60 Munitions, 62 Ressources, 28 Conteneurs |       755 |
| **Total**   | **18 types Item personnels**                                                                         | **2 398** |

Les 111 armes comprennent les 96 lignes du catalogue, les 14 boucliers matérialisés comme armes et la techno-lame de Prana. Les 28 conteneurs comprennent les 24 chargeurs détachables explicitement recensés. Le parent Beastkin non sélectionnable est conservé parmi les 20 Ascendances afin de porter la hiérarchie canonique.

## Matrice canon → implémentation → contrôle → recette

| Exigence canonique ou décision           | Implémentation v0.8.0                                                                                                                             | Contrôle automatisé                                            | Recette |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------- |
| Tous les compendiums personnels ensemble | Trois packs Item : Création, Progression et Matériel                                                                                              | compte total, compte par pack et par type                      | A       |
| Aucune invention pour combler une lacune | Les lignes canoniques sont conservées dans `system.catalog` avec leur section et leurs valeurs ; aucune statistique de combat n’est déduite       | Actions sans jet artificiel ; identifiants et comptes figés    | B/C     |
| Identité et reproductibilité             | Un JSON par `relisId`, `_id` Foundry déterministe, métadonnées injectées à la construction                                                        | double génération et empreinte identique                       | A       |
| Références canoniques                    | Spécialisations, Voies, prérequis exacts, dotations résolues et formules MYS utilisent des `relisId`                                              | mode strict, zéro référence absente, zéro avertissement        | A/B/C   |
| Vrais packs Foundry                      | Compilation LevelDB par l’outil officiel et déclaration dans `system.json`                                                                        | construction des trois packs et manifeste                      | A       |
| Matériel 10-E4-P                         | Profils d’armes, alimentations, munitions, batteries, chargeurs, protections, modules et ressources renseignés seulement lorsque le canon tranche | échantillons canoniques et tests de compatibilité existants    | C       |
| Écarlithe distincte                      | Ressource noire brute non installable, Cœur incolore installable sans CE, techno-lame à logement `crystalSocket`                                  | tests de séparation et d’installation                          | D       |
| Accord déterministe                      | 8 situations, 6 axes, 15 couleurs, paires reconnues et départage borné                                                                            | dominante, conjonction, équilibre, égalité et réponse invalide | D       |
| Permissions d’accord                     | Propriétaire/MJ pour un PJ ; MJ seul pour un PNJ, la couleur directe et la remise à zéro                                                          | tests unitaires de permissions et boutons conditionnels        | D       |
| Persistance                              | Réponses, scores, version, sujet, date, couleur et historique restent sur le Cœur                                                                 | instantané indépendant et données Item isolées                 | D       |
| Limites 10-F                             | Les Actions de catalogue restent descriptives ; aucun DD, Attribut ou Compétence n’est inventé                                                    | 42 Actions `configured: false`                                 | B       |
| Schéma et monde                          | Schéma Item 7 inchangé, aucune migration, aucun import massif au démarrage                                                                        | constantes, manifeste et suite existante                       | E       |
| DialogV2 0.4.1                           | Tous les nouveaux dialogues gardent un `div` racine sans attribut ; les classes sont placées sur les enfants                                      | validation statique Actor et Écarlithe                         | E       |
| Version affichée                         | Paquet 0.8.0, pieds Actor/Item et message de chargement fondés sur `PACKAGE_VERSION`                                                              | validation du manifeste et des templates                       | E       |

## Frontières conservées

- Les compendiums sont des modèles ; leur ouverture ne les importe pas dans le monde.
- Une copie importée reste un Item autonome avec sa provenance. La synchronisation avancée et l’audit global suivent leur lot prévu.
- Les effets détaillés, bonus, attaques, dégâts, protections, consommation au tir, activation et surcharge restent en 10-F lorsqu’ils ne sont pas déjà définis par le canon.
- Les dérivations de création, d’Ascendance, de Corps et de portage suivent 10-D3 à 10-D5 et les lots biomédicaux prévus ; K2-P ne les simule pas.
- La Banque du Datapad et les opérations financières restent en 10-G7/10-J1.
- La recette se fait seul en MJ, bloc par bloc, sans participant extérieur et sans contrôle visuel automatisé par navigateur.

## Statut

Le code et les données de 10-K2-P sont construits et contrôlés localement. Cette fabrication ne vaut pas clôture : 10-K2-P demeure ouvert jusqu’à validation explicite de `RE-LIS_Recette10_K2-P_v0.8.0.md`.
