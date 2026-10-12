# Apex — Audit et plan d’implémentation complet

Mise à jour : 8 octobre 2026

## 1. État audité

### Ce qui fonctionne

- Shell responsive avec sidebar desktop et navigation mobile à quatre destinations.
- Accueil avec date, match vedette, aperçu Apex IA, prochains matchs et provenance.
- Changement de date avec chargement différé et annulation du timer précédent.
- Panneau natif accessible pour l’analyse et la provenance : fermeture Échap et restitution du focus.
- États de démonstration : succès, chargement, aucun match pertinent, données insuffisantes, données périmées et erreur fournisseur.
- Fixtures isolées dans `src/data/demo.ts`.
- Palette claire officielle et détecteur Impeccable sans findings.
- Build et lint ciblé `src` validés.

### Ce qui est encore simulé

- `/matchs`, `/apex-ia` et `/profil` sont maintenant des surfaces fonctionnelles de démonstration, avec filtres, états et actions locales.
- Aucun fournisseur football réel n’est connecté.
- Aucun appel IA réel n’est effectué.
- Aucun compte, favori, historique ou préférence n’est persisté.
- Les équipes, horaires, fraîcheurs et analyses sont fictifs.

### Défauts à corriger avant les vraies données

- Les scénarios de démonstration devront être réservés au mode développement.
- La grille, le clavier et le touch devront être retestés avec une matrice de viewport automatisée et des appareils réels.
- Aucun test de contrat ne protège encore la provenance, la fraîcheur ou la limite de recommandations.

## 2. Ordre de construction

### Phase 0 — Décisions bloquantes

- [ ] Choisir le fournisseur football après comparaison des coûts, droits, couverture, quotas et fraîcheur.
- [ ] Valider compétitions, pays couverts et fenêtre d’historique.
- [ ] Définir l’expiration par type de donnée.
- [ ] Valider budgets API, IA, stockage et observabilité.
- [ ] Valider conservation, âge minimum, consentement et mentions de responsabilité.

Sortie : décisions consignées dans `DECISIONS.md`.

### Phase 1 — Contrats métier indépendants du fournisseur

- [x] Définir les premiers contrats `Match`, `Team`, `Competition`, provenance et statuts dans `src/domain/contracts.ts`.
- [x] Ajouter `sourceId`, `sourceLabel`, `observedAt`, `freshnessLabel` et `mode` (`synthetic` ou `real`).
- [x] Définir les statuts de disponibilité d’analyse et le résultat provider typé.
- [x] Définir `Analysis`, `AnalyticalSolidity`, `Factor` et l’absence valide de recommandation.
- [ ] Compléter `Absence`, `FormSnapshot`, `HeadToHead` et `GoalTrend`.
- [ ] Garantir la limite de zéro à trois recommandations par validation runtime.
- [ ] Écrire les fixtures de contrat et les tests de validation.

Sortie : les composants React ne dépendent plus d’objets de fixture ad hoc.

### Phase 2 — Provider football et normalisation

- [x] Créer l’interface `FootballDataProvider`.
- [x] Implémenter `DemoFootballProvider` avec les fixtures actuelles.
- [ ] Implémenter ensuite l’adaptateur du fournisseur sélectionné.
- [ ] Normaliser équipes, compétitions, heures, fuseaux, statuts et événements.
- [ ] Rejeter toute réponse sans provenance ou date d’observation.
- [ ] Ajouter cache, timeout, retry borné, circuit d’erreur et journalisation.
- [ ] Empêcher qu’une erreur fournisseur remplace silencieusement les données par des fixtures.

Sortie : l’Accueil fonctionne avec le provider démo ou réel via la même interface.

### Phase 3 — Shell et routes complètes

- [x] Remplacer les placeholders par les écrans de démonstration Accueil, Matchs, Apex IA et Profil.
- [x] Conserver quatre destinations MVP, sans Actualités active.
- [x] Ajouter la navigation locale persistante dans l’URL et le retour navigateur de base.
- [x] Préserver le focus après navigation et changement de date.
- [x] Ajouter un panneau détail de match accessible depuis Accueil, Matchs et Apex IA.
- [ ] Ajouter les URLs détaillées `/matchs/:fixtureId` et `/apex-ia/:recommendationId` lorsque le routeur final sera choisi.

Sortie : chaque destination possède loading, vide, erreur, insuffisant, périmé et succès.

### Phase 4 — Accueil et Matchs

- [ ] Alimenter le match vedette par pertinence analytique, qualité des données et disponibilité de l’analyse.
- [x] Construire la liste complète avec date sélectionnée et filtres simples.
- [x] Afficher source, observation et fraîcheur dans le mode fictif sans les présenter comme réelles.
- [ ] Garder le live comme information secondaire.
- [x] Ajouter dans le détail les sections forme, domicile/extérieur, confrontations, buts et absences en mode fictif.
- [ ] Bloquer ou dégrader visiblement l’analyse si les données sont insuffisantes ou périmées.

Sortie : l’utilisateur identifie un match, comprend sa sélection et ouvre son détail.

### Phase 5 — Apex IA

- [ ] Calculer d’abord les indicateurs déterministes et vérifiables.
- [ ] Construire un payload limité aux données réellement disponibles.
- [ ] Ajouter génération structurée, validation de schéma et refus des données manquantes.
- [ ] Produire au maximum une à trois recommandations, ou aucune.
- [x] Afficher solidité analytique, facteurs, risques, limites et provenance dans les surfaces fictives.
- [ ] Interdire garantie, gain certain et probabilité présentée comme certitude.
- [ ] Ajouter budget, timeout, fallback et journal des générations.

Sortie : chaque analyse est explicable, traçable et peut conclure qu’aucune recommandation n’est possible.

### Phase 6 — Profil, Auth et données personnelles

- [x] Garder la consultation publique sans compte.
- [x] Afficher honnêtement le statut non connecté et expliquer les actions qui nécessiteront un compte.
- [ ] Ajouter authentification Supabase.
- [ ] Ajouter profil, préférences, favoris et historique.
- [ ] Ajouter RLS et séparation données publiques / utilisateur.
- [ ] Gérer non connecté, connecté, session expirée et erreur.
- [ ] Ne jamais créer de fausse session en mode démo.

Sortie : les actions personnelles sont persistées et protégées.

### Phase 7 — Historique et évaluation

- [ ] Modéliser `won`, `lost`, `void`, `unevaluated` sans promesse.
- [ ] Conserver publication, version d’analyse, sources et règle d’évaluation.
- [ ] Afficher les recommandations non évaluées séparément.
- [ ] Empêcher toute modification silencieuse de l’historique.

Sortie : historique transparent et auditable.

### Phase 8 — Vérification finale

- [ ] Tests unitaires des contrats, normalisation, fraîcheur et limite de recommandations.
- [ ] Tests composants des quatre routes et de tous les états.
- [ ] Tests end-to-end : navigation, date, détail, provenance, favoris, erreur provider et focus.
- [ ] Matrice responsive : 360, 390, 430, 768, 1280 et 1440 px.
- [ ] Vérification clavier, lecteur d’écran, contraste, zoom 200 % et `prefers-reduced-motion`.
- [ ] Vérification absence de cotes obligatoires, promesses de gain et données sans source.
- [ ] Build de production, bundle et logs.

Sortie : release candidate avec limites restantes documentées.

## 3. Animations à construire

- Sélection de date : 160–180 ms, sans déplacement du shell.
- Chargement : skeleton statique ou transition légère, sans shimmer obligatoire.
- Ouverture provenance/détail : 180–220 ms, interrompable.
- Feedback d’action : 160 ms, sans bounce.
- Navigation : transition minimale.
- `prefers-reduced-motion` : aucune animation décorative.

## 4. Règle de livraison

Le frontend peut être construit entièrement avec les données fictives, mais chaque fixture doit respecter le contrat réel : source, observation, fraîcheur, statut et mode. Le branchement réel doit ensuite remplacer le provider, pas réécrire les parcours.

## 5. Prochaine tâche recommandée

Commencer par les tests de contrats et la matrice de vérification. Ensuite comparer les fournisseurs football et remplacer `DemoFootballProvider` par un adaptateur réel sans modifier les parcours.
