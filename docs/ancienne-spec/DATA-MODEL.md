# Apex Data Model (proposed)

## Core entities

- `profiles`: user identity, locale, preferences, consent timestamps.
- `competitions`: provider-independent competition identity and metadata.
- `teams`: canonical team identity with provider mappings.
- `fixtures`: scheduled match, participants, venue, status, kickoff, provenance, observation date, and freshness.
- `fixture_snapshots`: versioned source payload references, normalized evidence timestamp, freshness expiry, and `data_mode` (`synthetic` or `real`).
- `team_form`: derived recent-form and home/away aggregates with calculation window.
- `absences`: player/team availability facts, source, status, and timestamp.
- `recommendations`: immutable recommendation version, event type, analytical solidity level, rationale, status, model/prompt version, and evidence references.
- `recommendation_factors`: structured positive factors and risks.
- `recommendation_evaluations`: settlement input, result, evaluated/void reason, and evaluator timestamp.
- `news_items`: later-phase licensed/owned news records with source attribution.

## Integrity rules

- All football facts carry `source`, `source_item_id` where available, `observed_at`, and `freshness_expires_at`.
- Every displayed fact must carry or resolve to provenance, observation date, and freshness; otherwise it is not displayable.
- Synthetic and real data are separated by `data_mode`; synthetic data cannot be used in production user-facing surfaces.
- Recommendations reference the exact fixture snapshot and analysis version used.
- Recommendation status is separate from confidence.
- Evaluation is append-only; corrections create a new evaluation event.
- User-owned records use Supabase RLS.
- No odds column is required for core recommendation validity.

## Pending schema decisions

Provider identity strategy, time-series granularity, retention, expected historical depth, event settlement rules, and whether raw payloads may be stored under the provider license.
