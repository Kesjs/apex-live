# Apex Pre-development Task Plan

## Phase 0 — Decisions and safeguards

- Validate target countries, age/compliance needs, and privacy posture; French is the initial language.
- Compare licensed football-data providers; select one only after reviewing costs, rights, and coverage.
- Confirm MVP competitions, history window, evaluation rules, and AI budget.
- Confirm final stack, repository ownership, environments, deployment, and API/AI budgets.

### Progress

- [x] Initial React + TypeScript + Vite shell initialized without removing the product documents.
- [x] API, Supabase, real provider, and AI integrations remain intentionally deferred.

## Phase 1 — Domain contract

- Define provider-independent types, provenance/observation-date/freshness rules, and synthetic-versus-real data boundaries.
- Define recommendation schema, 0–3 cap, analytical-solidity vocabulary, status lifecycle, and evaluation events.
- Define WCAG 2.2 AA and French-first content standards.

## Phase 2 — Data foundation

- Build provider adapter and normalization tests.
- Add Supabase schema, RLS, migrations, seed strategy, freshness jobs, and public-versus-account access boundaries.
- Add observability and provider outage handling.

## Phase 3 — Product shell

- Establish design tokens and responsive navigation.
- Build route shells and all loading/empty/error/success/degraded states.
- Implement match feed and detail using licensed data or explicitly isolated synthetic development data.

### Progress

- [x] Apex shell created with desktop sidebar and mobile bottom navigation.
- [x] Accueil implemented with forest-green palette, featured match, Apex IA preview, upcoming matches, provenance, freshness, and demo fixtures.
- [x] Matchs, Apex IA et Profil implémentés comme surfaces de démonstration fonctionnelles, sans backend.
- [x] Loading, success, empty, insufficient-data, stale-data, provider-error, and anonymous states implemented.
- [x] Date selection, analysis actions, provenance details, navigation feedback, and responsive breakpoints implemented.
- [x] Filters, anonymous account explanation, match detail panels, provider-error handling, and route empty states implemented across the four MVP destinations.
- [x] Reduced-motion, focus, touch-target, and keyboard semantics added.

## Phase 4 — Apex IA

- Implement deterministic feature calculations.
- Add structured AI generation and validation, including the valid no-recommendation outcome.
- Persist evidence-linked recommendations and transparent history.

## Phase 5 — Verification

- Test source traceability, no-fabrication behavior, cap enforcement, RLS, accessibility, responsive behavior, offline/degraded states, and performance.
- Run browser end-to-end checks from match data to recommendation history.

### Progress

- [x] Local Vite server launched at `http://localhost:5173/`.
- [x] Browser smoke check confirmed Accueil, Matchs, Apex IA and Profil, with mobile 390 px and desktop 1440 px captures.
- [x] Browser interaction check confirmed route navigation, filters, account panel, analysis actions and supplier-error messaging.
- [x] Impeccable detector returned no findings.
- [x] Production build passed.
- [x] Responsive CSS covers 360 px, 390 px, 430 px, tablet, 1280 px, and 1440 px; physical touch emulation remains to be rechecked with a dedicated viewport harness.

## Phase 6 — Later

- Add licensed/owned news.
- Add community only after moderation, privacy, reporting, and abuse controls are specified.

### Remaining before real product data

- [ ] Select and license the football-data provider.
- [ ] Implement Supabase Auth, RLS, profiles, favorites, history, and preferences.
- [ ] Replace demo fixtures through a provider adapter while preserving provenance and freshness gates.
- [ ] Implement real AI generation, validation, calibration, budgets, and fallback.
- [ ] Add automated component and end-to-end tests for all home states.
- [ ] Add automated component and end-to-end tests for Matchs, Apex IA, Profil and all route states.
- [x] Extend the match detail panel with form, home/away, head-to-head, goals and absences sections in demo mode.
