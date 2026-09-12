# Journal des versions

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
