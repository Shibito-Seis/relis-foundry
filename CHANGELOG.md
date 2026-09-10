# Journal des versions

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
