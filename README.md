# RE:LIS — RE: Lost in Space pour Foundry VTT

Premier socle technique du système `relis`, ciblé sur Foundry VTT 14.365 et The Forge.

La version `0.6.0` livre la mécanique de recette de 10-E4-P : profils spécialisés d’armes, protections, alimentations, munitions et consommables directement dans chaque fiche Item ; chargeurs réutilisables ; chargement interne ou en chambre ; transfert de CE ; usages de consommables ; durabilité et diagnostics. Les modules et munitions sont présentés sous leur hôte, avec ports, capacité et chambres vides visibles. Le liquide physique porté est résumé par devise, tandis que la banque reste explicitement non raccordée. 10-E3-P est validé et toutes ses protections restent actives. Les catégories repliables, la recherche par nom et les chemins des conteneurs validés en 0.4.3 sont conservés. Les sept
familles matérielles apparaissent dans un inventaire personnel hiérarchique :
quantité, lot, masse, volume, encombrement, état, accessibilité et emplacement
restent portés par les vrais Items de l’Actor.

Les conteneurs sont des Items frères reliés par référence. Leur charge est
reconstruite sans collection parallèle ; les cycles et dépassements de capacité
sont refusés. La fiche permet de créer un objet, scinder ou fusionner une pile,
déplacer une arborescence et transférer tout ou partie vers un autre Personnage
ou PNJ. Le transfert prépare une copie indisponible, remappe les conteneurs,
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

La résolution des attaques, dégâts, protections et effets reste dans 10-F ; les
sources générées et vrais compendiums restent dans 10-K1-P/K2-P. Les
images/Présentations de Garde-Robe restent dans 10-D5. L’installation de ce lot
concerne un hôte physique personnel unique, hors conteneur. Détacher ses
installations avant de déplacer/transférer cet ensemble ; les plateformes
spécialisées restent dans les lots prévus.
Aucun catalogue fictif ni contenu canonique n’est livré. Les visuels fonctionnels
restent réalisés en CSS et en SVG interne jusqu’à la passe graphique finale.

Les trois densités PNJ sont conservées. Les commandes modifiables sont réservées
au propriétaire autorisé ou au MJ. Le pied de fiche affiche la version réelle.
10-E2-P, la revue visuelle 0.4.3 et 10-E3-P sont validés. 10-E4-P attend sa
recette 0.6.0 sur The Forge. Aucun contrôle visuel automatisé par navigateur :
la recette utilisateur se fait seul, bloc par bloc ; les autres participants
restent réservés à la procédure finale.
Les préférences de repli restent locales au navigateur, par utilisateur et Actor.
Les nouveaux champs sont additifs avec valeurs initiales neutres : aucun
reclassement automatique des objets existants, aucune nouvelle migration,
version de schéma stockée 5 conservée. Les anciens états « préparés » sans
nombre de mains demandent une clarification explicite.

Le liquide est porté par de vrais Items et le résumé n’inclut ni argent au sol,
ni autre corps. L’interface Banque du Datapad reste en 10-G7 et les comptes,
soldes et opérations bancaires en 10-J1. Aucun faux solde n’est créé.

## Développement

Prérequis : Node.js 22 ou plus récent.

```bash
npm ci
npm test
npm run package
```

L’archive installable est créée sous `build/relis-v0.6.0.zip`. Son `system.json` se
trouve à la racine de l’archive, conformément au paquet téléchargé par Foundry. Le
paquet exclut les tests, les outils et les dépendances de développement ; il conserve
la source map du bundle afin que les erreurs de la recette distante soient traçables.

## Licence

Tous droits réservés — voir `LICENSE`. La visibilité publique du dépôt n’autorise
pas la réutilisation du code, du contenu ou des médias.

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
