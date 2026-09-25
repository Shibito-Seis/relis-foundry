# 10-K2-P — Matrice de conformité des compendiums personnels v0.8.3

Base exacte de travail : sources livrées en v0.8.2 et Bible v165. Canon relu avant codage : règle des demi-Ascendances, huit parentés Beastkins, accès aux catalogues hybrides, profils énergétiques du §43.9 et roadmap révisée. 10-K1-P reste validé. 10-K2-P reste en recette jusqu’à validation explicite de la v0.8.3.

## Inventaire produit

| Domaine     | Packs et types                                                                                                 |    Nombre |
| ----------- | -------------------------------------------------------------------------------------------------------------- | --------: |
| Création    | 6 packs : 28 documents d’Ascendance, 52 Profils, 48 Origines, 31 Atouts, 37 Handicaps, 11 Postes               |       207 |
| Progression | 10 packs : 12 Voies, 84 Spécialisations, 1 054 Talents, 42 Actions, 252 Pouvoirs                               |     1 444 |
| Matériel    | 7 packs : 111 Armes, 80 Armures, 147 Équipements, 267 Consommables, 66 Munitions, 62 Ressources, 28 Conteneurs |       761 |
| **Total**   | **23 compendiums et 18 types Item personnels**                                                                 | **2 412** |

Les 111 armes comprennent les 96 lignes du catalogue, les 14 boucliers matérialisés comme armes et la techno-lame de Prana. Les six munitions ajoutées sont des standards techniques de flèches ou carreaux exigés par les profils canoniques des arcs et arbalètes. Elles ne constituent pas de nouveaux objets de fiction. Les 28 conteneurs comprennent les 24 chargeurs détachables explicitement recensés.

## Matrice canon → implémentation → contrôle → recette

| Exigence                     | Implémentation v0.8.3                                                                                                          | Contrôle automatisé                                           | Recette |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------- |
| Classement inspiré de PF2e   | 23 packs regroupés par `packFolders`; dossiers internes pour Ascendances, compétences, Voies, rangs et familles matérielles    | manifeste, comptes par pack, compilation LevelDB des 23 packs | A       |
| Identité et reproductibilité | Un JSON par `relisId`, `_id` stable et métadonnées injectées; déplacement de fichier sans changement d’identité                | double génération et empreinte identique                      | A       |
| Demi-Beastkins               | Groupe générique non sélectionnable et huit variantes jouables liées à leur parent exact                                       | comptes, sélectivité, références, identifiants stables        | B       |
| Choix et prérequis hybrides  | Deux bonus parmi les trois du parent, bonus libre distinct, malus parental et trois catalogues autorisés structurés            | huit profils complets et trois options héritées               | B       |
| Descriptions d’Ascendances   | Les 28 documents reprennent le contexte canonique de leur famille et l’orientation propre à chaque variante                    | compte exact, seuil narratif et titre de section              | B       |
| Descriptions de Voies        | Les 12 Items distinguent concept, rôle en combat, rôle hors combat, branches et repères de création                            | compte exact, seuil narratif et sections obligatoires         | C       |
| Audit des Spécialisations    | Un rapport séparé couvre les 84 entrées avec base canonique et proposition; aucun texte proposé n’est injecté avant validation | 84 identifiants uniques et descriptions sources inchangées    | F       |
| 111 armes                    | Compétence, Attribut, alimentation, portée et dégâts recalculés depuis la Bible                                                | audit des 111 profils et registres fermés                     | C       |
| Arcs et arbalètes            | Tir + Dextérité; flèche/carreau exact; encochage ou chambre/magasin selon le modèle                                            | profils des huit armes et six projectiles                     | C       |
| Armes lancées                | Tir + Dextérité, Force aux dégâts seulement lorsque le profil le prévoit, aucune chambre fictive                               | Javelot et disque contrôlés                                   | C       |
| Rechargement unitaire        | Formule déclarative `1 + Dextérité`, chargement à l’unité et capacité au bon niveau; exécution d’action reportée à 10-F        | profil de recharge et services transactionnels existants      | C       |
| Conditionnements             | Une boîte crée son nombre réel de projectiles et le prix référence ce conditionnement                                          | cas .357 Magnum 30/30 et audit des munitions                  | C       |
| Chambre / chargeur           | Famille, chambre et pression appartiennent à la munition; interface au chargeur; capacité au chargeur ou magasin interne       | compatibilités séparées munition/chargeur                     | C       |
| Batteries                    | L’arme impose format, interface et classe; la technologie d’effet ne rejette plus une batterie électrique valide               | profils énergétiques et compatibilité                         | C       |
| Focaliseurs MYS              | 16 profils structurés : source, rang, formules, tampon, CE, identité et règles de recharge                                     | compte et champs fermés                                       | C       |
| Écarlithe                    | Banque de 48 situations; tirage stable de 20 (8/8/4); six axes et quinze couleurs                                              | validation du contrat et stabilité du tirage                  | D       |
| Persistance Écarlithe        | Les valeurs de `DialogV2.input` sont utilisées; réponses, couleur MJ, nom, sujet, date et historique persistent                | tests unitaires et contrat statique DialogV2                  | D       |
| Permissions                  | Propriétaire/MJ pour un PJ; MJ seul pour PNJ, couleur directe et remise à zéro                                                 | tests de permissions                                          | D       |
| Suppression d’inventaire     | Bouton rouge PJ/PNJ, confirmation, verrou et refus si l’Item contient, héberge ou charge encore un autre Item                  | service, propriété, gabarit et blocages relationnels testés   | D       |
| Libellé d’échange            | L’interface et les messages emploient « Échanger »; le protocole transactionnel interne validé reste inchangé                  | contrat de gabarit et suite de transactions                   | E       |
| Frontière 10-F               | Aucune attaque, dépense de CE, formule magique ou action de recharge n’est exécutée ici                                        | Actions non configurées et marqueurs `automationLot`          | C/D     |
| Schéma et données            | Schéma Item 7 inchangé, aucune migration de monde                                                                              | constantes, manifeste et suite complète                       | E       |
| Non-régressions              | Inventaires PJ/PNJ, portraits, transactions, versions dynamiques et `div` racine neutre DialogV2 préservés                     | suite unitaire et validation du paquet                        | E       |

## Frontières conservées

- Les compendiums sont des modèles ; leur ouverture ne les importe pas dans le monde.
- Une copie importée reste un Item autonome avec sa provenance.
- La formule `1 + Dextérité` documente le maximum de rechargement unitaire par action ; son débit en combat appartient à 10-F.
- Le prix unitaire ou l’avantage économique d’un achat par boîte sera raccordé au commerce de 10-J. La v0.8.3 ne fabrique aucun taux de remise.
- Les Journaux complets d’Ascendance seront produits avec la création de personnage en 10-D3 ; les Items mécaniques actuels restent disponibles.
- Le rapport sur les 84 Spécialisations est une proposition de rédaction, pas une modification canonique des compendiums.
- La Banque du Datapad et les opérations financières restent en 10-G7/10-J1.
- La recette se fait seul en MJ, bloc par bloc, sans participant extérieur et sans contrôle visuel automatisé par navigateur.

## Statut

Le code et les données de 10-K2-P sont construits et contrôlés localement. Cette fabrication ne vaut pas clôture : 10-K2-P demeure ouvert jusqu’à validation explicite de `RE-LIS_Recette10_K2-P_v0.8.3.md`.
