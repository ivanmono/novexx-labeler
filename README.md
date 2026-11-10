# Labeller HMI — functional prototype

Next-generation touch HMI for PID Group labellers (4.3", 800×480, gloves), built by Mono.
Implements the Frontend Design Requirements v1.6 with dummy data: every screen of the menu structure,
all 214 parameters with their controls, access levels 0–4, dark and light theme, portrait and both
landscape layouts, English and German.

## Quick start

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173. Press `Ctrl+Shift+D` (or the DEV tab) for theme, orientation, language and,
in later phases, access level, machine state and error injection. The styleguide with every token and
component is at `#/styleguide`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `preview` | Vite dev server / production build to `dist/` / serve the build |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright flows and screenshot matrix (portrait + landscape) |
| `npm run data:sync` | Regenerate `src/data/*.json` from the Excel list and the clickdummy |
| `npm run data:validate` | Check the generated data (runs in `npm run check`) |
| `npm run icons:sprite` | Rebuild the icon sprite from `src/assets/icons/*.svg` |

## Documentation

- `docs/PLAN.md` phases, tickets, gates
- `docs/tickets/` one file per ticket with acceptance criteria
- `docs/REQUIREMENTS-TRACE.md` requirement → ticket → test
- `docs/OPEN-POINTS.md` questions for PID / Mono and the assumptions taken meanwhile
- `docs/DESIGN-LOG.md` design tweaks (chat or Figma), reconciled at every gate
- `docs/ARCHITECTURE.md` module map and decisions
- `docs/FIGMA.md` Figma pages, naming, sync process
- `docs/sources/` the binding input documents

## Stack

Vite 7, Tailwind CSS 4, vanilla JavaScript (ES modules), Vitest, Playwright. Fonts Figtree and Ioskeley Mono
self-hosted (OFL). Icons from Mono's Figma "Icons v1" set as a single-colour SVG sprite.
