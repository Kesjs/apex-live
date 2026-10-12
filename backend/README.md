# Apex — back-end

Moteur de pronostics + API. **Aucune dépendance à installer** : Node 22.18 ou plus récent suffit (SQLite et le serveur HTTP sont intégrés à Node).

## Démarrer en 3 commandes

```bash
cd backend
npm run seed     # crée apex.db avec 3 semaines de données fictives (matchs passés évalués + matchs à venir)
npm run dev      # API sur http://localhost:8787
```

Puis, côté front (dossier racine) : copie `.env.example` en `.env` avec `VITE_DATA_SOURCE=api` et `VITE_API_URL=http://localhost:8787`, et lance `npm run dev`.

Autres commandes : `npm test` (22 tests), `npm run batch` (lot du jour), `npm run evaluer` (corrige les matchs terminés), `npm run typecheck`.

## Comment ça marche

```
Source (démo / JSON / ton API)  ──►  moteur déterministe  ──►  fiche JSON  ──►  SQLite  ──►  API  ──►  front
                                          │
                                          └─ synthèse : texte seulement (Gemini Flash, avec garde-fou)
```

1. **Lot quotidien** (`npm run batch`, à lancer chaque matin vers 04:00 avec cron) : pour chaque rencontre du jour, calcule la fiche et l'enregistre. Une fiche dont le match a commencé n'est plus jamais recalculée.
2. **Évaluation** (`npm run evaluer`, par exemple toutes les heures) : quand un match est terminé, compare chaque pronostic au résultat et remplit ✓/✗. Une fiche évaluée n'est jamais écrasée.
3. **API** : les 3 endpoints de `../API-CONTRACT.md` (+ `/api/sante`). Le front n'appelle jamais le moteur, il lit seulement ce qui est stocké.

Exemple de cron :

```
0 4 * * *  cd /chemin/apex/backend && node src/cli.ts batch
0 * * * *  cd /chemin/apex/backend && node src/cli.ts evaluer
```

## Le moteur (src/engine)

| Fichier | Rôle |
|---|---|
| `force.ts` | Force d'attaque/défense de chaque équipe à partir de ses 10 derniers matchs (les récents comptent plus), ramenée vers la moyenne de la ligue quand il y a peu de matchs → buts attendus de chaque équipe |
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
- **API directe** : écris une classe `MonFournisseur implements Source` dans `src/sources/` et ajoute-la dans `src/cli.ts`. Pas encore écrite, car aucun fournisseur n'est choisi et je ne peux pas tester une API réelle d'ici.

Ce qu'il faut obtenir du fournisseur, par équipe : les ~10 derniers matchs (buts pour/contre, et totaux de cartons, corners, fautes, hors-jeu du match si disponibles), les moyennes de la compétition, et les cotes. Attention aux quotas : les statistiques détaillées coûtent souvent un appel par match passé, donc il vaut mieux les mémoriser localement au lieu de les redemander chaque jour.

## Utiliser Supabase au lieu de SQLite

1. Dans Supabase : éditeur SQL → colle le contenu de `supabase/schema.sql` → Run. Cela crée la table `fiches` (sécurisée : aucun accès avec les clés publiques) et la fonction qui empêche d'écraser une fiche déjà évaluée.
2. Dans `backend/.env` : `STORE=supabase`, `SUPABASE_URL=…`, `SUPABASE_SERVICE_KEY=…` (clé `service_role` ou clé secrète, réservée au back-end).
3. Lance `npm run seed` puis `npm run dev` comme d'habitude.

L'adaptateur (`src/supabase-store.ts`) parle à l'API REST de Supabase, sans bibliothèque. Il est couvert par des tests avec un faux Supabase, mais **n'a pas été essayé sur un vrai projet Supabase** : fais d'abord un `npm run seed` et regarde la table `fiches` se remplir.

## À savoir (limites honnêtes)

- Les tests vérifient que le **code fait ce qu'il dit** ; ils ne prouvent pas que les pronostics sont **bons**. Avec les données fictives, les probabilités annoncées sont assez proches des résultats au milieu de l'échelle (≈ 65-75 %) mais un peu trop optimistes au-delà de 80 %.
- Un marché de cotes est en général bien plus précis qu'un modèle de forme sur 10 matchs : un « écart » avec la cote est le plus souvent une erreur du modèle, pas une opportunité. Le front l'appelle « Écart », pas « value bet ».
- Avant de t'y fier, laisse tourner quelques semaines sur de vraies données et regarde la page Historique : si « annoncé 75 % » donne « réel 60 % », il faut recalibrer (une calibration automatique à partir de l'historique est la suite logique).
- Les jours sont calculés en UTC.
- `node:sqlite` est encore marqué « expérimental » par Node ; si ça te gêne, passe sur Supabase (ci-dessous).
