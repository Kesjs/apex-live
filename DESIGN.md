# DESIGN.md · Apex Design System

## Palette & Contrast (WCAG AA Verified)
- Surface Canvas (`--bg`): `#f8faf9`
- Primary Card (`--s1`, `--card`): `#ffffff`
- Sunken Surface (`--s2`): `#f0f4f2`
- Subtle Border / Divider (`--ln`, `--s3`): `#e2e8e5`
- Primary Ink (`--tx`): `#131d18` (16.4:1 on `#ffffff`)
- Muted Ink (`--mu`): `#4c5e54` (6.6:1 on `#ffffff`)
- Accent Emerald (`--ac`): `#047857` (5.48:1 on `#ffffff`, 5.03:1 on `#f0f4f2`)
- Accent Deep Hover (`--ac2`): `#065f46`
- Non-Text Vibrant Fill (`--ac-bright`): `#0aa66a` (progress fills, indicator accents)
- Amber Signal (`--am`): `#b45309` (5.02:1 on `#ffffff`)
- Danger (`--ko`): `#b91c1c`

## Typography & Hierarchy
- Display headings: `'Sora'`, fallback `'Manrope'`, `font-weight: 600`, `text-wrap: balance`.
- Body UI copy: `'Manrope'`, system sans fallback, `15px` base / `1.5` line-height, `text-wrap: pretty`, `max-width: 66ch` on multi-line narrative cards.
- Numeric data (percentages, odds, kickoff times, scores): `font-variant-numeric: tabular-nums`.
- Separators: middot `·` or en-dash `–` (never decorative em-dashes).

## Layout & Navigation
- Desktop (`>= 900px`): Fixed `248px` left sidebar with navigation links, compact partner strip (`PARTNER.codePromo`), and responsible gaming notice. Main content centered cleanly (`minmax(0, 1fr)`).
- Mobile (`< 900px`): Sticky compact top header + 4-column centered bottom navigation grid (`var(--barre): 72px`) + safe-area padding.
- AI Assistant (`Apex IA`): Floating pill on desktop bottom-right / compact FAB above bottom nav on mobile; opens `430px` slide-over drawer (desktop) or `86dvh` bottom sheet (mobile) with zero content shift.

## Cards & Surfaces
- Single elevation level: `border: 1px solid var(--ln)` and soft `0 2px 8px rgba(19, 29, 24, 0.04)`.
- Tables inside `.data-card` are flush with container edges (no card-inside-card borders).
- All icons are crisp inline SVGs (`Icon.tsx`); zero emoji placeholders.
