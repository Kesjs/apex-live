# Apex Design Direction

## Authority

This is the initial visual direction, based on the owner brief and `assets/reference/apex-reference.png`. It is not a copy of FotMob or WhoScored.

## Surface mode

Operate: the interface helps users inspect matches and make sense of evidence. Information hierarchy, scanability, and uncertainty communication outrank decoration.

## Visual world

- Light, professional, athletic, and composed.
- Base surfaces: off-white canvas and white reading surfaces.
- Accent: pin green for active states, primary actions, and Apex identity.
- Dark charcoal carries text; white is the dominant surface and blue is not a brand color.
- Avoid excessive gradients, generic SaaS cards, and deeply nested card stacks.
- Use compact, high-density match rows and a few strong content surfaces.
- Transitions are short and functional: selection, loading, status change, and disclosure.

## Responsive structure

- Mobile MVP: bottom navigation with Accueil, Matchs, Apex IA, and Profil. It remains limited to five items maximum; Actualités is not an active destination.
- Desktop: persistent sidebar, main dashboard, and a secondary analysis rail. News is deferred and is not an active MVP destination.
- Preserve a single clear content hierarchy when columns collapse.

## Data communication

Every displayed datum must expose or make available its provenance, observation date, and freshness. Every recommendation must visibly separate: recommendation, niveau de solidité analytique, supporting factors, risks, data freshness, and insufficient-data state. Status must never rely on color alone. A recommendation can be absent when evidence is insufficient.

## Content tone

French-first, direct, calm, and evidence-led. Never use “certain”, “garanti”, or language implying guaranteed gains. Use “niveau de solidité analytique”, “facteurs”, “risques”, “données disponibles”, “provenance”, “fraîcheur” and “non évaluée”. Never present confidence as a guaranteed probability or outcome.

## Reference asset

`assets/reference/apex-reference.png` is the visual reference for the initial exploration. It may guide hierarchy, density, and brand expression; it must not be treated as a source of real football facts or copied screen-for-screen.

## Reference analysis

### Screen structure

The reference is a tall mobile home screen with a continuous vertical scan:

1. Brand header: Apex mark, wordmark, tagline, and a circular search action.
2. Date rail: horizontally distributed day choices with a mint active underline.
3. Featured match: a large visual hero with two players, competition, matchup, kickoff, and one primary action.
4. Live match module: one high-priority match with live status, score, scorers, and favorite affordance.
5. Match list: compact rows for the rest of the day, with time, crests, teams, competition, and alert action.
6. Apex IA module: a deliberately contrasting light surface that gives the recommendation visual priority.
7. Fixed bottom navigation: five equal destinations, active icon/label/color, and a small active indicator.

The page alternates between dense football data and calm light analysis surfaces. The visual rhythm is created by section breaks and surface changes, not by many nested containers.

### Hierarchy and spacing

The screen uses generous outer gutters of roughly 20–24 px, section gaps around 28–36 px, and compact internal row spacing. Headings are large and left-aligned; secondary “Voir tout” actions sit on the same baseline at the right. The featured match receives the largest visual area, while the live match and list prioritize scan speed. The bottom navigation is always available and visually separated by a top rule.

### Colors and surfaces

The implemented base is `#F7F8FA` with white surfaces. Pin green `#176B50` is reserved for active navigation, primary actions, emphasis, and Apex identity. Text uses `#17201D` and `#52625B`, tinted support surfaces use `#EAF4EF`, and borders use `#E2E8E4`. Shadows are restrained. The reference image may guide rhythm and atmosphere, but imagery must never compete with match facts.

### Cards and containers

Cards are broad, rounded, and mostly single-purpose. The live card is a single comparison surface; the list is one shared container with dividers rather than one card per row. The AI area is a large parent surface containing a recommendation header, one explanation block, and a metrics strip. Apex should preserve this flat grouping and avoid card-in-card nesting.

### Typography

The typographic voice is modern sans-serif, high-contrast, and compact. Large bold headings establish sections; match names and recommendation labels are bold; metadata is lighter and smaller. Numeric facts such as scores, minutes, niveau de solidité analytique, and rates receive strong weight. Typography should carry hierarchy before color does. Exact font family and tokens remain open until the implementation stack is confirmed.

### Mobile behavior

The reference is designed for thumb-friendly portrait use: one column, wide tap targets, fixed bottom navigation, horizontal date selection, and short vertical content blocks. Important actions are centered or placed close to the content they affect. Desktop should not simply stretch this canvas; it should redistribute the same hierarchy into a persistent sidebar, a wider main column, and a secondary rail while retaining compact match rows.

### Translation rules for Apex

- Preserve the sequence: orient, select a date, inspect live/upcoming matches, then understand an explanation.
- Use the light AI surface as an evidence-focused reading zone, not as a decorative theme switch.
- Replace any placeholder or illustrative football fact with an explicit loading, unavailable, or insufficient-data state.
- Keep recommendation language cautious: the niveau de solidité analytique is not certainty, and a visual score must not imply a guaranteed result.
- Use the reference for rhythm, density, and contrast; create Apex components and imagery independently. Do not reproduce the interface, components, texts, or journeys of FotMob, WhoScored, Sofascore, or other competitors.

## Implementation update — correction frontend 2026-10-08

The implemented Accueil now uses the validated light reading environment:

- canvas `#F7F8FA`, surfaces `#FFFFFF`, primary text `#17201D`, secondary text `#52625B`;
- pine action `#176B50`, tinted selection `#EAF4EF`, borders `#E2E8E4`;
- one Phosphor icon family, system sans typography, 8px controls and 16px content surfaces;
- flat grouping: featured match first, Apex IA immediately after it on mobile, then upcoming matches;
- no stadium image, gradient, glass effect, decorative halo, nested card or odds surface;
- global synthetic-data banner; detailed provenance stays available with source, observation and freshness;
- four active destinations only: Accueil, Matchs, Apex IA and Profil.

The demo front implements success, loading, empty, insufficient, stale and provider-error states. Public browsing remains available; favorites open an honest account-required panel and do not create a fake session. The future provider and real IA remain unconnected.

## Still to validate

The light tokens, Phosphor icon family, compact system sans typography, 160–220 ms motion budget, and four-destination MVP are implemented. Chart language, real data contracts, and the final route library remain to be validated before backend integration.

## Accueil — ajustement visuel implémenté le 8 octobre 2026

Cette section remplace les prescriptions antérieures de sélection verte pour l’Accueil. La référence FotMob sert à la lisibilité et au regroupement des rencontres, sans reproduction exacte de son interface.

- Sélections actives : gris `#EFEFF0`, texte `#17201D`, aucune bordure ou ligne verte. Le focus clavier reste distinct et visible.
- Actions : texte vert pin `#176B50`, fond `rgba(23,107,80,.08)` ; hover `.13`, pressed `.18`, sans bordure verte.
- Accueil : fond neutre `#FAFAFB`, surfaces blanches, séparateurs `#EBEBED`, texte secondaire `#606369`. Les couleurs de base des autres écrans restent inchangées.
- Barre de date compacte avec flèches de 44 px et sélection native accessible ; filtres neutres sur une seconde ligne.
- Desktop : sidebar de 224 px, match vedette et rencontres au centre, aperçu analytique dans une colonne de 320 px (288 px aux largeurs intermédiaires).
- Sous 1000 px : match vedette, aperçu analytique, prochains matchs ; navigation mobile à quatre destinations. À petite largeur : marges latérales de 16 px.
- Rencontres regroupées par compétition en listes compactes. Pas de stade décoratif, de halo ou de carte analytique imbriquée.
- Données fictives signalées par le bandeau global et les détails de provenance ; aucune connexion réelle ni génération IA.

Vérification navigateur : 360, 390, 768 et 1440 px ; absence de débordement horizontal, ouverture des panneaux, fermeture Échap et retour du focus, filtre, changement de date et reprise après erreur simulée. Ces contrôles ne constituent pas un audit WCAG exhaustif.
