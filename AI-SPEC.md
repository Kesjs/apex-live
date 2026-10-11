# Apex IA Specification (proposed)

## Role

The AI explains and ranks evidence-backed candidate events for an informative sports-analysis platform. It does not act as a bookmaker, place bets, promise gains or outcomes, or fill missing facts.

## Inputs

Fixture snapshot, competition context, recent form window, home/away splits, head-to-head data when meaningful, goals data, absences, trends, provenance, observation date, data freshness, and optional odds only when explicitly available and licensed.

## Output contract

Structured output containing:

- 0–3 recommendations; zero is valid when data is insufficient;
- event label and scope;
- niveau de solidité analytique, explicitly not a guaranteed probability;
- concise explanation;
- supporting factors with evidence references;
- risks and counter-signals;
- insufficiency reasons;
- model, prompt, input snapshot, and generated timestamp.

## Guardrails

- Reject unsupported claims and references to absent fields.
- Reject certainty, guaranteed-gain, and guaranteed-result language.
- Enforce the 0–3 cap server-side.
- Prefer no recommendation when evidence is weak, stale, contradictory, or incomplete.
- Log prompt/model/schema versions for auditability.
- Separate the niveau de solidité analytique from historical outcome rate until calibration is validated.
- Reject any evidence record missing provenance, observation date, or freshness.
- Never mix synthetic development inputs with real production inputs.

## Pending decisions

Model/provider, hosting region, cost ceiling, per-match and monthly API/AI budgets, latency target, calibration method, review policy, prompt language, and whether AI output is generated synchronously or by a background job.
