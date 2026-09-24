# Journal des versions

## 0.8.0 — 10-K2-P, compendiums personnels canoniques

- Publie ensemble les trois compendiums Item de Création, Progression et Matériel personnel, soit 2 398 entrées issues de la Bible v162 : 199, 1 444 et 755 Items respectivement.
- Couvre Ascendances, Profils, Origines, Atouts, Handicaps, Postes, Voies, Spécialisations, Talents, Actions, Pouvoirs, armes, armures, équipements, consommables, munitions, ressources et conteneurs sans contenu fictif.
- Active les références canoniques strictes, les identifiants Foundry stables, les métadonnées de provenance et la compilation LevelDB déterministe des trois packs.
- Ajoute l’Écarlithe noire brute, le Cœur d’Écarlithe incolore installable et la techno-lame de Prana, sans assimiler le Cœur à une batterie ni lui attribuer de CE.
- Rend le questionnaire d’accord opératoire sur la fiche du Cœur : huit situations, six axes, quinze couleurs, départage déterministe, persistance et historique. Le propriétaire répond pour son PJ ; le MJ répond pour un PNJ et garde seul la modification directe ou la réinitialisation.
- N’invente aucun jet aux Actions de catalogue et reporte leur automatisation à 10-F. La couleur d’un Cœur n’accorde aucun bonus mécanique en 10-K2-P.
- Conserve le schéma Item 7 sans migration et toutes les non-régressions validées de 10-E4-P/10-K1-P. 10-K2-P reste en recette jusqu’à validation explicite de la v0.8.0.

## 0.7.0 — 10-K1-P, pipeline des données personnelles

- Clôt 10-E4-P après validation fonctionnelle explicite de la recette 0.6.2 et conserve toutes ses non-régressions.
- Ajoute un format source JSON versionné, une entrée canonique par fichier, trois familles de packs personnels et des schémas documentaires pour l’auteur.
- Refuse identifiants, types et fichiers incohérents, doublons, aliases invalides, collisions d’identifiants Foundry et métadonnées réservées au générateur.
- Dérive des `_id` Foundry stables, injecte les versions et métadonnées canoniques, trie les sorties et contrôle leur reproductibilité bit à bit.
- Intègre l’outil officiel `@foundryvtt/foundryvtt-cli` pour construire les futurs packs LevelDB ; les familles vides ne sont pas publiées dans le paquet 0.7.0.
- Fixe Écarlithe comme nomenclature, distingue matière noire brute, Cœur incolore et Cœur accordé, puis structure le questionnaire déterministe, sa palette et ses permissions.
- N’ajoute aucun Item ni compendium canonique : Ascendances, Profils, Origines, Atouts, Handicaps, Voies, Spécialisations, Talents, Actions, Pouvoirs et dotations restent à produire ensemble en 10-K2-P.
- Conserve le schéma Item 7 sans migration de monde. 10-K1-P reste en recette jusqu’à validation explicite de la v0.7.0.

## 0.6.2 — 10-E4-P, batteries insérées et cristal de Prana

- Remplace la fausse réserve intégrée des armes énergétiques par une batterie Item réellement installée ; les CE actuels et maximaux restent portés par cette batterie.
- Refuse tout transfert direct de CE vers une arme. La recharge d’une batterie ou d’une véritable réserve reste disponible hors de l’arme.
- Ajoute l’insertion, le remplacement et l’éjection d’une batterie compatible par format, interface, classe de puissance et technologie, avec affichage de sa charge sous l’arme.
- Rend le cristal de Prana incolore et non accordé réellement installable dans la seule techno-lame à cristal ; il ne porte aucun CE et ne peut jamais être utilisé comme batterie.
- Distingue le chargement unitaire en chambre, le magasin interne et le chargeur détachable. Seul le magasin interne expose une capacité d’arme ; le chargeur conserve sa propre capacité et ses vrais Items de munitions.
- Structure la consommation de munitions et de CE par mode de tir, ainsi que le coût d’activation des techno-lames énergétiques, sans anticiper l’exécution des attaques de 10-F.
- Migre vers le schéma 7 de façon additive et idempotente : seules une capacité interne et une consommation non ambiguës sont reprises ; les champs historiques restent conservés.
- Préserve les protections PJ/PNJ, permissions, portraits, DialogV2, transactions, modules, monnaie, versions dynamiques et données existantes. 10-E4-P reste en recette jusqu’à validation explicite de la v0.6.2.

## 0.6.1 — 10-E4-P, registres fermés et fiches spécialisées

- Remplace les champs mécaniques libres du matériel personnel par des registres canoniques, sélecteurs multiples et valeurs bornées ; la description reste le seul espace narratif général.
- Structure les huit familles d’armes, six accès, mains `1`/`1+`/`2`, compétences, Attributs, précision `-4…+4`, dégâts, portée, cadence, modes, signatures et alimentation.
- Relie famille, munitions et alimentation : les armes longues énergétiques excluent les projectiles physiques ; les armes de poing conservent toutes les solutions prévues.
- Ajoute les trois techno-lames validées : lame matérielle vibratoire et conducteur rétractable alimentés en CE ; lame à cristal accordé activée par le Prana, sans assimilation à une batterie.
- N’affiche que les blocs applicables au type : une arme ordinaire ne reçoit aucun réglage d’armure, un bouclier reste un profil d’arme explicite, et les réglages énergétiques n’apparaissent que lorsqu’ils sont utiles.
- Migre de façon additive et idempotente le schéma 5 vers le schéma 6. Seules les anciennes valeurs reconnues sont converties ; les valeurs locales ambiguës sont préservées et diagnostiquées.
- Renforce les tests des dépendances de famille, de l’échelle de précision, de la migration et de l’absence de champ texte mécanique dans les profils spécialisés. Les protections DialogV2, portraits, permissions, inventaires PJ/PNJ et transactions restent couvertes.
- 10-E4-P reste en recette jusqu’à validation explicite de la v0.6.1.

## 0.6.0 — 10-E4-P, matériel personnel

- Profils spécialisés édités dans chaque fiche Item : armes, protections et environnement, boucliers/champs, batteries et réserves CE, munitions, consommables PHA/MYS, chargeurs, monnaie physique et durabilité.
- Compatibilité exacte des munitions et chargeurs par chambrage, pression/énergie et interface ; la famille ne vaut jamais compatibilité. Chargeurs réutilisables avec vrais Items ordonnés et magasins internes avec profil, lot et masse conservés.
- Chargement, déchargement, transfert de CE et consommation soumis aux permissions, à l’état et à l’unicité de l’exemplaire ; compensation multi-Items et récupération MJ testées.
- Compatibilités de modules par type d’hôte, famille réelle, gabarit, technologie, interface et places ; modules, chargeurs et munitions imbriqués sous leur hôte, ports et chambres vides visibles.
- Consommables multi-usages, profils pharmaceutiques et énergétiques, diagnostics de structure, Fiabilité, Barrière, chaleur, alimentation et sécurité.
- Résumé du liquide physique réellement porté par le corps actif ; banque laissée non raccordée pour 10-G7/10-J1.
- Pieds des fiches Actor et Item alimentés par `PACKAGE_VERSION` ; non-régressions PJ/PNJ, portraits, DialogV2 et inventaire partagés conservées.
- Schéma 5, dépendances et migrations inchangés. Les sources/compendiums restent 10-K1-P/K2-P et la résolution de combat 10-F. 10-E4-P reste en recette jusqu’à validation explicite.

## 0.5.6 — Classification, menu d’état et suivi d’équipement

- Forme unique par Item, familles fonctionnelles, sous-couche vestimentaire et formes de port étendues ; aucune conversion automatique.
- Profils composés et quantités de places réservés au MJ ; ornements esthétiques distincts des objets à bonus.
- Limites validées de bijoux, cape, ceinture et gants ; coiffe partageant le casque ; piercings rattachés à une capacité corporelle explicite.
- Menu d’état à icônes et libellés avec motifs des refus ; remplacement du sélecteur d’état provisoire.
- Suivi sous la charge : mains, protections, accessoires et ouverture des vrais Items.
- Installation sur supports compatibles avec places libres et refus expliqués à la demande.
- Bouclier porté : mains requises déclarées selon sa source ; aucune fixation mains libres supposée.
- Permissions vérifiées sur la fiche, dans le service et sur les modifications de profil monde/embarqué ; non-régressions portraits, DialogV2, versions dynamiques et isolation.
- Schéma 5 et dépendances inchangés ; 10-E3-P a ensuite été validé par la recette utilisateur avant l’ouverture de 10-E4-P.

## 0.5.5 — Isolation des exemplaires et emplacements par type

- Remplace les tableaux initiaux mutables par des fabriques de listes indépendantes dans les modèles ; protège les mises à jour en place de Foundry 14.
- Filtre et valide les emplacements par type : bouclier pour les armes, six emplacements défensifs pour les armures, collier/bracelet/anneau pour les équipements.
- Compte les accessoires par corps (1 collier, 2 bracelets, 10 anneaux par défaut, ajustables par le MJ) et les boucliers portés ou tenus ; refus explicites.
- Vérifie aussi les profils des Items monde ; conserve les anciennes valeurs incompatibles avec diagnostic pour correction explicite.
- Tests d’isolation entre exemplaires de même catégorie/source/lot, fiches simultanées, permissions et saturation des places.
- Schéma 5 conservé, dépendances inchangées ; 10-E3-P toujours en recette, blocs B/C de 0.5.4 non validés.

## 0.5.4 — Complément 10-E3-P : emplacements structurés

- Sept emplacements corporels canoniques en sélection multiple, distincts de la couverture. Conflits nommés, occupation simultanée et ensembles stricts/assistés contrôlés.
- Capacités fournies et besoins techniques par type d’emplacement : nombres entiers, consommation cumulée par hôte, refus des capacités insuffisantes.
- Fiche Item unique, choix persistants, inventaires PJ/PNJ avec emplacements et usage des capacités.
- Modification des profils sous verrou d’inventaire : refus des nouveaux conflits sur les objets déjà équipés/installés.
- Ancien texte conservé et signalé pour reconfiguration explicite ; schéma 5, ajout de champs neutres sans migration destructive.
- Matrice Bible → implémentation → tests dans docs/10-E3-P-conformite.md. Complément en attente de recette, aucune clôture anticipée ni passage à 10-E4-P.

## 0.5.3 — Retours de validation de 10-E3-P

- Supprime Porté sur soi des choix ; Rangé reste l’état par défaut. Les anciens Items et ensembles carried sont interprétés comme rangés sans migration destructive.
- Affiche les motifs précis d’un refus d’équipement. Un refus ou une annulation ne produit plus de notification de réussite pour la commande d’état ou l’application d’un ensemble.
- Validation utilisateur de la passe 0.5.2 ; contrôle manuel sans propriété non effectué (MJ seul). Préparation de 10-E4-P selon la roadmap existante.
- Schéma 5 conservé, aucune dépendance modifiée.

## 0.5.2 — Propriétés d’équipement dans la fiche Item

- Remplace le dialogue de profil par une section de la fiche Item : choix persistants, enregistrement explicite, lecture seule sans propriété.
- Enregistre les listes de compatibilité à partir des cases réellement cochées ; une liste vide signifie aucune restriction déclarée.
- Emploie ForcedDeletion de Foundry 14 pour effacer le seul marqueur de récupération transactionnelle.
- Protège la réouverture des choix et le refus « toutes tailles sauf Moyen » sur un corps moyen.
- Schéma 5 inchangé ; aucune migration. 10-E3-P reste en recette.

## 0.5.1 — correction de recette : Items et portraits

- Autorise explicitement la famille d’usage vide, valeur initiale signifiant « selon le type d’objet ». Corrige la création et l’initialisation des Items existants rejetés par Foundry 14.
- Ajoute un bouton Modifier le portrait sur les fiches PJ/PNJ, séparé de l’affichage de l’image et soumis à la propriété.
- Renforce le contrôle des StringField initiaux vides et teste le sélecteur de portrait avec recontrôle des permissions.
- Conserve le verrouillage des dépendances, les seuils/mains saisis, les données et le schéma 5. Aucune migration ajoutée.
- 10-E3-P reste en recette : reprendre les contrôles bloqués avant de poursuivre.

## 0.5.0 — 10-E3-P, équipement personnel et charge lisible

- Bandeau de charge en kg, seuils explicites du corps actif, masse connue et données manquantes ; catégories/recherche/replis 0.4.3 conservés.
- États contextuels : ranger, porter, tenir à une/deux mains, équiper, poser au sol, installer lorsque le profil l’autorise.
- Contrôle des mains, des accès hérités, des corps, des tailles/natures déclarées, des slots, des quantités et des cycles d’installation.
- Profil d’usage configurable ; temps et aide affichés dans un aperçu sans coût de combat inventé.
- Cinq emplacements d’ensembles de références, application stricte ou assistée avec aperçu et contrôle de péremption.
- Opérations sérialisées localement, compensation et sauvegarde de récupération MJ en cas d’échec d’écriture.
- Masse des objets au sol et des autres corps exclue ; conversion kg/g et convention explicite pour liquides ordinaires ; anciennes données de volume/encombrement conservées.
- Champs additifs sans nouvelle migration, schéma stocké 5 ; DialogV2 et versions dynamiques préservés.
- Revue visuelle 0.4.3 validée ; 10-E3-P en attente de recette utilisateur, sans ajout de lot à la roadmap.

## 0.4.3 — revue visuelle de l’inventaire

- Catégories repliables communes aux PJ et PNJ, sans duplication des objets contenus.
- Recherche par nom insensible aux accents, révélant les ancêtres ; restauration des replis à l’effacement.
- Préférences locales par utilisateur et Actor, catégories vides optionnelles, détails matériels dépliables.
- Commandes conditionnelles, permissions, DialogV2 et version dynamique préservés ; schéma 5 inchangé.
- 10-E2-P validé par l’utilisateur ; cette passe visuelle attend sa recette. Aucun autre participant requis avant la procédure finale.

## 0.4.2 — inventaire administrable des PNJ

- Inventaire physique partagé entre PJ et PNJ : hiérarchie, lots, charges, capacités et diagnostics.
- Commandes conditionnelles de création, scission, fusion, déplacement et transfert réservées au propriétaire ; densités PNJ conservées.
- Version du pied de fiche injectée depuis `PACKAGE_VERSION`.
- Contrat DialogV2 0.4.1 et services transactionnels conservés ; schéma 5 inchangé, sans migration.
- 10-E2-P reste ouvert jusqu’à validation explicite de la recette 0.4.2 sur The Forge.

## 0.4.1 — formulaires d’inventaire Foundry 14

- Le nœud racine fourni à `DialogV2.input` est désormais un `div` strictement
  neutre, conformément au contrat Foundry 14 ; ses attributs visuels sont
  déplacés vers les champs enfants.
- Les commandes Créer, Scinder, Fusionner, Déplacer et Transférer peuvent de
  nouveau ouvrir leur formulaire.
- Le message de chargement injecte désormais la version courante du paquet au
  lieu de conserver le texte historique `0.3.0`.
- Aucun changement de schéma ni aucune migration de données supplémentaire.

## 0.4.0 — inventaire personnel et conteneurs 10-E2-P

- Remplacement de la liste d’Items physiques par un inventaire hiérarchique
  partagé par les Personnages et les PNJ, avec charge connue, emplacement, lot,
  état et accessibilité.
- Conteneurs modélisés comme Items frères : capacités de masse, volume,
  encombrement et unités, accès normal, rapide, restreint ou scellé, calcul de
  charge avec contenus imbriqués et refus des cycles.
- Création d’objets matériels depuis la fiche Actor, scission de piles,
  fusion strictement homogène et déplacement dans ou hors d’un conteneur.
- Transfert inter-Actor en deux phases : copie destination indisponible,
  remappage de toute l’arborescence, retrait de la source puis activation. Une
  interruption conserve au plus un exemplaire jouable et peut être récupérée au
  chargement MJ.
- Suppression brute d’un conteneur non vide refusée ; références historiques
  orphelines ou cycliques isolées et signalées sans suppression de données.
- Schéma Item 5 et migration additive depuis 0.3.6. Aucun état « porté, tenu,
  équipé ou installé » supplémentaire : ces règles restent réservées à
  10-E3-P.

## 0.3.6 — commandes ProseMirror de nouveau interactives

- La correction visuelle de l’éditeur n’est plus réappliquée lorsqu’un contrôle
  de la barre prend le focus ; la séquence native de clic reste intacte.
- La mise en page de la barre et de la surface éditable est initialisée une seule
  fois par ouverture de l’éditeur.
- Les boutons conservent leur positionnement natif ; seul leur bandeau parent
  porte le plan d’affichage nécessaire à la séparation visuelle.
- La surface de rédaction quitte son plan superposé et revient dans le flux de
  l’éditeur, sans perdre le contraste, la saisie visible ni la persistance.
- Aucun changement de schéma ni de données métier.

## 0.3.5 — barre ProseMirror séparée de la rédaction

- La barre d’outils native de ProseMirror est replacée dans le flux vertical,
  au-dessus de la surface éditable, avec sa propre hauteur et son propre plan
  d’affichage.
- Tous ses contrôles natifs restent accessibles : styles de paragraphe,
  tableaux, typographie, listes, alignement, médias, liens, source et
  enregistrement.
- Le fond brun résiduel est remplacé par un bandeau bleu graphite cohérent avec
  la fiche Item ; les boutons peuvent revenir à la ligne sur une fenêtre plus
  étroite.
- La visibilité du texte obtenue en 0.3.4 et le filtrage des Traits sont
  conservés sans changement de données ni de schéma.

## 0.3.4 — surface ProseMirror réelle et choix de Traits disponibles

- Détection de la surface `contenteditable` réellement créée par Foundry à
  l’ouverture de ProseMirror, y compris derrière un Shadow DOM ou un iframe.
- Application du contraste directement sur cette surface et ses nœuds de
  contenu lors de l’ouverture, du focus et de la saisie ; les styles des
  enveloppes ne peuvent plus masquer le texte actif.
- Les Traits déjà portés par l’Item disparaissent de la liste de choix. Leur
  retrait par la croix de la pastille les rend immédiatement disponibles.
- Aucun changement de schéma, de données métier ni de migration.

## 0.3.3 — montage réel de l’éditeur et protection des PV

- Montage de l’élément ProseMirror directement dans le DOM après rendu : sa
  configuration, sa hauteur et sa surface de saisie ne sont plus perdues par
  une sérialisation `outerHTML`.
- Contraste explicite des options du sélecteur de Traits sur le menu natif clair.
- La migration du modèle Personnage ignore désormais les mises à jour
  partielles signalées par Foundry ; celles-ci ne peuvent plus injecter les PV
  initiaux `10/10` ni les autres valeurs par défaut.
- Aucun changement de schéma et aucune réécriture automatique des données
  existantes.

## 0.3.2 — correctif d’interface des Items 10-E1-P

- Rendu explicite des options du sélecteur multiple : le catalogue canonique
  des Traits est désormais réellement visible dans Foundry.
- Correction du contraste du contenu ProseMirror pendant la saisie, sans
  modifier les descriptions déjà enregistrées.
- Affichage des noms de Qualité et de Rareté à la place des codes `Q-*` et
  `RAR-M *`, avec conservation des grades numériques dans les données.
- Aucun changement de schéma : les Items et Actors créés en 0.3.1 restent
  compatibles sans migration supplémentaire.

## 0.3.1 — correctif bloquant des Items 10-E1-P

- Suppression de la migration de modèle appliquée à tort aux mises à jour
  partielles : modifier un champ n’efface plus les valeurs déjà enregistrées.
- Ajout d’un contrat explicite d’applicabilité : une Ascendance et les autres
  types non concernés n’affichent plus Niveau, Qualité, rareté, légalité,
  fabricant ou prix.
- Remplacement du texte libre des traits par le sélecteur multiple natif de
  Foundry, alimenté par le vocabulaire canonique de la bible et doté de
  pastilles retirables.
- Remplacement du champ de description brut par l’éditeur riche ProseMirror de
  Foundry ; l’édition est réservée au MJ par défaut et peut être autorisée au
  propriétaire PJ Item par Item.
- Le portrait de l’Item ouvre désormais le sélecteur d’image natif de Foundry ;
  le chemin technique n’est plus exposé dans le bandeau.
- Migration additive vers le schéma 4, conservation des anciens traits libres
  jusqu’à leur retrait volontaire et ajout de tests de non-régression.

La version 0.3.0 est rejetée pour la recette : elle ne doit plus être utilisée.

## 0.3.0 — noyau commun des Items personnels 10-E1-P

- Remplacement des modèles réservés par un contrat Item commun sur les 26 types.
- Séparation autoritaire entre identifiant d’exemplaire, référence de source et
  version source, sans duplication dans la provenance.
- Ajout des traits, prérequis, effets référencés, Niveau, Qualité Q-0 à Q-5,
  rareté RAR-M 0 à 6, légalité, fabricant et prix de référence.
- Ajout de l’état physique aux armes, armures, équipements, consommables,
  munitions, ressources et conteneurs, avec totaux dérivés.
- Génération d’identifiants `WLD-ITM-*`, instantanés possédés indépendants et
  traçage des modifications locales.
- Fiche Item commune, responsive et en lecture seule pour les observateurs,
  avec diagnostics de source et provenance.
- Migration additive et idempotente des Items 0.2.4, sans contenu canonique
  fictif et sans perte de l’Action ou de l’Équipement de démonstration 10-C.
- Les opérations de conteneur et d’équipement restent réservées à 10-E2-P et
  10-E3-P.

## 0.2.4 — clôture technique 10-D2

- Remplacement de l’appel global déprécié `renderTemplate` par
  `foundry.applications.handlebars.renderTemplate`.
- Suppression de l’avertissement RE:LIS observé lors de la création d’une carte
  de Chat sous Foundry VTT 14.365.
- Aucun changement des règles, des Actors ou des données persistantes.
- La définition réelle du Mana, du Prana, du Flux et des besoins corporels reste
  rattachée aux futurs Items et compendiums canoniques.

## 0.2.3 — correctif bloquant d’initialisation 10-D2

- Correction des valeurs initiales imbriquées du Corps principal :
  `criticalFunctions`, `locations` et `needs` sont toujours définis.
- Correction de la Présentation identitaire initiale : `sourceRef` et
  `associatedPresentationId` sont toujours définis.
- Centralisation des valeurs initiales dans des fabriques retournant des objets
  neufs, afin d’éviter toute mutation partagée entre Actors.
- Ajout d’un test unitaire spécifique couvrant chaque champ signalé par la
  validation réelle de Foundry VTT 14.365.
- Classement de l’avertissement `FilePicker` comme provenant du module The Forge,
  sans rapport avec le système RE:LIS.

## 0.2.2 — modèles Personnage et PNJ 10-D2

- Ajout du champ `changes` v14 au modèle d’ActiveEffect RE:LIS ; l’erreur rouge
  de validation signalée par Foundry 14.365 est supprimée.
- Schéma de personne porté à la version 2 sans supprimer les données 0.2.1.
- Identité enrichie, trois âges, corps actif et présentation initiale structurés.
- Attributs et Compétences partagés par les Personnages et PNJ avec même moteur
  de jet et totaux dérivés complets.
- Santé étendue aux PV, Stress, Fatigue, Agonie, Stabilité, Surmenage et
  Contrecoup.
- Besoins corporels, défenses, mouvements, références et résumé biométrique
  réservés sans faux zéro.
- Trois densités PNJ fonctionnelles : Figurant, Secondaire et Majeur, sans perte
  de données lorsque l’affichage est condensé.
- Panneaux Personnage et PNJ reliés aux données persistantes ; secrets médicaux,
  identitaires et MJ maintenus hors de l’Actor accessible.

## 0.2.1 — correctifs de recette 10-D1

- Médaillon de portrait contraint à un carré réel avant son découpage circulaire.
- Bandeau, ressources, onglets et contenu placés dans un flux vertical non compressible.
- Onglets autorisés à revenir sur plusieurs lignes au lieu de disparaître hors écran.
- Pied de fiche isolé des styles Foundry et replacé après le contenu.
- Modification des réserves persistée par remplacement atomique de leur collection.
- CE renommées « CE — démo » et marquées comme ressource de recette non canonique.
- Maintien du Mana, du Prana et du Flux comme familles personnelles canoniques à raccorder.
- Test multijoueur réel reporté sans bloquer le jalon ; contrôles de propriétaire conservés.

## 0.2.0 — socle d’interface 10-D1

- Bandeau d’identité Personnage/PNJ inspiré des anciennes cartes ID RE:LIS.
- Palette graphite, bleu profond, cyan et ambre réalisée uniquement en CSS.
- Huit onglets Personnage et six onglets PNJ avec navigation au clavier.
- Barre récapitulative des PV, énergies, effets et Items existants.
- Répartition des fonctions validées de 10-C dans les panneaux appropriés.
- Modification manuelle des réserves d’énergie existantes.
- États d’attente explicites pour les modèles métier réservés à 10-D2–10-D6.
- Mise en page adaptative et maintien du défilement dans les petites fenêtres.
- Enregistrement de la fiche PNJ sans inventer son futur schéma de données.
- Compatibilité Foundry VTT 14 marquée vérifiée après la recette 10-C sur 14.365.

## 0.1.2 — clôture de recette 10-C

- Raccord explicite des 64 sous-types aux libellés localisés des fenêtres natives Foundry.
- Contraste renforcé de tous les textes des cartes de Chat, indépendamment du thème Foundry.
- Nom, intensité, durée et explication lisibles pour l’effet temporaire de démonstration.
- Affichage des effets actifs sur la fiche de personnage.
- Rafraîchissement d’un même effet provenant de la même Action au lieu d’un empilement de doublons.
- Nettoyage des doublons laissés par la version 0.1.1 lors du prochain lancement réussi de la même Action.
- Durée réinitialisée à partir du round, du tour et du temps mondial courants.
- Suppression automatique des effets arrivés à expiration par le registre Foundry.

## 0.1.1 — correctifs de recette 10-C

- Défilement vertical général des fiches Actor et Item sur les écrans de faible hauteur.
- Hauteur initiale de la fiche de personnage réduite et fenêtre bornée au viewport.
- Invariant persistant `0 ≤ PV actuels ≤ PV maximum`, y compris lorsque le maximum diminue.
- Traduction lisible des 64 sous-types Foundry, dont « Personnage joueur ».
- Libellés traduits dans les badges d’Items et les en-têtes de fiches.
- Workflows GitHub migrés vers les actions compatibles Node.js 24.
- Illustration de présentation du système enregistrée comme asset ultérieur à concevoir.

## 0.1.0 — tranche verticale 10-C

- Premier socle installable pour Foundry VTT 14.
- Enregistrement des 64 sous-types RE:LIS gelés en 10-B12.
- Fiche minimale de personnage et fiches minimales d’Action/Équipement.
- Jet d20, quatre degrés de résultat, coût en CE, carte de Chat et effet temporaire.
- Registre initial des 32 Settings.
- Construction, contrôles statiques et paquet de Release automatisés.
