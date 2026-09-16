# RE:LIS — RE: Lost in Space pour Foundry VTT

Premier socle technique du système `relis`, ciblé sur Foundry VTT 14.365 et The Forge.

La version `0.5.1` corrige la création/lecture des Items et ajoute l’édition du portrait PJ/PNJ. Elle reprend 10-E3-P, équipement personnel et refonte du bandeau de charge : états contextuels, mains, compatibilités, installation personnelle, temps déclarés et ensembles avec aperçu. Les catégories repliables, la recherche par nom et les chemins des conteneurs validés en 0.4.3 sont conservés. Les sept
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

Les règles détaillées d’armes et de consommables restent dans 10-E4-P ;
les images/Présentations de Garde-Robe dans 10-D5. L’installation de ce lot
concerne un hôte physique personnel unique, hors conteneur. Détacher ses
installations avant de déplacer/transférer cet ensemble ; les plateformes
spécialisées restent dans les lots prévus.
Aucun catalogue fictif ni contenu canonique n’est livré. Les visuels fonctionnels
restent réalisés en CSS et en SVG interne jusqu’à la passe graphique finale.

Les trois densités PNJ sont conservées. Les commandes modifiables sont réservées
au propriétaire autorisé ou au MJ. Le pied de fiche affiche la version réelle.
10-E2-P et la revue visuelle 0.4.3 sont validés. 10-E3-P attend sa recette
0.5.1 sur The Forge. Aucun contrôle visuel automatisé par navigateur :
la recette utilisateur se fait seul, bloc par bloc ; les autres participants
restent réservés à la procédure finale.
Les préférences de repli restent locales au navigateur, par utilisateur et Actor.
Les nouveaux champs sont additifs avec valeurs initiales neutres : aucun
reclassement automatique des objets existants, aucune nouvelle migration,
version de schéma stockée 5 conservée. Les anciens états « préparés » sans
nombre de mains demandent une clarification explicite.

Les décisions financières enrichissent les lots existants : liquide en
10-E4-P, interface Banque du Datapad en 10-G7 et opérations bancaires en 10-J1.
Aucune étape supplémentaire ni solde fictif n’est créé dans 10-E3-P.

## Développement

Prérequis : Node.js 22 ou plus récent.

```bash
npm ci
npm test
npm run package
```

L’archive installable est créée sous `build/relis-v0.5.1.zip`. Son `system.json` se
trouve à la racine de l’archive, conformément au paquet téléchargé par Foundry. Le
paquet exclut les tests, les outils et les dépendances de développement ; il conserve
la source map du bundle afin que les erreurs de la recette distante soient traçables.

## Licence

Tous droits réservés — voir `LICENSE`. La visibilité publique du dépôt n’autorise
pas la réutilisation du code, du contenu ou des médias.
