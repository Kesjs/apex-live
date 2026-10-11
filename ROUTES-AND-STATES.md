# Apex Routes, Screens, and States

## Routes

- `/` — Accueil: date selector, featured match, live matches, upcoming matches, Apex IA preview.
- `/matchs` — Match feed with date, competition, live/upcoming filters.
- `/matchs/:fixtureId` — Match detail and evidence analysis.
- `/apex-ia` — Recommendation feed, filters, explanations, and history entry point; public consultation is allowed, account required for personal history.
- `/apex-ia/:recommendationId` — Recommendation detail and evidence snapshot.
- `/profil` — Account, preferences, history, privacy, and data controls; account required.

Actualités is not an MVP route or active navigation item. It is deferred to a later phase.

## Required states

- **Loading:** preserve layout with honest skeletons; do not render guessed values.
- **Empty:** explain why no matches, recommendations, history, or news are available and give the next useful action.
- **Error:** state what failed, whether data may be stale, and offer retry without hiding provenance.
- **Success:** confirm the data scope and freshness; recommendation success means saved/available, never a promised outcome.
- **Provenance missing:** do not render the datum; explain that source, observation date, or freshness is unavailable.
- **Insufficient data:** explicit state on match and recommendation surfaces.
- **Offline/degraded:** show cached timestamp, unavailable actions, and recovery behavior.

## Status vocabulary

Recommendation lifecycle: `draft`, `published`, `won`, `lost`, `void`, `unevaluated`, `withdrawn`. A recommendation may be absent when data is insufficient. “Confidence” is presented as “niveau de solidité analytique”, not a guaranteed probability.
