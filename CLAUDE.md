# CLAUDE.md

Labeller HMI for PID Group, built by Mono. Functional prototype with dummy data; the requirements document decides every conflict.

## Commands

```bash
npm run dev            # Vite on http://127.0.0.1:5173 (styleguide at #/styleguide)
npm run build          # production build → dist/ (relative base, works from file://)
npm test               # Vitest unit tests (tests/unit)
npm run test:e2e       # Playwright flows + screenshots (projects: portrait 480×800, landscape 800×480)
npm run data:sync      # regenerate src/data/*.json from docs/sources + overrides.json
npm run data:validate  # fail on data problems (run after data:sync)
npm run icons:sprite   # normalise src/assets/icons/*.svg and rebuild sprite.svg
npm run check          # lint + data:validate + unit tests
```

## Where things are

- Binding sources: `docs/sources/` (requirements docx v1.6, Excel parameter list, draw.io menu, clickdummy). Docx wins.
- Plan and tickets: `docs/PLAN.md`, `docs/tickets/`, trace in `docs/REQUIREMENTS-TRACE.md`, questions in `docs/OPEN-POINTS.md`, tweaks in `docs/DESIGN-LOG.md`.
- Architecture and ADRs: `docs/ARCHITECTURE.md`. Figma process: `docs/FIGMA.md`.
- Generated data (committed): `src/data/*.json`. Never edit by hand; change `src/data/overrides.json` and re-run `npm run data:sync`.
- Tokens: `src/styles/tokens.css` (`@theme inline`, dark/light via `[data-theme]`). Shell layout per orientation: `src/styles/components.css` (`[data-orientation]`).

## Rules

- Vanilla JS ES modules, no framework, no TypeScript. Components are functions returning HTML strings with Tailwind utilities; only the handful of classes in `components.css` are component classes.
- Dynamic class names must be listed in `@source inline(...)` in `src/styles/app.css` or Tailwind will not emit them.
- No CDN or network at runtime. Fonts via `@fontsource`, icons via the sprite (`icon('name')` from `src/ui/components/Icon.js`).
- No hover-only states; touch targets ≥60 px primary, ≥48 px rows. Transitions opt-in via `.pressable`, ≤120 ms.
- Every parameter has exactly one value in the store, keyed by ParamID, even when it appears on several screens.
- Show conditions go through `src/core/conditions.js` (`;` = OR lowest, `&` = AND, `{id}`, `=`, `!=`, `>`, `<`).
- A design tweak is never applied silently: add a `DT-nn` entry to `docs/DESIGN-LOG.md`.
- Keep `docs/tickets/README.md` statuses current when finishing a ticket.
