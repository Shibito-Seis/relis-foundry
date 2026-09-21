# 10-E3-P — Vérification de conformité du complément 0.5.4

Date : 21 septembre 2026. Base publiée examinée : 0fbb57e (0.5.3).
Sources : Bible v154, notamment §41.53–54, §41.137, §41.139, §41.145–148, §78.38, §78.45, §78.53–54, et additifs §47, §55, §58–60 ; roadmap personnelle révisée.

La recette 0.5.3 est validée. La clôture globale antérieure était trop large : elle ne couvrait pas les emplacements multiples. Le complément 0.5.4 reste à valider dans Foundry. Cette matrice décrit le périmètre 10-E3-P ; elle ne certifie pas l’ensemble de l’étape 10.

| Exigence                                                           | Réalisation / preuve                                                                                                                         | Recette |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Sept emplacements corporels canoniques                             | BODY_SLOTS, equipment-slots.test.ts                                                                                                          | A       |
| Occupation simultanée de plusieurs emplacements : EVA, membres     | bodySlots[], comparaison des intersections, exemples structurels testés sans créer de faux objets canoniques                                 | A       |
| Sous-casque distinct du casque ; sous-couche distincte de l’armure | Identifiants séparés, tests de coexistence et conflit                                                                                        | A       |
| Emplacement distinct de couverture                                 | Liste d’occupation seulement, texte explicatif ; aucune valeur défensive inventée                                                            | A       |
| Quantités de places techniques fournies/requises (§41.53)          | Registre technique, requiredSlots/providedSlots, calcul par hôte et cumul des modules                                                        | B       |
| Aucune capacité disponible ne remplace les autres compatibilités   | Contrôles existants conservés ; type d’hôte, accès, corps, taille/nature, état et cycles ; spécialisations matérielles détaillées ci-dessous | B       |
| Édition dans la fiche Item, pas de texte libre d’emplacement       | Cases multiples et champs numériques typés, bouton Enregistrer                                                                               | A/B     |
| Persistance et désélection complète                                | equipment-profile.test.ts et contrôle DOM/Handlebars sans navigateur                                                                         | A       |
| Anciennes valeurs conservées sans interprétation hasardeuse        | Champ slot conservé, diagnostic, remplacement explicitement confirmé ; aucun lot d’Items supprimé ou recréé                                  | A       |
| Corps distincts ; occupation seulement à l’usage concerné          | Contrôle des bodyId, tests objets rangés et autre corps                                                                                      | A/C     |
| Mains, quantités uniques, états contextuels et refus expliqués     | equipment.test.ts, equipment-feedback.test.ts ; Rangé reste la norme                                                                         | C       |
| Installation à un seul hôte ; cycles mixtes et conteneurs          | Tests existants conservés ; résolution UUID ou identifiant stable                                                                            | B/C     |
| Modification d’un profil déjà utilisé                              | Même verrou Actor que l’inventaire, simulation avant écriture ; refus d’un nouveau conflit ou d’une capacité réduite sous l’usage actuel     | B/C     |
| Affichage PJ/PNJ                                                   | Emplacements visibles ; localisation équipée détaillée ; usage/capacité des modules sur l’hôte                                               | A/B     |
| Ensembles stricts/assistés et libérations avant acquisitions       | Projection utilise les mêmes règles ; conflit strict sans écriture, application assistée partielle ; références aux vrais Items              | C       |
| Temps et aide                                                      | Profil déclaré et aperçu conservés ; pas de débit d’Actions prématuré                                                                        | C       |
| Permissions et récupération                                        | Propriété recontrôlée, lock existant, journal de récupération préservé, tests des refus ; multijoueur manuel reporté                         | C       |
| Portage                                                            | Masse réelle et seuils provisoires conservés ; pas de formule inventée                                                                       | C       |
| Non-régressions                                                    | Identités, piles, lots, conteneurs, transferts, portraits, DialogV2 et PACKAGE_VERSION protégés par la suite existante                       | C       |

## Limites déjà assignées à des lots ultérieurs

- **10-E4-P** : valeurs des vrais profils d’armes, armures, boucliers et modules ; exigences technologiques, formats d’alimentation et interfaces spécialisées ; protections, couverture, couches, consommation et rechargement. Les 15 types techniques de §41.53 sont disponibles, mais leur disponibilité par modèle ne sera pas inventée : chaque source indiquera les capacités réelles. Un champ nul n’offre aucune place.
- **10-K1-P / K2-P** : sources reconstruites, identifiants et vrais compendiums préconfigurés. Le moteur d’occupation les précède.
- **10-D3 à D5 / 10-F** : dérivations depuis le corps, l’Ascendance, les talents et l’état biomédical ; présentations et Tokens ; application des protections aux blessures. Les sept emplacements actuels décrivent le régime personnel normal de §41.137, pas une anatomie universelle inventée. Les tailles/natures déclarées restent contrôlées.
- **10-F** : dépenses d’Actions et horloge de combat ; les durées restent déclaratives dans ce lot.
- **10-L2** : recette finale à plusieurs utilisateurs. Le contrôle manuel sans propriété n’a pas été exécuté par le MJ seul.

## Règle de clôture

Lire le canon avant le code et relire cette matrice avant toute clôture ; consigner chaque écart. La réussite de tests ne remplace ni l’exhaustivité du périmètre ni la recette utilisateur. Aucune étape supplémentaire n’est créée.

## Correctif prioritaire 0.5.5 — retour utilisateur sur 0.5.4

Le retour A.1–6 est positif, mais accompagné d’une régression bloquante entre exemplaires et d’une révision explicite des catégories. Le complément reste non clos ; B et C ne sont pas validés. Base inspectée : 6560d14, paquet public 0.5.4. Les constats historiques ci-dessus ne valent pas validation du correctif.

| Exigence actuelle                                                       | Implémentation et contrôle                                                                                                                                                                       | Recette |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Un profil appartient à un seul Item, pas à une catégorie, source ou lot | Initialisateurs de listes indépendants dans les modèles ; item-isolation.test.ts exerce les vrais schémas et les écritures en place ; inventory.test.ts vérifie les autres exemplaires inchangés | A.1–3   |
| Plusieurs fiches ouvertes restent isolées                               | Gestionnaire limité à la section et à l’Item fourni ; contrôle DOM/Handlebars sans navigateur sur deux fiches et réouverture                                                                     | A.2     |
| Arme : bouclier seulement ; armure : six emplacements défensifs         | allowedBodySlots, validation de profil monde/embarqué et contrôle au changement d’état ; tests equipment-profile et equipment-slots                                                              | A.4     |
| Équipement : accessoires, sans armure ni bouclier                       | Collier/Bracelet/Anneau ; équipements sans emplacement toujours possibles pour les outils ; aucun reclassement automatique                                                                       | A.4     |
| Dix anneaux ordinaires, saturation et libération                        | Compteur par corps et par Item équipé, capacité modifiable par le MJ ; onzième refusé, rangement libère, autre corps séparé                                                                      | B       |
| Capacités de collier et bracelet                                        | Valeurs de fonctionnement 1 et 2, ajustables par corps ; elles ne sont pas une formule anatomique définitive ni un bonus cumulatif                                                               | B       |
| Occupation multiple et bouclier                                         | Toutes les cases sélectionnées consomment une place ; un bouclier tenu ou équipé réserve Bouclier porté                                                                                          | B/C     |
| Anciennes valeurs conservées                                            | Diagnostic des choix interdits ; correction explicite de la fiche ; aucun effacement, aucune conversion de type, aucune migration                                                                | A.5     |
| Pas de régression des installations, ensembles, mains et permissions    | Suite existante et recette précédente conservées ; schéma 5, versions dynamiques, portraits et DialogV2                                                                                          | C       |

Le défaut trouvé concerne les valeurs initiales `initial: []` réutilisables dans un schéma partagé. Le correctif emploie `initial: () => []`. Le test de contrat reproduit des modifications en place, conformément au comportement documenté de [ArrayField dans Foundry 14](https://foundryvtt.com/api/v14/classes/foundry.data.fields.ArrayField.html). Il ne constitue pas une exécution du runtime Foundry complet ni une inspection du monde Forge de l’utilisateur. La recette reste nécessaire pour confirmer la disparition du phénomène observé.

Les valeurs déjà enregistrées avec une mauvaise sélection ne permettent pas de retrouver automatiquement l’intention initiale : aucune réparation supposée. Capacités d’accessoires dérivées de l’anatomie plus tard dans les lots du corps déjà prévus ; effets d’objets et profils canoniques en 10-E4-P. Aucune nouvelle étape.
