# RE:LIS — méthode obligatoire

Avant de modifier un lot, lire les parties pertinentes de la Bible canonique et de la roadmap, y compris les décisions postérieures qui remplacent des états historiques. Le catalogue de tests ne remplace pas cette lecture.

Pour chaque lot, établir une correspondance explicite : exigence canonique → implémentation → contrôle automatisé → recette utilisateur. Distinguer implémenté, provisoire, différé avec lot cible, et non vérifié. Relire cette correspondance AVANT de déclarer le lot terminé. Ne jamais transformer la validation d’un correctif en preuve de couverture d’une fonctionnalité absente.

Préserver l’identité et tout l’historique des documents canoniques. Ne pas inventer de données canoniques, de formules manquantes, d’Ascendances ou d’objets. Les données de recette sont locales et supprimables.

Les recettes Foundry/The Forge sont effectuées par l’utilisateur seul, bloc par bloc. Pas d’intervenant extérieur avant la procédure finale ; pas de contrôle visuel par navigateur sans demande explicite. Ne pas déclarer clos un complément en attente de sa recette.

Préserver les corrections DialogV2 (div racine sans attribut), les versions dynamiques, les permissions et les données existantes. Ne pas effectuer de remplacement global de version dans package-lock.json : seuls les champs de version du paquet changent.

Vérifier TypeScript, ESLint, Prettier, tests, build, manifeste et paquet ; inspecter les trois ZIP avec unzip -t. Conserver la matrice de conformité avec les sources livrées.
