# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript, TanStack Start, Tailwind CSS, shadcn/ui, Radix UI, Framer Motion, Supabase, Vercel. PWA responsive mobile-first for mobile, tablet, and desktop. Final stack and deployment choices remain to be validated before implementation.

## Users

Football followers who want a clear, evidence-based understanding of upcoming and live matches and want to identify interesting events without confusing analysis with a guarantee or bookmaker service.

## Product Purpose

Apex surfaces useful football information, explains match analysis, and produces at most one to three AI-generated recommendations per match. Success means users can understand why a recommendation exists, how confident it is, what risks apply, and when the available data is insufficient.

## Positioning

A transparent football-analysis product that makes its reasoning, niveau de solidité analytique, risks, and evaluation history visible. Apex is not a bookmaker and never promises gains. Its differentiator is evidence-first explanation rather than opaque tips.

## Operating Context

Users browse four active MVP areas: Accueil, Matchs, Apex IA, and Profil. Mobile navigation stays limited to five items maximum; the fifth slot is intentionally unused unless a future decision justifies it. On desktop, the product uses a persistent sidebar, a main dashboard, and a secondary column for recommendations and trends. Match analysis may cover recent form, home/away performance, head-to-heads, goals, absences, and trends.

## Capabilities and Constraints

- Display matches and useful football information.
- Analyse recent form, home/away performance, head-to-heads, goals, absences, and trends.
- Generate no more than 1–3 recommendations per match.
- Explain each recommendation with understandable data.
- Display the niveau de solidité analytique, supporting factors, risks, and insufficient-data conditions.
- Preserve a transparent history of recommendations as won, lost, void, or unevaluated.
- Add football news and community features later; neither is an active MVP feature.
- Apex is an informative sports-analysis platform, not a bookmaker.
- Public match and analysis data may be consulted without an account. An account is required for favorites, history, and preferences.
- Initial product language is French.
- Never guarantee an outcome or imply certain gains.
- Never display fabricated statistics.
- Do not make odds mandatory; odds are volatile and contextual.
- Do not illegally copy data from FotMob, WhoScored, Sofascore, or similar services.
- Keep an architecture ready for a future official football-data provider, which remains abstract and marked “à sélectionner après étude des coûts, droits et couverture”.
- No displayed data is valid without provenance, observation date, and freshness information.
- A recommendation may be absent when data is insufficient.
- Synthetic development data must be separated from real data and never presented as production truth.
- Confidence is named and explained as “niveau de solidité analytique”, never as a guaranteed probability.
- API/AI budgets remain open until providers are compared.
- Competition coverage, recommendation taxonomy, evaluation rules, and legal/compliance details remain open decisions.

## Brand Commitments

The name and logo are Apex. The visual direction is dark, professional, and sports-oriented, using emerald green, mint, charcoal, and very dark grey. White and blue must not dominate. The reference image is `assets/reference/apex-reference.png`. It establishes a mobile-first information hierarchy and fluidity inspired by, but not reproducing, FotMob, WhoScored, Sofascore, or any other competitor.

## Evidence on Hand

- Visual reference: `assets/reference/apex-reference.png`.
- Product requirements supplied by the owner in the initialization brief.
- No production football data, provider contract, testimonials, performance claims, or verified recommendation history is currently present. Future work must not fabricate any of these.

## Product Principles

1. Evidence before excitement.
2. Explain every recommendation in language a football follower can inspect.
3. Make uncertainty and missing data visible.
4. Keep recommendations limited, selective, and accountable.
5. Separate analysis from wagering, guarantees, and bookmaker behavior.

## Accessibility & Inclusion

The accessibility target is WCAG 2.2 AA. The product must remain readable in a dark theme, preserve strong contrast, support keyboard and screen-reader navigation on desktop, avoid color-only status communication, and remain usable on small mobile screens.
