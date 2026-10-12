# Contrat d'API Apex (front-end ⇄ back-end)

Le front-end n'invente rien : il affiche ce que ton back-end renvoie. Les types
exacts sont dans `src/domain/contracts.ts` (c'est la référence ; ce document
n'est qu'un résumé avec des exemples).

Règles générales

- Réponses en JSON, `Content-Type: application/json`.
- Probabilités : nombres entre **0 et 1** (`0.82` = 82 %).
- Dates : ISO 8601 avec fuseau (`2026-10-12T17:30:00Z`). Les jours : `AAAA-MM-JJ`.
- CORS : en développement, autorise `http://localhost:5173` (ou utilise un proxy Vite).
- Le front fait confiance au back-end : rien n'est recalculé côté navigateur.

## 1. `GET /api/matchs?date=AAAA-MM-JJ`

Renvoie un **tableau** de fiches (`[]` s'il n'y a aucun match ce jour-là).

```json
[
  {
    "match_id": "2026-10-12-nbf-har",
    "date_heure": "2026-10-12T17:30:00Z",
    "competition": "Championnat fictif",
    "equipes": { "domicile": "Northbridge FC", "exterieur": "Harbor United" },
    "pronostics": {
      "issue":  { "selection": "1X · Northbridge FC ou nul", "court": "1X", "probabilite": 0.82, "cote": 1.34,
                  "justification": "Invaincu à domicile sur ses 6 derniers matchs." },
      "buts":   { "selection": "Plus de 1,5 but", "court": "+1.5", "probabilite": 0.88, "cote": 1.28,
                  "frequence": "9 sur 10 matchs combinés" },
      "bonus":  { "categorie": "cartons", "selection": "Cartons +3.5", "court": "Cartons +3.5", "cote": 1.85,
                  "justification": "Les deux équipes dépassent la moyenne de la ligue.",
                  "valeur_observee": 4.6, "moyenne_ligue": 3.9 },
      "scores": [
        { "score": "2-1", "probabilite": 0.12, "cote": 8.5 },
        { "score": "1-1", "probabilite": 0.11, "cote": 6.5 },
        { "score": "2-0", "probabilite": 0.1,  "cote": 7.5 }
      ]
    },
    "value": { "pilier": "issue", "ecart": 0.06 },
    "synthese": "Northbridge est solide à domicile… (2 à 3 phrases, texte seulement)",
    "forme": { "domicile": ["V","V","N","V","V"], "exterieur": ["D","N","V","D","N"] },
    "meta": { "genere_le": "2026-10-12T04:00:00Z", "version_moteur": "1.0.0",
              "source_stats": "…", "source_cotes": "1xBet", "cotes_observees_le": "2026-10-12T03:55:00Z" },
    "resultat": { "statut": "non_evalue", "issue": null, "buts": null, "bonus": null, "score": null }
  }
]
```

Points importants

- `pronostics.bonus` vaut `null` quand aucun signal n'est assez net : le front masque alors la carte Bonus.
- `pronostics` vaut `null` quand les données sont insuffisantes. Ajoute `raison_absence` (texte affiché à l'utilisateur).
- `scores` : 2 à 3 éléments, du plus probable au moins probable.
- `cote`, `court`, `justification`, `forme`, `synthese`, `value` sont **optionnels** : s'ils manquent, le front n'affiche simplement pas l'élément.
- Après le match : `resultat.statut = "evalue"`, `issue/buts/bonus/score` passent à `true` ou `false`, et `score_final` (ex. `"2-1"`) est ajouté. `"annule"` si le match n'a pas eu lieu.

## 2. `GET /api/matchs/:id`

Une seule fiche (même forme que ci-dessus). **404** si le match n'existe pas (le front affiche « Match introuvable »).

## 3. `GET /api/historique?periode=7j|30j|saison`

```json
{
  "periode": "30j",
  "mis_a_jour_le": "2026-10-12T05:00:00Z",
  "taux": {
    "issue":  { "reussis": 41, "total": 55 },
    "buts":   { "reussis": 43, "total": 55 },
    "bonus":  { "reussis": 18, "total": 31 },
    "scores": { "reussis": 6,  "total": 55 }
  },
  "jours": [
    { "jour": "2026-10-11", "matchs": [ /* fiches évaluées, même forme que plus haut */ ] }
  ]
}
```

- `jours` : du plus récent au plus ancien.
- `total = 0` pour un pilier → le front affiche « Pas encore de données ».

## Erreurs

Tout statut ≠ 2xx (hors 404 sur `/api/matchs/:id`) est affiché comme « le serveur a répondu avec une erreur » avec un bouton Réessayer. Pas besoin de format d'erreur particulier.

## Brancher le vrai back-end

1. Copie `.env.example` en `.env`.
2. Mets `VITE_DATA_SOURCE=api` et `VITE_API_URL=http://localhost:8787` (l'adresse de ton back-end).
3. Relance `npm run dev`. Aucun autre fichier à modifier : la source est choisie dans `src/data/index.ts`.
