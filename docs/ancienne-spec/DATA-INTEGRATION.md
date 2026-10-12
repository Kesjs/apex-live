# Football Data Integration Strategy

## Principles

- Use an official or properly licensed provider; do not scrape or reproduce protected interfaces.
- Keep vendor-specific identifiers and payloads behind adapters.
- Store provenance and freshness with every displayed fact.
- Treat provider availability, quotas, licensing territory, historical depth, provenance, observation date, and freshness as product constraints.
- The provider remains abstract and is “à sélectionner après étude des coûts, droits et couverture”.
- Synthetic development data must be isolated from real data and visibly marked in development.

## Phases

1. Define the minimum field contract for fixtures, teams, competitions, scores, form, lineups, absences, and statistics.
2. Compare candidate providers on license, target-market availability, coverage, quotas, latency, historical depth, provenance, freshness, and commercial terms.
3. Implement a mock provider using clearly marked synthetic fixtures only for development; never expose mock data as production truth.
4. Implement one licensed adapter and normalization tests.
5. Add freshness monitoring, validation, retries, caching, and provider outage states.
6. Add a second provider only if justified by coverage or resilience.

## Validation gates

No production recommendation until the fixture snapshot, feature calculations, AI output, and evaluation rules can be traced end-to-end to licensed evidence with source, observation date, and freshness. API budgets remain open until this comparison is complete.
