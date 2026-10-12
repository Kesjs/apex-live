# Apex — Product Requirements Document

## 1. Scope

This document defines the pre-development MVP for Apex, a French-first mobile-first PWA for informative football match analysis and transparent AI-generated recommendations. Apex is not a bookmaker. It is a planning artifact; no implementation is authorized by this document alone.

## 2. Goals

- Help users understand relevant match context quickly.
- Produce at most 1–3 selective recommendations per match.
- Make recommendation reasoning, niveau de solidité analytique, risks, and missing evidence explicit.
- Maintain an auditable recommendation history.
- Preserve a clean boundary between analysis and bookmaker activity.
- Allow public consultation without an account while requiring an account for favorites, history, and preferences.

## 3. Non-goals for MVP

- Accepting bets or handling deposits/withdrawals.
- Guaranteeing results or publishing profit claims.
- Building news or community features in the MVP.
- Making odds a required input.
- Scraping protected third-party products.

## 4. Core user journeys

### Discover
User opens Accueil, sees the day selector, live matches, upcoming matches, and a limited Apex IA recommendation area.

### Investigate
User opens a match, reviews teams, competition, timing, form, home/away splits, goals, absences, head-to-heads, trends, data freshness, and uncertainty.

### Evaluate a recommendation
User reads the market/event label, niveau de solidité analytique, supporting factors, risks, explanation, and evidence timestamp. The recommendation is never presented as certain or guaranteed.

### Review history
User with an account opens Profil or Apex IA history and filters recommendations by status: won, lost, void, or unevaluated.

## 5. Functional requirements

| Area | Requirement | Acceptance signal |
|---|---|---|
| Match feed | Show scheduled and live matches with competition and status | No placeholder statistics presented as real |
| Match detail | Show evidence categories and freshness | Missing data has an explicit state |
| AI recommendations | 1–3 maximum per match | Hard cap enforced server-side |
| Explanation | Show factors, risks, analytical solidity, and rationale | Every recommendation has traceable evidence references |
| History | Record recommendation lifecycle | Status changes are timestamped and auditable |
| Safety | Avoid guarantees and bookmaker flows | Copy and UI never imply certainty or profit |
| Accounts | Support user profile and saved preferences | Auth provider and privacy scope validated before build |
| Provenance | Every displayed datum includes source, observation date, and freshness | Missing provenance blocks display |
| Data modes | Synthetic development data is isolated from real data | Synthetic records cannot enter production surfaces |

## 6. Quality requirements

- Mobile-first performance and resilient loading states.
- Accessible contrast and non-color-only statuses.
- Clear freshness timestamps and provider provenance.
- No fabricated stats, events, injuries, odds, or outcomes.
- Provider abstraction so an official data source can be connected later.

## 7. Open decisions to validate

- Target launch countries and languages.
- Legal/compliance review and age-gating requirements.
- First official data provider, licensing, fields, quotas, and refresh cadence.
- Initial competitions and historical data depth.
- Recommendation event taxonomy and settlement/evaluation rules.
- Whether authentication is required for MVP or only for history/personalization.
- AI provider/model, budget, latency, fallback, and human review policy.
- Exact accessibility target, analytics policy, retention, and privacy requirements.
- Final stack confirmation and deployment/project ownership.
- Exact data provenance and freshness thresholds by field type.
- Public/anonymous access boundary and account-required actions.
- Initial French content and terminology review.
- API/AI budgets after provider comparison.
