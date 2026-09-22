# RE:LIS — Checklist de classification des équipements — proposition v1

Date : 21 septembre 2026. Document de discussion, non intégré à la Bible. Aucun code modifié, aucun nouveau lot ni paquet. 10-E3-P reste ouvert.

État de recette communiqué : A fonctionne sauf la classification et la sélection incohérente de plusieurs accessoires ; B fonctionne mais manque de suivi visuel ; C reste non validé. Le menu d’état par icônes et les interfaces d’installation restent à revoir.

## 1. Sources et portée

Bible v156, identité canonique vérifiée (version documentaire 10), notamment §41.30–61, §41.137–160, §53.9, §55.1–7, §78.4–6, §78.36–64, §78.83–88 et §78.101–104. Manuel DOCX fourni : le texte exploitable concerne surtout l’univers et les personnages ; il ne fournit pas de catalogue matériel détaillé supplémentaire.

La checklist couvre les familles de l’inventaire personnel, les formes de port à prévoir et le rattachement des 64 objets UTL. Elle ne constitue pas une nouvelle liste d’objets canoniques, ni un audit de toutes les valeurs des 320 profils ALM/PHA/MYS/UTL, ni une classification exhaustive de chaque module naval. Ces familles ont une destination explicitée ci-dessous.

**Légende :** « attesté » signifie présent dans la source citée ; « proposé » désigne un classement/interface à valider, même lorsque l’objet cité est canonique. Les cases sont des points de décision ou de contrôle, pas des validations déjà acquises. Les décisions récentes de l’utilisateur priment sur le formulaire livré en 0.5.5 et son additif documentaire.

## 2. Séparer cinq informations

- [ ] **Type d’objet** : arme, armure, équipement, consommable, munition, ressource ou conteneur ; conserver les types spécialisés des plateformes.
- [ ] **Famille fonctionnelle** : vêtement, bijou, outil, terminal, appareil médical, alimentation électrique, etc. Sert au classement et à la recherche.
- [ ] **Forme de port** : anneau, bracelet, collier, lunettes, chaussures, ceinture, etc. Un choix cohérent, unique pour un accessoire ordinaire.
- [ ] **Situation actuelle** : rangé, tenu, équipé, posé au sol, installé selon les usages réellement possibles. Être équipé ne signifie pas nécessairement être activé.
- [ ] **Emplacement réel** : corps, conteneur ou objet support. Une attache physique n’est pas une seconde possession et ne duplique pas l’objet.

Exemple proposé : un communicateur-bracelet est un Équipement / Communication / Bracelet. Il ne peut pas simultanément devenir un collier ou un anneau par trois cases cochées. Un modèle convertible aurait des modes explicitement prévus, dont un seul serait actif.

Une arme dans un fourreau est rangée dans ce contenant. Elle ne consomme pas une main. Un sac à dos peut être équipé tout en restant un Conteneur. Un objet posé peut fonctionner : poser une lampe n’impose pas de l’éteindre.

## 3. Familles générales : destination et comportement

| À contrôler | Famille                                                           | Destination proposée ou imposée par le canon                | Utilisation / limite                                                                                                               |
| ----------- | ----------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [ ]         | Armes de mêlée, de poing, longues, lourdes, arcs et armes lancées | Arme ; §41.97–119                                           | Mains, support ou montage selon profil ; aucun emplacement d’armure                                                                |
| [ ]         | Boucliers portés                                                  | Arme / Bouclier, décision utilisateur                       | Place de bouclier ; prise et fixation conformes au profil ; ne pas inventer que tout bouclier fixé libère la main                  |
| [ ]         | Sous-couches et protections défensives                            | Armure ; §41.137–148                                        | Six emplacements défensifs ; occupations multiples seulement lorsqu’elles ont un sens pour le profil                               |
| [ ]         | Vêtements civils et professionnels                                | Équipement / Vêtement proposé ; UTL-033–038                 | Habillage et effets environnementaux déclarés ; aucun bonus d’armure implicite                                                     |
| [ ]         | Bijoux et accessoires personnels                                  | Équipement / Accessoire proposé                             | Une forme de port ; anneau, bracelet et collier sont confirmés par demande utilisateur, autres formes à valider                    |
| [ ]         | Outillage technique, scientifique et d’enquête                    | Équipement / Outil ou Trousse ; UTL-001–016, 059            | Tenu, ouvert ou déployé ; pas de place corporelle obligatoire                                                                      |
| [ ]         | Appareils médicaux et de soin réutilisables                       | Équipement proposé                                          | Appareil séparé des doses consommées ; un matériel clinique n’est pas un bijou                                                     |
| [ ]         | Survie, campement, cuisine, hygiène                               | Équipement ou Consommable selon profil ; UTL                | Distinguer matériel réutilisable, réserve et produit à usage unique                                                                |
| [ ]         | Communication, capteurs, données et sécurité                      | Équipement ; UTL-049–064                                    | La fonction ne fixe pas à elle seule la forme : portatif, fixé, déployé ou porté selon modèle                                      |
| [ ]         | Datapad                                                           | Équipement / Terminal proposé                               | Matériel et activation séparés de RE:Link, de la ligne, des droits et du compte bancaire                                           |
| [ ]         | Générateurs de champs                                             | Équipement / Générateur proposé ; §41.152–154               | Générateur physique distinct du champ actif ; ni armure principale ni bouclier porté par défaut                                    |
| [ ]         | Batteries et accumulateurs                                        | Equipment ou Resource selon fonction, explicitement §78.59  | Réserve rechargeable, format, charge et connexion ; pas « consommable » par défaut                                                 |
| [ ]         | Focalisateurs et outils énergétiques durables                     | Équipement proposé ; MYS-049–064, 074, 079                  | Outil, charges et énergie séparés ; ni bijou ni arme automatiquement                                                               |
| [ ]         | Accessoires et modifications installés                            | Fonction « module personnel » ; §41.52–56                   | Objet support, emplacements techniques, compatibilité et montage ; type technique final à harmoniser avec §78.102                  |
| [ ]         | Alimentation et boissons                                          | Consommable proposé ; ALM-001–064                           | Portions, volumes, besoins et péremption ; aucun emplacement permanent                                                             |
| [ ]         | Médicaments, stimulants et toxines                                | Consommable proposé ; PHA-001–096                           | Voie d’administration et doses ; appareil réutilisable séparé s’il existe                                                          |
| [ ]         | Potions et matrices à usages limités                              | Consommable proposé ; MYS-001–048                           | Une matrice numérique n’est pas automatiquement un objet matériel porté ; respecter son support                                    |
| [ ]         | Réactifs rituels et cartouches techno-magiques                    | Ventilation par profil ; MYS-065–096                        | Mélange de ressources, consommables et outils durables ; ne pas tout convertir en consommable parce que le catalogue s’appelle MYS |
| [ ]         | Grenades, mines et charges posées                                 | Consommable proposé ; §41.61, 182–185                       | Amorçage, déploiement et consommation, sans place d’armure                                                                         |
| [ ]         | Projectiles de lanceurs et munitions                              | Munition ; §78.57                                           | Les projectiles sont consommables au sens courant mais alimentent une arme ; distinction avec grenade lancée à formaliser          |
| [ ]         | Sacs, caisses, coffres, gourdes, chargeurs                        | Conteneur dès que contenu indépendant ; §78.60, 64          | Peut être porté ou installé sans perdre son type ni son contenu                                                                    |
| [ ]         | Matières, échantillons, composants et semences                    | Ressource ; §78.58 et §55.3.2                               | La plante/semence cultivable n’est pas la portion alimentaire ; traçabilité et prélèvement                                         |
| [ ]         | Argent physique                                                   | Représentation physique selon décision économique existante | Aucun emplacement corporel ; quantité et devise ; compte bancaire distinct                                                         |
| [ ]         | Documents et droits                                               | Document ou données selon support ; §78.107–109             | Badge matériel distinct du droit accordé ; pas une place par fichier ni par autorisation                                           |
| [ ]         | Prothèses, implants, greffes et organes                           | Raccord au corps/biomédical                                 | Aucun équipement/déséquipement ordinaire ne remplace une procédure médicale                                                        |
| [ ]         | Drones, véhicules, mechas et vaisseaux                            | Actors et Items spécialisés liés                            | Posséder/piloter un drone ne transforme pas l’Actor en accessoire corporel                                                         |

## 4. Formes de port des équipements : liste à valider

Ce tableau est une **proposition de vocabulaire d’interface**, pas l’annonce que chaque exemple possède déjà un objet canonique chiffré. L’emplacement ne suffit pas à décider d’une exclusivité : lunettes sous un casque, cape avec sac ou vêtements sous une armure demandent des compatibilités explicites.

| À valider | Forme                               | Support principal                       | Fondement / point de vigilance                                                                             |
| --------- | ----------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [ ]       | Coiffe civile                       | Tête                                    | Extension proposée : chapeau, capuche civile ; distinct du casque défensif                                 |
| [ ]       | Lunettes / dispositif oculaire      | Yeux                                    | Besoin attesté par UTL-047 ; ne pas confondre avec l’Optique d’une arme                                    |
| [ ]       | Masque / appareil facial            | Visage                                  | Masques et respirateurs attestés §53.9 ; compatibilité avec casque et scellement                           |
| [ ]       | Dispositif auriculaire              | Oreilles                                | Protection auditive UTL-047 ; oreillette éventuelle selon modèle, pas déduite du mot communicateur         |
| [ ]       | Collier / pendentif                 | Cou                                     | Demande utilisateur ; capacité à confirmer, pas nécessairement toute pièce de tissu autour du cou          |
| [ ]       | Cape / manteau extérieur            | Épaules, couche extérieure              | Cape UTL-037 attestée ; ne doit pas interdire arbitrairement un sac                                        |
| [ ]       | Vêtement du haut                    | Torse, couche civile                    | Décomposition d’habillage proposée ; pas Armure principale                                                 |
| [ ]       | Vêtement du bas                     | Jambes, couche civile                   | Décomposition proposée ; pas Jambières défensives                                                          |
| [ ]       | Tenue complète / combinaison civile | Ensemble vestimentaire                  | UTL-033–036, 038 ; profil cohérent qui peut occuper haut + bas sans menu de bijoux multiples               |
| [ ]       | Gants civils ou techniques          | Mains, habillage                        | Extension proposée ; porter des gants ne consomme pas les mains de manipulation                            |
| [ ]       | Bracelet / dispositif de poignet    | Poignet                                 | Demande utilisateur ; distinguer deux bracelets indépendants d’une paire                                   |
| [ ]       | Anneau                              | Doigt                                   | Dix places ordinaires demandées ; un anneau = une place, sans dix effets automatiquement cumulables        |
| [ ]       | Ceinture                            | Taille                                  | UTL-040 ; si elle contient des objets, son rôle de Conteneur doit être pris en compte                      |
| [ ]       | Harnais                             | Torse / attaches                        | Attesté UTL-026 et MYS-091/095 ; emprise et compatibilités propres au modèle                               |
| [ ]       | Chaussures / bottes                 | Pieds                                   | Extension d’habillage proposée ; les bottes magnétiques §41.159 sont, elles, un module de mobilité         |
| [ ]       | Appareil dorsal                     | Dos                                     | Proposition pour appareils réellement conçus pour ce port ; ne pas l’imposer à toute batterie lourde       |
| [ ]       | Sac, sacoche ou contenant porté     | Dos, taille ou bandoulière selon modèle | Reste Conteneur ; UTL-041 attesté, autres formes à définir selon profils                                   |
| [ ]       | Badge, broche ou insigne fixé       | Vêtement / attache                      | Badge UTL-057 attesté ; pas forcément un emplacement corporel exclusif                                     |
| [ ]       | Sans port corporel                  | Aucun                                   | Outils, terminaux en main, trousses et matériels de camp : catégorie légitime, pas erreur de configuration |

À examiner sans inventer de catalogue : boucles d’oreilles, piercings, accessoires de cheveux, ornements de cornes/queue/ailes et autres morphologies. Leur existence générique ne fixe ni leur capacité, ni leur effet, ni un nouvel objet canonique. Les retenir comme variantes des formes existantes lorsque possible ; créer une forme distincte seulement si une règle ou un usage le justifie.

## 5. Sélection simple, paires et occupations multiples

- [ ] Un accessoire ordinaire possède **une seule forme de port**. Choisir Bracelet remplace Collier, sans conserver les deux.
- [ ] La capacité du corps appartient au corps ; la forme et le besoin appartiennent à l’Item. Aucun réglage par catégorie d’inventaire.
- [ ] Les paires sont explicites : une paire de gants/bottes n’est pas deux copies de l’objet. Le besoin d’emplacements doit rester compréhensible.
- [ ] Une armure EVA peut occuper Sous-couche + Armure principale selon §41.137 ; une pièce de membres peut couvrir bras + jambes selon son vrai profil.
- [ ] Un vêtement complet peut couvrir plusieurs zones d’habillage sans devenir plusieurs catégories d’accessoires.
- [ ] UTL-047 est déjà un exemple canonique « yeux et oreilles » : traiter cela comme un kit ou un profil composé explicite, jamais comme une autorisation universelle de cocher tout.
- [ ] Un module technique peut consommer plusieurs places ou types ; le Viseur intelligent exige Optique + Interne, le Support vital compact Environnement + Alimentation (§41.158–159).
- [ ] Boucliers : respecter le nombre de mains du vrai profil (§41.37) et ne pas importer une Action universelle « Lever le bouclier » depuis PF2e (§41.38). Classer un objet dans Armes ne lui invente pas un profil offensif (§41.39).
- [ ] Distinguer « alternatives possibles » et « occupations simultanées ». Un objet convertible n’occupe qu’un de ses modes actifs.
- [ ] Dix anneaux reste le cas ordinaire demandé. Les anciennes valeurs 1 collier / 2 bracelets étaient mes choix provisoires, pas une règle tirée du catalogue : les confirmer ou les remplacer explicitement.
- [ ] Ne pas multiplier les plafonds arbitraires pour vêtements, insignes et bijoux décoratifs. Décider quels conflits ont réellement un intérêt de jeu.

## 6. Cas ambigus à régler avant le code

1. **Combinaison civile ou défensive.** UTL-034 est une combinaison de travail, UTL-035/036 des tenues climatiques ; §41.147 fournit les EVA. Proposition : les premières restent Équipement / Vêtement, les EVA et exo-armures sont Armure. Le mot « combinaison » seul ne suffit pas.
2. **Protection professionnelle.** UTL-047 protège du bruit et de la lumière de travail : ce n’est pas automatiquement un casque d’armure. Un effet protecteur ne transforme pas tout outil en Armure.
3. **Portage.** Ceinture UTL-040, sac UTL-041, caisse UTL-042, gourde UTL-023, coffre UTL-061 : les contenus indépendants justifient Conteneur ; préciser leur affichage parmi les équipements portés sans dupliquer les Items.
4. **Trousses.** Une trousse à charges peut rester un seul Équipement. Une trousse à composants individuels peut nécessiter un Conteneur et ses objets. Ne pas faire payer ni peser deux fois le même matériel.
5. **Tenue stérile jetable.** UTL-039 est portée mais devient inutilisable après contamination. Le type Consommable ne doit pas interdire par principe toute possibilité de port ; choisir sa représentation une fois pour toutes.
6. **Matériel installé.** La Bible possède le type `module` et des accessoires personnels ; 0.5.x manipule surtout les types physiques personnels. Ne pas inventer une conversion automatique : harmoniser le choix technique avec §78.102 avant les profils de 10-E4-P.
7. **Énergie et champs.** Choisir le support réel du générateur, sans présumer qu’il est une ceinture ou qu’il occupe Armure principale. La batterie, le générateur et l’effet actif sont distincts.
8. **Existant.** Un Item déjà créé sous un mauvais type ne doit ni disparaître ni être recréé à la main pour contourner le classement. Prévoir une conversion contrôlée seulement si nécessaire, avec identité et données conservées.

## 7. Checklist d’interface associée — à concevoir, pas à coder maintenant

- [ ] Fiche Item : montrer une forme de port unique adaptée à la famille, et un résumé lisible des besoins. Ne pas exposer une grille universelle.
- [ ] Inventaire : bouton d’état par icône + libellé accessible, petit menu contextuel ; motif visible pour toute action impossible. Retirer le menu déroulant provisoire.
- [ ] Sous la charge : mains occupées, protections équipées et compteurs des accessoires pertinents. Afficher par exemple Anneaux 3/10 et les noms sur ouverture.
- [ ] Afficher les objets, pas seulement les chiffres ; permettre d’ouvrir leur fiche depuis ce résumé.
- [ ] Masquer/replier les groupes sans intérêt courant ; ne pas transformer le bandeau en deuxième fiche biomédicale.
- [ ] Aucun schéma corporel de glisser-déposer dans l’inventaire ; décision antérieure conservée.
- [ ] Conserver recherche, catégories repliables, conteneurs, Déplacer, Transférer, propriété et densités PNJ.
- [ ] Installation : commencer par « Installer ce module sur… », puis objets compatibles et « 1 place disponible / 2 ». Montrer le détail technique à la demande.
- [ ] Préserver un vocabulaire commun entre fiche Item, inventaire et recette.
- [ ] Recette C : un scénario concret, une action par point, résultat attendu ; éviter la manipulation abstraite de plusieurs schémas à la fois.

## 8. Ordre de décision

1. Valider la séparation Armures / Vêtements / Accessoires / Outils / Conteneurs / Modules, notamment les exceptions de la section 6.
2. Ajuster la liste des formes de port de la section 4 et les capacités qui méritent un contrôle.
3. Fixer les profils composés autorisés et la gestion des paires.
4. Dessiner le résumé d’inventaire, le menu d’état et le parcours d’installation.
5. Seulement après accord, reprendre l’implémentation dans 10-E3-P existant et adapter la recette.

Les parties listées ici sont un travail de classification. Elles ne créent pas de profils chiffrés, de nouvelles règles de bonus, de dépenses d’Actions ou d’objets de compendium.

## Annexe — Couverture des 64 objets UTL

Chaque ligne est un classement **proposé**, appuyé sur le nom et la fonction canoniques de §55.6. Les noms ne sont pas des créations de recette. Les choix ambigus sont explicités ; aucun type n’est modifié par ce document.

| Contrôle | ID      | Objet canonique                        | Classement proposé / vigilance                                                                                                  |
| -------- | ------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [ ]      | UTL-001 | Trousse technique universelle          | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-002 | Outils de mécanique de précision       | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-003 | Trousse électronique                   | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-004 | Analyseur de réseaux                   | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-005 | Coffret de criminalistique numérique   | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-006 | Poste de soudure portatif              | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-007 | Trousse de réparation EVA              | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-008 | Coffret de construction légère         | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-009 | Trousse d’échantillonnage scientifique | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-010 | Trousse biologique stérile             | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-011 | Trousse médicale de terrain            | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-012 | Kit chirurgical portatif               | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-013 | Batterie de cuisine de terrain         | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-014 | Trousse horticole hydroponique         | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-015 | Nécessaire de cartographie             | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-016 | Coffret d’enquête matérielle           | Équipement / Trousse ou outil ; charges et composants distincts selon représentation retenue                                    |
| [ ]      | UTL-017 | Tente pressurisée légère               | Équipement / Abri déployable ; réserve externe distincte                                                                        |
| [ ]      | UTL-018 | Tente de camp quatre places            | Équipement / Abri déployable                                                                                                    |
| [ ]      | UTL-019 | Sac de couchage thermique              | Équipement / Couchage ; pas une tenue de combat                                                                                 |
| [ ]      | UTL-020 | Bivouac thermorégulé                   | Équipement / Bivouac actif ; alimentation distincte                                                                             |
| [ ]      | UTL-021 | Réchaud multicombustible               | Équipement / Cuisine déployable                                                                                                 |
| [ ]      | UTL-022 | Purificateur d’eau portatif            | Équipement / Traitement d’eau ; cartouche distincte                                                                             |
| [ ]      | UTL-023 | Gourde filtrante                       | Conteneur / Gourde avec fonction filtrante ; eau distincte                                                                      |
| [ ]      | UTL-024 | Lampe de camp                          | Équipement / Éclairage ; peut fonctionner posée                                                                                 |
| [ ]      | UTL-025 | Chargeur solaire pliant                | Équipement / Recharge ; ne confondre ni chargeur électrique ni chargeur de munitions                                            |
| [ ]      | UTL-026 | Trousse d’escalade                     | Équipement / Trousse composite ; harnais et corde, décomposition à décider                                                      |
| [ ]      | UTL-027 | Corde synthétique 30 m                 | Équipement / Outil de levage et d’arrimage ; longueur suivie                                                                    |
| [ ]      | UTL-028 | Gilet de flottabilité                  | Équipement / Gilet de sécurité porté ; pas armure par défaut                                                                    |
| [ ]      | UTL-029 | Mousse d’abri expansible               | Consommable / Abri à déployer, usage unique                                                                                     |
| [ ]      | UTL-030 | Allumeur de survie                     | Équipement / Allumeur à réserve d’usages                                                                                        |
| [ ]      | UTL-031 | Douche de terrain fermée               | Équipement / Hygiène déployable ; eau distincte                                                                                 |
| [ ]      | UTL-032 | Sanitaire portatif scellé              | Équipement / Sanitaire déployable ; cartouche et vidange                                                                        |
| [ ]      | UTL-033 | Tenue civile standard                  | Équipement / Tenue civile complète                                                                                              |
| [ ]      | UTL-034 | Combinaison de travail                 | Équipement / Tenue de travail proposée ; frontière Armure à confirmer                                                           |
| [ ]      | UTL-035 | Tenue grand froid                      | Équipement / Tenue climatique froide proposée                                                                                   |
| [ ]      | UTL-036 | Tenue de chaleur                       | Équipement / Tenue climatique chaude proposée                                                                                   |
| [ ]      | UTL-037 | Cape imperméable                       | Équipement / Cape extérieure                                                                                                    |
| [ ]      | UTL-038 | Uniforme de cérémonie                  | Équipement / Tenue cérémonielle                                                                                                 |
| [ ]      | UTL-039 | Tenue médicale stérile                 | Consommable porté ou Équipement jetable : représentation à arbitrer                                                             |
| [ ]      | UTL-040 | Ceinture utilitaire                    | Conteneur porté / Ceinture utilitaire proposé ; six objets L, conversion des anciennes capacités à traiter sans inventer des kg |
| [ ]      | UTL-041 | Sac à dos d’expédition                 | Conteneur porté / Sac dorsal ; ancienne capacité en Enc. à conserver comme source, pas à convertir arbitrairement               |
| [ ]      | UTL-042 | Caisse rigide scellée                  | Conteneur / Caisse scellée ; serrure séparée                                                                                    |
| [ ]      | UTL-043 | Nécessaire d’hygiène personnel         | Équipement / Nécessaire à consommables                                                                                          |
| [ ]      | UTL-044 | Nécessaire menstruel réutilisable      | Équipement / Nécessaire réutilisable ; pas bijou ni implant                                                                     |
| [ ]      | UTL-045 | Nécessaire de coiffure et rasage       | Équipement / Nécessaire de toilette                                                                                             |
| [ ]      | UTL-046 | Trousse de lessive                     | Équipement / Trousse à consommables                                                                                             |
| [ ]      | UTL-047 | Protection yeux et oreilles            | Équipement / Protection professionnelle yeux + oreilles ; kit composé à définir                                                 |
| [ ]      | UTL-048 | Nécessaire de soins nourrisson         | Équipement / Nécessaire de soins à consommables                                                                                 |
| [ ]      | UTL-049 | Communicateur civil                    | Équipement / Communication ; forme portée ou tenue non précisée                                                                 |
| [ ]      | UTL-050 | Communicateur chiffré                  | Équipement / Communication sécurisée ; même réserve sur la forme                                                                |
| [ ]      | UTL-051 | Traducteur portatif                    | Équipement / Traduction portative                                                                                               |
| [ ]      | UTL-052 | Enregistreur multispectral             | Équipement / Enregistrement et capteurs                                                                                         |
| [ ]      | UTL-053 | Caméra autonome                        | Équipement / Caméra déployable ; autonomie ne signifie pas Actor drone                                                          |
| [ ]      | UTL-054 | Balise de route                        | Équipement / Balise posée ou fixée                                                                                              |
| [ ]      | UTL-055 | Tablette de données personnelle        | Équipement / Terminal personnel ; raccord au Datapad à définir, pas assimilation automatique des fonctions                      |
| [ ]      | UTL-056 | Bibliothèque de terrain                | Équipement / Support documentaire ; fichiers distincts du matériel                                                              |
| [ ]      | UTL-057 | Badge d’identité sécurisé              | Équipement / Badge fixé ; droits distincts du support                                                                           |
| [ ]      | UTL-058 | Scellé biométrique                     | Équipement à charges ou Consommable de scellés : conditionnement à arbitrer                                                     |
| [ ]      | UTL-059 | Trousse de preuve                      | Équipement / Trousse de preuve ; échantillons individualisés séparément                                                         |
| [ ]      | UTL-060 | Menottes adaptatives                   | Équipement / Entrave appliquée à une cible ; pas une place Bracelet du propriétaire                                             |
| [ ]      | UTL-061 | Coffre personnel portatif              | Conteneur / Coffre portatif actif                                                                                               |
| [ ]      | UTL-062 | Coin d’alarme de porte                 | Équipement / Sécurité déployée sur porte                                                                                        |
| [ ]      | UTL-063 | Fusée de signalisation                 | Consommable / Signalisation à un tir ; ni arme par défaut ni bijou                                                              |
| [ ]      | UTL-064 | Transpondeur d’urgence                 | Équipement / Transpondeur de secours ; emplacement selon le vrai modèle                                                         |

**Contrôle de couverture :** 64 identifiants UTL uniques, de UTL-001 à UTL-064, sans omission. Les regroupements MYS, ALM, PHA, armes, protections et modules sont couverts par les familles de la section 3 ; leurs profils individuels ne sont pas tous remappés dans cette annexe.
