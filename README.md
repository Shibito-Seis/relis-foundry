# RE:LIS — RE: Lost in Space pour Foundry VTT

Premier socle technique du système `relis`, ciblé sur Foundry VTT 14.365 et The Forge.

La version `0.8.2` poursuit la recette de 10-K2-P sans clore le lot. Les 20 Ascendances et les 12 Voies disposent désormais de descriptions développées issues de la Bible, en plus de leurs données mécaniques. L’inventaire PJ/PNJ permet au propriétaire autorisé ou au MJ de supprimer explicitement un Item, avec confirmation et refus protecteur si l’objet contient ou héberge encore d’autres Items. L’action entre Actors porte le libellé utilisateur « Échanger » sans modifier le service transactionnel validé. Les 84 Spécialisations font l’objet d’un rapport de propositions séparé : leur texte n’est pas injecté avant validation. Les références restent strictes, les identifiants Foundry stables et le schéma Item demeure 7, sans migration de monde.

L’Écarlithe noire brute, le Cœur d’Écarlithe incolore et la techno-lame de Prana sont de vrais Items distincts. Chaque Cœur reçoit un tirage stable de 20 situations dans une banque de 48 — 8 simples, 8 intermédiaires et 4 complexes — sur six axes et quinze couleurs. Réponses, choix MJ, nom coloré, sujet de l’accord et historique persistent. La couleur n’accorde aucun bonus mécanique. Le propriétaire répond pour son PJ ; le MJ répond pour un PNJ et garde seul la modification directe ou la réinitialisation. L’activation, la surcharge et la résolution de combat restent en 10-F.

Les 111 armes ont été recalculées. Arcs et arbalètes utilisent désormais Tir et Dextérité avec leurs flèches ou carreaux exacts ; les armes lancées utilisent aussi Tir et ajoutent la Force seulement lorsque leur profil le prévoit. Les boîtes de munitions créent le nombre réel de projectiles, les munitions libres ne portent plus l’interface du chargeur, et une arme laser n’exige plus une batterie artificiellement « laser ». Le rechargement unitaire enregistre la formule `1 + Dextérité`, dont l’automatisation d’action reste en 10-F. Les seize focaliseurs MYS affichent séparément tampon magique, CE, rang, formules et identité.

Le matériel validé en `0.6.2` reste intégralement protégé. Une arme énergétique n’est plus une réserve rechargeable : une batterie Item compatible s’insère dans l’arme et conserve ses propres CE. Les consommations de CE ou de munitions sont structurées par mode pour le futur moteur 10-F. Un chargeur détachable porte seul sa capacité et ses vrais Items de munitions ; une chambre seule vaut 1, tandis qu’un magasin interne déclare sa propre capacité. Les techno-lames à Prana reçoivent un véritable cristal Item, incolore et non accordé, jamais assimilé à une batterie. Les modules, munitions et sources installées sont présentés sous leur hôte ; l’inventaire affiche aussi les logements vides et la charge restante de la batterie insérée. Le liquide physique porté est résumé par devise, tandis que la banque reste explicitement non raccordée. 10-E3-P et 10-E4-P sont validés et toutes leurs protections restent actives. Les catégories repliables, la recherche par nom et les chemins des conteneurs validés en 0.4.3 sont conservés. Les sept
familles matérielles apparaissent dans un inventaire personnel hiérarchique :
quantité, lot, masse, volume, encombrement, état, accessibilité et emplacement
restent portés par les vrais Items de l’Actor.

Les conteneurs sont des Items frères reliés par référence. Leur charge est
reconstruite sans collection parallèle ; les cycles et dépassements de capacité
sont refusés. La fiche permet de créer un objet, scinder ou fusionner une pile,
déplacer une arborescence et échanger tout ou partie avec un autre Personnage
ou PNJ. L’échange prépare une copie indisponible, remappe les conteneurs,
retire la source puis active la destination afin qu’une erreur ne laisse pas deux
exemplaires jouables.

La charge principale est exprimée en kg avec les repères Chargé et Surchargé
renseignés par le MJ pour le corps actif. Sans seuils, aucun pourcentage n’est
inventé. Les masses absentes sont signalées ; les objets au sol, leurs contenus
et les objets des autres corps sont exclus de la charge portée.
Les unités kg/g se convertissent directement ; la convention 1 L ≈ 1 kg
s’applique seulement aux liquides déclarés ordinaires, si aucune masse explicite
n’est renseignée. Les volumes et anciennes valeurs d’encombrement restent conservés.

Le bouton d’état vérifie les mains, les quantités, les accès, les corps et les
slots déclarés. Le profil d’objet précise ses usages et restrictions. Les
ensembles mémorisent des références réelles ; l’application stricte ou assistée
présente les changements avant écriture. Les temps/aides sont affichés et
confirmés, sans débiter automatiquement une horloge ou des actions de combat.
Une interruption conserve une sauvegarde récupérable par le MJ.

La résolution des attaques, dégâts, protections et effets reste dans 10-F ; le
pipeline de sources de 10-K1-P alimente les compendiums publiés en 10-K2-P. Les
images/Présentations de Garde-Robe restent dans 10-D5. L’installation de ce lot
concerne un hôte physique personnel unique, hors conteneur. Détacher ses
installations avant de déplacer/transférer cet ensemble ; les plateformes
spécialisées restent dans les lots prévus.
Aucun catalogue fictif n’est livré : les entrées absentes du canon ne sont pas
complétées par supposition. Les visuels fonctionnels restent réalisés en CSS et
en SVG interne jusqu’à la passe graphique finale.

Les trois densités PNJ sont conservées. Les commandes modifiables sont réservées
au propriétaire autorisé ou au MJ. Le pied de fiche affiche la version réelle.
10-E2-P, la revue visuelle 0.4.3, 10-E3-P, 10-E4-P et 10-K1-P sont validés.
10-K2-P attend la recette 0.8.2. Aucun contrôle visuel automatisé par navigateur :
la recette utilisateur se fait seul, bloc par bloc ; les autres participants
restent réservés à la procédure finale.
Les préférences de repli restent locales au navigateur, par utilisateur et Actor.
Les nouveaux champs structurés sont additifs. La migration idempotente vers le
schéma 7 traduit seulement les anciennes valeurs reconnues et conserve les
valeurs locales ambiguës sans les deviner. Les anciens états « préparés » sans
nombre de mains demandent une clarification explicite.

Le liquide est porté par de vrais Items et le résumé n’inclut ni argent au sol,
ni autre corps. L’interface Banque du Datapad reste en 10-G7 et les comptes,
soldes et opérations bancaires en 10-J1. Aucun faux solde n’est créé.

## Développement

Prérequis : Node.js 22 ou plus récent.

```bash
npm ci
npm run content:check
npm test
npm run package
```

L’archive installable est créée sous `build/relis-v0.8.2.zip`. Son `system.json` se
trouve à la racine de l’archive, conformément au paquet téléchargé par Foundry. Le
paquet exclut les tests, les outils et les dépendances de développement ; il conserve
la source map du bundle afin que les erreurs de la recette distante soient traçables.

## Licence

Tous droits réservés — voir `LICENSE`. La visibilité publique du dépôt n’autorise
pas la réutilisation du code, du contenu ou des médias.

## 0.8.2 — descriptions et administration d’inventaire

- Développe les descriptions des 20 Ascendances et des 12 Voies depuis les passages canoniques de la Bible, sans transformer les Journaux d’Ascendance prévus en 10-D3 en simples Items.
- Ajoute sur les inventaires PJ et PNJ une commande rouge « Supprimer », réservée au propriétaire autorisé ou au MJ, confirmée avant écriture et bloquée tant que l’Item contient, héberge ou charge un autre Item.
- Renomme l’action utilisateur « Transférer » en « Échanger » ; le service transactionnel, ses verrous et ses protections contre perte ou duplication restent inchangés.
- Produit un audit séparé des 84 Spécialisations avec une proposition de description pour chacune. Ces propositions ne sont pas encore publiées dans les compendiums.
- Passe le contenu personnel en `1.2.1`, conserve le schéma Item 7 sans migration et protège portraits, permissions, versions dynamiques et contrat DialogV2 de Foundry 14. 10-K2-P reste ouvert jusqu’à validation explicite de la recette 0.8.2.

## 0.8.1 — correctif de recette 10-K2-P

- Réorganise les 2 404 Items dans 23 compendiums et des dossiers internes inspirés de l’ergonomie PF2e.
- Corrige les 111 armes, ajoute six profils de flèches/carreaux et transforme les conditionnements en quantités physiques réelles.
- Sépare chambrage, chargeur et batterie : l’interface appartient au chargeur ; la technologie d’effet ne filtre plus arbitrairement les batteries.
- Structure les seize focaliseurs MYS et remplace les descriptions techniques brutes par des descriptions lisibles issues du canon.
- Étend l’accord de l’Écarlithe à une banque de 48 situations, avec tirage stable de 20, persistance des réponses et véritable renommage chromatique.
- Conserve le schéma Item 7, les données existantes, les permissions, les portraits et le contrat DialogV2 de Foundry 14. 10-K2-P reste ouvert jusqu’à validation explicite de la recette 0.8.1.

## 0.8.0 — compendiums personnels canoniques 10-K2-P

- Publie 2 398 Items dans les compendiums Création, Progression et Matériel, avec comptes et types contrôlés automatiquement.
- Couvre toutes les familles personnelles prévues par la Bible v162 ; les références croisées sont strictes et aucune entrée fictive ne comble les absences du canon.
- Ajoute les vrais Items d’Écarlithe et l’accord du Cœur à quinze couleurs, persistant et historisé, avec les permissions PJ/PNJ/MJ prévues.
- N’invente ni jet d’Action, ni bonus de couleur, ni règle de combat différée à 10-F.
- Conserve le schéma Item 7, les inventaires, portraits, permissions, contrats DialogV2 et versions dynamiques. 10-K2-P reste en recette jusqu’à validation explicite de la v0.8.0.

## 0.7.0 — pipeline des données personnelles 10-K1-P

- Ajoute trois familles de sources versionnées pour la création, la progression et le matériel personnel, sans livrer de contenu fictif.
- Valide formats, types, doublons, identifiants, aliases, références, versions et champs réservés avant toute construction.
- Dérive des `_id` Foundry stables depuis les identifiants canoniques et produit deux fois les mêmes sources à entrées identiques.
- Compile les futures bases LevelDB au moyen de `@foundryvtt/foundryvtt-cli` ; seules les familles contenant de vrais Items seront intégrées au paquet.
- Fixe la nomenclature Écarlithe, les états brut/incolore/accordé et le contrat du questionnaire de couleur. La couleur n’est ni un alignement ni un bonus mécanique.
- Conserve le schéma Item 7 et toutes les données existantes. 10-K1-P reste en recette jusqu’à validation explicite de la v0.7.0 ; 10-K2-P produira ensuite tous les compendiums personnels canoniques.

## 0.6.2 — sources installées et consommation structurée 10-E4-P

- Une batterie est un Item installable qui conserve ses CE ; l’arme ne possède plus de champ de charge actuelle ou maximale et refuse tout transfert direct de CE.
- Un cristal de Prana est un Item installable réservé à la techno-lame correspondante. Il reste incolore et non accordé ; aucune couleur, aucun questionnaire et aucun nom dérivé de « kyber » ne sont inventés.
- Les armes distinguent chambre seule, magasin interne, chargeur détachable et alimentation hybride. Seul le magasin interne porte une capacité sur l’arme ; le chargeur détachable porte la sienne.
- Les consommations de munitions et de CE sont enregistrées par mode de tir. Leur débit lors d’une attaque reste réservé à 10-F.
- Le schéma 7 migre seulement les anciennes capacités internes et consommations non ambiguës. Les anciens champs sont conservés sans suppression de données.
- 10-E4-P reste en recette jusqu’à validation explicite de la v0.6.2.

## 0.6.1 — registres fermés et fiches spécialisées 10-E4-P

- Remplace les champs mécaniques libres du matériel personnel par des listes, sélecteurs multiples et valeurs chiffrées bornées issus de la Bible.
- Sépare les huit familles d’armes, les accès, mains `1`, `1+`, `2`, compétences, Attributs, dégâts structurés, portées, cadences, modes, signatures et alimentations.
- Filtre les alimentations par famille : armes longues énergétiques sans balles physiques ; armes de poing polyvalentes ; techno-lames vibratoire et à conducteur sur CE, techno-lame à cristal sur Prana sans batterie.
- Spécialise les fiches : aucun réglage d’armure sur une arme ordinaire, aucun réglage de bouclier sur une armure ou un équipement, et aucun profil énergétique sur une arme qui n’en consomme pas.
- Passe au schéma 6 avec une migration additive et idempotente des valeurs 0.6.0 reconnues. Les données ambiguës restent conservées et diagnostiquées.
- Ajoute les contrôles automatisés des dépendances, de la précision `-4…+4`, de l’absence de champ texte mécanique dans les profils spécialisés et des non-régressions 10-E3-P/10-E4-P.

## 0.6.0 — matériel personnel 10-E4-P

- Les fiches Item stockent les profils structurés prévus par la Bible : arme, protection et environnement, champ/barrière, énergie, alimentation consommable, munition exacte, consommable PHA/MYS, monnaie physique, chargeur et durabilité.
- Le moteur refuse une munition ou un chargeur incompatibles par chambrage, classe de pression/énergie ou interface ; une famille d’arme ne suffit jamais. Un chargeur conserve ses vrais Items et leur ordre. Les magasins internes conservent profil, lot et masse sans dupliquer la pile source.
- Les CE sont transférées seulement entre formats et classes de puissance compatibles, dans les limites de réserve et de sortie. Les consommables multi-usages conservent l’Item épuisé au lieu de le faire disparaître prématurément.
- Les modules vérifient type d’hôte, famille réelle, gabarit, technologie, interface et places techniques. L’inventaire affiche sous l’hôte les modules, chargeurs et munitions réellement liés, ainsi que les chambres et magasins vides.
- Le bandeau financier additionne uniquement le liquide physique porté par le corps actif. La banque reste « Non raccordé » jusqu’aux lots prévus.
- Les mutations multi-Items possèdent une sauvegarde de récupération MJ et une compensation testée. Les commandes restent réservées au propriétaire ou au MJ et partagées entre PJ et PNJ.
- Schéma 5 et dépendances conservés, sans migration. 10-E4-P reste en recette jusqu’à validation explicite ; aucun catalogue de compendium 10-K ni automatisme de combat 10-F n’est anticipé.

## Correctif 0.5.6 — emplacements propres à chaque objet

Chaque liste initiale est créée séparément par document, sans tableau mutable partagé entre exemplaires. Les cases et l’enregistrement sont limités à la fiche de l’Item ciblé, jamais à sa catégorie, sa source ou son lot.

- Arme : Bouclier porté uniquement, en cochant ce choix pour déclarer un bouclier. Les prises en main restent disponibles.
- Armure : Sous-couche, Armure principale, Sous-casque, Casque, Protections de bras, Jambières. Cela inclut les combinaisons et exo-armures.
- Équipement : Collier, Bracelet, Anneau. Chaque case consomme une place ; les capacités ordinaires sont 1, 2 et 10, ajustables par le MJ dans la configuration du corps actif. Cela ne donne aucun effet ni protection automatique.
- Autres types physiques : aucun choix corporel de ces catégories. Les installations techniques restent distinctes.

Les anciennes valeurs incompatibles sont signalées. Corriger uniquement les objets concernés et enregistrer leur fiche ; aucune remise à zéro ni conversion automatique du type. Recharger complètement le monde après mise à jour, puis commencer la recette par l’isolation entre objets.

## Classification et suivi — 0.5.6

Dans la fiche Item, choisir la famille fonctionnelle et une seule forme de port. La sous-couche vestimentaire (tenue civile, travail, climat) reste Équipement ; la sous-couche défensive reste Armure. Les armes n’ont que la forme Bouclier en plus de Sans port corporel. La coiffe à bonus partage Casque principal. Le MJ peut définir un profil composé et le nombre de places occupées (ex. une paire de bracelets). Chaque exemplaire reste indépendant.

Capacités usuelles approuvées : collier 1, bracelets 2, anneaux 10, cape 1, ceinture 1, paire de gants 1. Les boucles gauche/droite ont chacune une place de fonctionnement, ajustable par corps. Aucun quota de vêtements, chaussures, lunettes, badges ou harnais n’est inventé. Les piercings à bonus utilisent une capacité explicite de leur emplacement corporel : zéro par défaut tant qu’elle n’est pas définie. Les ornements purement esthétiques déclarés par le MJ n’occupent pas de place. Cela ne calcule aucun bonus d’objet.

Le menu d’état affiche icône, libellé et motif de refus. Le choix engage la commande transactionnelle avec vérification fraîche des conditions ; le temps/aide reste déclaré, sans débit automatique. Installer sur… ne propose à la sélection que les supports disponibles et explique les autres refus dans un détail. Le suivi affiche les objets derrière chaque compteur et ouvre leurs fiches.

Les anciens profils sont conservés ; une sélection incohérente est diagnostiquée, puis corrigée explicitement dans sa fiche. Les profils canoniques, bonus et interfaces de montage spécialisés restent 10-E4-P ; sources/compendiums en 10-K1-P/K2-P ; dérivations anatomiques dans les lots du corps déjà prévus. Aucun nouveau lot.
