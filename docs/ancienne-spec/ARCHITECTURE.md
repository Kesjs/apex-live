# Apex Technical Architecture

## Proposed boundaries

- **Web/PWA:** React + TypeScript with TanStack Start, responsive routes, installable PWA shell.
- **UI:** Tailwind CSS, shadcn/ui, Radix UI; Framer Motion only for purposeful transitions.
- **Application services:** typed server functions/API boundary for matches, analyses, recommendations, history, and news.
- **Data:** Supabase Auth, PostgreSQL, Storage, and row-level security for user-owned data. Public match/analysis consultation does not require auth; favorites, history, and preferences do.
- **Deployment:** Vercel, subject to project ownership and environment decisions.

## Provider abstraction

Create a domain-facing `FootballDataProvider` interface independent of any vendor. The provider remains “à sélectionner après étude des coûts, droits et couverture”. It should expose teams, competitions, fixtures, scores, lineups, injuries/absences, and statistics with provenance, observation date, freshness, and licensing metadata. Provider adapters normalize external responses into Apex domain objects. No datum may reach a user-facing surface without those metadata.

## Analysis pipeline

1. Ingest licensed data.
2. Normalize and validate schema.
3. Store snapshots with source, observation date, freshness metadata, and an explicit `data_mode` distinguishing `synthetic` from `real`.
4. Compute deterministic features.
5. Ask the AI layer to explain and rank candidate events within strict limits.
6. Validate output against schema, evidence references, safety rules, the 0–3 recommendation range, and the “niveau de solidité analytique” definition.
7. Persist an immutable recommendation version and later evaluation events.

## Safety boundaries

AI output cannot invent missing values, exceed the recommendation cap, state certainty, or bypass evidence validation. Missing or stale data must produce a visible insufficiency state.

## Operational concerns

Rate limits, provider licensing, background refresh, observability, prompt/version tracking, cache invalidation, moderation, privacy, retention, WCAG 2.2 AA verification, and API/AI budgets require decisions before implementation.
