# Apex

Plateforme de pronostics football : pour chaque match, 4 pronostics calculés à partir de statistiques — **Issue**, **Buts**, **Bonus** (cartons, corners, fautes ou hors-jeu, seulement quand un signal est net) et **Score exact** — avec une courte synthèse écrite.

Le projet a deux parties :

| Dossier | Rôle |
|---|---|
| `src/` | Front-end (React 19 + TypeScript + Vite). Il affiche, il ne calcule rien. |
| `backend/` | Moteur de calcul, lot quotidien, évaluation des résultats et API. Node 22.18+, aucune dépendance. |

## Mise en ligne (Vercel + Supabase + GitHub Actions)

1. **Supabase** › SQL Editor : colle `backend/supabase/schema.sql` puis Run (si les tables existent déjà, colle seulement `backend/supabase/lecture-publique.sql`).
2. **GitHub** › Settings › Secrets and variables › Actions : crée `FOOTBALL_DATA_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (clé `service_role`, secrète) et, si tu les as, `GEMINI_API_KEY` et `THE_NEWS_API_KEY`.
3. **GitHub** › Actions › « Apex — lot quotidien » › Run workflow › `demarrage` (une seule fois : historique des 14 derniers jours, matchs des 6 prochains jours, puis pronostics IA d'aujourd'hui et demain). Ensuite le lot tourne tout seul chaque jour.
4. **Vercel** › Settings › Environment Variables : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (clé publique « anon »), supprime `VITE_DATA_SOURCE` ou mets `supabase`, puis redéploie.

**Bonus et cotes** : le lot télécharge gratuitement les CSV de football-data.co.uk (Premier League, Liga, Serie A, Bundesliga, Ligue 1, Liga Portugal ; pas la Ligue des champions) pour les cartons, corners, fautes et les cotes moyennes des bookmakers. Si un téléchargement échoue, l'app continue sans Bonus ni cotes. Les stats d'un match peuvent arriver avec quelques jours de retard : une fiche avec Bonus attend jusqu'à 3 jours avant d'être évaluée. `STATS_CSV=non` désactive ce complément.

Les jours passés sont des **rétro-calculs** : calculés après coup avec uniquement les données antérieures au match, sans IA, et signalés comme tels dans l'app.

## Démarrer avec les vraies données (en local)

```bash
npm install
npm run api          # back-end sur http://localhost:8787 (avec backend/.env configuré)
```

Dans un second terminal :

```bash
cp .env.example .env     # puis mettre VITE_DATA_SOURCE=api
npm run dev              # front sur http://localhost:5173
```

Le mode réel est la valeur par défaut. Le mode fictif reste disponible uniquement avec `VITE_DATA_SOURCE=demo` pour tester les états de l'interface. Il ne doit pas être utilisé en production.

Autres commandes : `npm run build` (vérification TypeScript + build), `npm run lint`, et dans `backend/` : `npm test`.

## Connexion (facultative)

Au premier lancement, un écran de bienvenue propose « Commencer » (voir les matchs sans compte) ou « Se connecter ». Les pages `/connexion` et `/inscription` utilisent Supabase Auth directement (sans bibliothèque). Pour les activer : dans Supabase, Authentication › Providers › Email est activé ; mets `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (clé publique « anon », jamais `service_role`) dans `.env` et dans les variables Vercel. Si « Confirm email » est actif, l'utilisateur doit cliquer le lien reçu avant de se connecter. Sans ces variables, l'app fonctionne sans compte.

## Écrans

Accueil (match vedette, matchs du jour, fiabilité) · Matchs (recherche et filtres) · Fiche d'un match (synthèse, 4 pronostics, forme, sources) · Historique (taux de réussite et résultats ✓/✗) · Actualités (articles synchronisés avec source externe) · Réglages (favoris, afficher les cotes, animations, à propos).

## Documentation

- `API-CONTRACT.md` : les 3 endpoints et le JSON échangé entre front et back-end.
- `backend/README.md` : fonctionnement du moteur, lot quotidien, branchement de vraies données.
- `docs/ancienne-spec/` : anciens documents, **obsolètes**, gardés pour mémoire.

## Structure du front

```
src/
  domain/contracts.ts    types partagés = contrat avec le back-end
  data/                  demo-provider (fictif), http-provider (back-end), index (choix)
  lib/                   routeur, formats, favoris, réglages, jour sélectionné, useAsync
  components/            briques d'interface
  pages/                 Home, Matches, Match, History, Settings
  styles.css             toute la feuille de style (thème sombre émeraude)
```

Principes d'interface : le risque est toujours écrit en toutes lettres (jamais la couleur seule), les animations respectent `prefers-reduced-motion` et le réglage « Animations », tout ce qui est cliquable fonctionne.
