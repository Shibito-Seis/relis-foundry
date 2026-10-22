# 10-D3 — Matrice de conformité v0.9.1

Base exacte : Bible v168, audit personnel 0.8.4 validé et catalogues canoniques 10-K2-P. 10-D3 reste en recette jusqu’à validation explicite de l’utilisateur.

| Exigence canonique                       | Implémentation v0.9.1                                                                                      | Contrôle automatisé                                | Recette |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------- |
| Douze étapes dans l’ordre validé         | Voie en 5, Attributs en 6, Compétences en 7 ; navigation latérale à icônes et pied fixe                    | `character-creation.test.ts`                       | B1      |
| Brouillon reprenable sans Actor partiel  | Flag utilisateur versionné, sauvegarde automatique/manuelle ; `Actor.create` uniquement à la confirmation  | tests du modèle et inspection de source            | B2–B3   |
| Création finale idempotente              | `draftId` recherché avant écriture ; double confirmation renvoie l’Actor existant                          | test du contrat de source                          | B8      |
| Catalogues réels, aucune liste parallèle | sélecteurs chargés depuis `game.packs`, recherche accent-insensible, défilement et lecture avant sélection | tests de contenu et de sélecteur                   | B4–B7   |
| Attributs de niveau 1                    | Ascendance, Profil standard/marqué, Voie, quatre augmentations distinctes                                  | `character-creation.test.ts`                       | B5      |
| Compétences Qualifiées                   | deux de Profil en étape 4, obligatoires et quota de Voie en 5, choix libres en 7 ; Favori purement visuel  | `character-creation.test.ts`                       | B6      |
| PV et réserves naturelles                | `PV Ascendance + Niveau × (PV Voie + Vigueur)` et profils Mana/Prana/Flux                                  | `character-creation.test.ts`                       | B7      |
| Choix différés                           | Talents, crédits ou dotations non résolus restent explicites ; vrais Items matériels sélectionnables       | `character-creation.test.ts`                       | B7      |
| Création strictement niveau 1            | Niveau visible et verrouillé ; une altération de brouillon bloque la confirmation                          | `character-creation.test.ts`                       | B6      |
| Contraintes Atouts / Handicaps           | valeurs, relations, effets et choix fermés structurés ; détail narratif attaché à chaque sélection         | `character-creation.test.ts`, `k2-content.test.js` | B6–B8   |
| Nature corporelle                        | biologique sauf IAA synthétique ; valeur déduite de l’Ascendance, non choisie librement                    | `k2-content.test.js`                               | B5      |
| Affectations                             | quatre Postes principaux uniques séparés des sept Postes secondaires, un de chaque à la création           | tests de règle et de contenu                       | B9      |
| Portrait et Token                        | sélection par `FilePicker`, aperçu, retrait et validation des extensions avant création                    | test de source et validation de règle              | B10     |
| Échec de finalisation                    | aucun appel de suppression si Foundry n’a retourné aucun Actor                                             | test du contrat de source                          | B12     |
| Sélection manuelle proche de PF2e        | loupe de compendium, recherche, référence active et corbeille explicite                                    | `character-build-view.test.js`                     | C1–C4   |
| Données héritées préservées              | doublons diagnostiqués ; aucune Ascendance n’est supprimée automatiquement                                 | `character-build-view.test.js`                     | C2      |
| Remplacement manuel non destructif       | l’ancienne référence devient historique ; seule la corbeille confirmée retire l’Item                       | `character-build-view.test.js`                     | C4      |
| Construction hors inventaire             | types de construction exclus du bloc `relatedItems`, panneaux Identité/Progression dédiés                  | test de gabarit                                    | C1      |
| Permissions                              | boutons d’écriture rendus avec `data-owner-control`, services revérifiant propriétaire/MJ                  | test de gabarit                                    | C4      |
| Journaux d’Ascendance                    | 26 `JournalEntry` dérivées des descriptions des Ascendances sélectionnables                                | `ancestry-journals.test.js`, compilation LevelDB   | D1      |
| DialogV2 0.4.1                           | racine `div` nue ; classe portée par l’enfant du navigateur                                                | test de source et non-régressions existantes       | D3      |
| Schéma et migrations                     | paquet 0.9.1, contenu 1.4.1, schéma Item 7, aucune migration                                               | manifeste, tests, validation du paquet             | A/D     |

## Frontières conservées

- 10-D4 conserve progression, choix différés après création et réentraînement.
- 10-D5 conserve plusieurs Corps, Présentations, portraits, Tokens et Garde-Robe complète.
- 10-F conserve l’exécution des Actions, effets passifs en combat et automatismes de rechargement.
- 10-J conserve les comptes bancaires et opérations ; 10-D3 ne crée qu’un Item de crédits physiques lorsque ce choix est explicitement résolu.
- L’équipement initial peut rester en attente lorsque le catalogue ne fournit pas une attribution univoque. Aucun objet canonique n’est inventé.

## État

Le code et les documents sont construits et contrôlés localement. Cela ne vaut pas validation fonctionnelle : 10-D3 demeure ouvert jusqu’au retour explicite sur `RE-LIS_Recette10_D3_v0.9.1.md`.
