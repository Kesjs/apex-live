# Apex — back-end

Moteur de pronostics + API. **Aucune dépendance à installer** : Node 22.18 ou plus récent suffit (SQLite et le serveur HTTP sont intégrés à Node).

## Démarrer avec les données réelles

```bash
cd backend
# renseigner .env : SOURCE=football-data, FOOTBALL_DATA_KEY, STORE=supabase,
# SUPABASE_URL et SUPABASE_SERVICE_KEY
npm run batch    # récupère les matchs du jour et calcule les fiches
npm run dev      # API sur http://localhost:8787
```

Puis, côté front (dossier racine), lance `npm run dev`. Le front lit le back-end réel par défaut.

Autres commandes : `npm test` (22 tests), `npm run actualites` (synchronise les articles), `npm run evaluer` (corrige les matchs terminés), `npm run typecheck`.

## Comment ça marche

```
Source football-data.org (CL + PL + PD + SA + BL1 + FL1 + PPL) ──► moteur déterministe ──► fiche JSON ──► Supabase ──► API ──► front
                                          │
                                          └─ synthèse : texte seulement (Gemini Flash, avec garde-fou)
```

1. **Lot quotidien** (`npm run batch`, à lancer à 04:00) : récupère les matchs de la journée, calcule les fiches et les enregistre. Une fiche dont le match a commencé n'est plus jamais recalculée.
2. **Évaluation historique** (`npm run evaluer`, à lancer à 03:00) : récupère les résultats des matchs terminés, compare chaque pronostic et remplit ✓/✗. Cela alimente l'historique consultable par les utilisateurs. Une fiche évaluée n'est jamais écrasée.
3. **API** : les 3 endpoints de `../API-CONTRACT.md` (+ `/api/sante`). Le front n'appelle jamais le moteur, il lit seulement ce qui est stocké.

Exemple de cron (serveur configuré sur le fuseau Africa/Porto-Novo) :

```
0 3 * * *  cd /chemin/apex/backend && npm run evaluer
0 4 * * *  cd /chemin/apex/backend && npm run batch
```

## Le moteur (src/engine)

| Fichier | Rôle |
|---|---|
| `force.ts` | Force d'attaque/défense de chaque équipe à partir de ses 5 derniers matchs, toutes compétitions confondues (les récents comptent plus), ramenée vers la moyenne de la ligue quand il y a peu de matchs → buts attendus de chaque équipe |
| `poisson.ts` | Loi de Poisson → matrice de tous les scores → probabilités (victoire, nul, plus/moins de buts, les deux marquent, scores exacts) |
| `marches.ts` | Choisit **Issue** (victoire si ≥ 62 %, sinon double chance) et **Buts** (marché le plus probable, en écartant les cotes < 1,15) ; propose 3 **scores** |
| `bonus.ts` | **Bonus** (cartons, corners, fautes, hors-jeu) : retenu seulement si les deux équipes sont ≥ 12 % au-dessus de la moyenne de la ligue et que la ligne est franchie dans ≥ 70 % des matchs ; sinon `null` |
| `value.ts` | Écart entre la probabilité du modèle et celle des cotes (marge retirée). Affiché seulement entre 8 et 20 points |
| `synthese.ts` | Gemini Flash met les chiffres en phrases. Si la réponse contient un chiffre absent de la fiche, une promesse (« garanti »…) ou a une mauvaise longueur, on utilise un texte généré sans IA |
| `fiche.ts` | Assemble le tout au format du contrat. Moins de 5 matchs récents → pas de pronostic, avec une raison affichée |

Tous les seuils sont des constantes en tête de chaque fichier : tu peux les ajuster.

## Brancher de vraies données

Le moteur ne sait pas d'où viennent les données : il lit une `Source` (`src/types.ts`, 3 méthodes : `rencontres(jour)`, `contexte(competition)`, `resultat(matchId)`).

- **Fichiers JSON** (prêt à l'emploi) : `SOURCE=json SOURCE_DIR=./donnees`. Format des fichiers décrit dans `src/sources/json-source.ts`. Tu peux alimenter ce dossier avec un petit script qui interroge le fournisseur de ton choix.
- **API directe** : `FootballDataSource` utilise exclusivement le forfait gratuit football-data.org pour la Champions League, Premier League, Liga, Serie A, Bundesliga, Ligue 1 et Primeira Liga. Les matchs du jour sont récupérés avec un appel groupé.

Ce qu'il faut obtenir du fournisseur, par équipe : les ~10 derniers matchs (buts pour/contre, et totaux de cartons, corners, fautes, hors-jeu du match si disponibles), les moyennes de la compétition, et les cotes. Attention aux quotas : les statistiques détaillées coûtent souvent un appel par match passé, donc il vaut mieux les mémoriser localement au lieu de les redemander chaque jour.

## Utiliser Supabase au lieu de SQLite

1. Le schéma `supabase/schema.sql` crée `fiches` et `actualites` (sécurisées : aucun accès avec les clés publiques) et la fonction qui empêche d'écraser une fiche déjà évaluée.
2. Dans `backend/.env` : `STORE=supabase`, `SUPABASE_URL=…`, `SUPABASE_SERVICE_KEY=…` (clé `service_role` ou clé secrète, réservée au back-end).
3. Lance `npm run seed` puis `npm run dev` comme d'habitude.

L'adaptateur (`src/supabase-store.ts`) parle à l'API REST de Supabase, sans bibliothèque. Il est couvert par des tests avec un faux Supabase, mais **n'a pas été essayé sur un vrai projet Supabase** : fais d'abord un `npm run seed` et regarde la table `fiches` se remplir.

## À savoir (limites honnêtes)

- Les tests vérifient que le **code fait ce qu'il dit** ; ils ne prouvent pas que les pronostics sont **bons**. Avec les données fictives, les probabilités annoncées sont assez proches des résultats au milieu de l'échelle (≈ 65-75 %) mais un peu trop optimistes au-delà de 80 %.
- Un marché de cotes est en général bien plus précis qu'un modèle de forme sur 10 matchs : un « écart » avec la cote est le plus souvent une erreur du modèle, pas une opportunité. Le front l'appelle « Écart », pas « value bet ».
- Avant de t'y fier, laisse tourner quelques semaines sur de vraies données et regarde la page Historique : si « annoncé 75 % » donne « réel 60 % », il faut recalibrer (une calibration automatique à partir de l'historique est la suite logique).
- Les jours sont calculés en UTC.
- `node:sqlite` est encore marqué « expérimental » par Node ; si ça te gêne, passe sur Supabase (ci-dessous).
