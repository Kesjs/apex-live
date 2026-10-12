# Apex

Plateforme de pronostics football : pour chaque match, 4 pronostics calculés à partir de statistiques — **Issue**, **Buts**, **Bonus** (cartons, corners, fautes ou hors-jeu, seulement quand un signal est net) et **Scores exacts** — avec une courte synthèse écrite.

Le projet a deux parties :

| Dossier | Rôle |
|---|---|
| `src/` | Front-end (React 19 + TypeScript + Vite). Il affiche, il ne calcule rien. |
| `backend/` | Moteur de calcul, lot quotidien, évaluation des résultats et API. Node 22.18+, aucune dépendance. |

## Démarrer (tout en local, avec des données fictives)

```bash
npm install
npm run api:seed     # crée la base avec 3 semaines de données fictives
npm run api          # back-end sur http://localhost:8787   (laisser ce terminal ouvert)
```

Dans un second terminal :

```bash
cp .env.example .env     # puis mettre VITE_DATA_SOURCE=api
npm run dev              # front sur http://localhost:5173
```

Sans back-end, le front fonctionne seul : `VITE_DATA_SOURCE=demo` (valeur par défaut) utilise des données fictives intégrées. Ajouter `?demo=erreur` ou `?demo=vide` à l'adresse pour voir les écrans d'erreur et d'absence de match.

Autres commandes : `npm run build` (vérification TypeScript + build), `npm run lint`, et dans `backend/` : `npm test`.

## Écrans

Accueil (match vedette, matchs du jour, fiabilité) · Matchs (recherche et filtres) · Fiche d'un match (synthèse, 4 pronostics, forme, sources) · Historique (taux de réussite et résultats ✓/✗) · Réglages (favoris, afficher les cotes, animations, à propos).

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
