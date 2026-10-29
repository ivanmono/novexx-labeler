# Architecture

Labeller HMI, functional prototype with dummy data. Vanilla JS (ES modules), Vite 7, Tailwind 4.
No framework. Target: 4.3" 800×480 capacitive touch panel, embedded browser (Chromium ≥111 assumed, see OPEN-POINTS #1).

## Module map

```
index.html                 <html data-theme data-orientation>; #app is the device shell
src/main.js                boot: data → persistence → simulator → shell → router
src/styles/
  app.css                  Tailwind entry, font imports, @source hints for dynamic class names
  tokens.css               raw palette → semantic --hmi-* (dark/light) → @theme inline utilities
  components.css           base + the few component classes (shell grid, card-border, pressable)
src/data/                  generated JSON (see "Data pipeline") + overrides.json + i18n + seed
src/core/                  framework-free logic, all unit-tested
  conditions.js            show-condition parser/evaluator (done)
  theme.js                 theme + orientation on <html> (done)
  store.js                 reactive store (P1-01)
  router.js                hash router with explicit back-stack (P1-02)
  access.js                levels 0–4, read/write gating (P1-04)
  i18n.js                  EN/DE, TextResID keys, temp language (P1-05)
  validate.js              numeric/string/password rules (P2-07, P3-14)
  persist.js               localStorage snapshot + factory reset (P1-01)
  simulator.js             dummy firmware: machine states, counters, encoder, IO, logs (P1-07)
src/ui/
  shell/                   StatusBar, TitleBar, NavBar, Toast, ModalHost, SheetHost
  components/              Icon (done), MenuTile, ParamRow, editors, dialogs, placeholders …
  screens/                 Styleguide (done), Startup, Home, Login, Menu, ParamList, special screens
  dev/DevPanel.js          dev-only controls (done, extended in P1-14)
scripts/                   extract-data, validate-data, build-sprite
tests/unit, tests/e2e      Vitest, Playwright (portrait + landscape projects)
docs/                      plan, tickets, traceability, open points, design log, Figma notes
```

## Architecture decisions (ADRs)

### ADR-1 Vite + Tailwind v4 + vanilla JS, no framework
Context: the existing prototype is vanilla JS + PostCSS/BEM; the requirements ask for a lightweight HTML/CSS deliverable for an embedded panel. Decision: keep vanilla JS, move to Vite (fast dev, native Tailwind 4 plugin) and Tailwind 4 (`@theme inline` so utilities follow the theme switch without rebuild). Consequence: components are plain functions returning HTML strings plus small `mount`/`update` hooks; no virtual DOM. Re-rendering is targeted per store slice (ADR-4).

### ADR-2 Screens are data
`src/data/menu-tree.json` (from the clickdummy, which mirrors the draw.io diagram) drives `MenuScreen` and `ParamListScreen`. Special screens are modules registered by `mask` type. `ref` nodes resolve to one target screen, so a screen reachable from two places is one screen (docx §6.2). Parameters are rows in `params.json`; one value per ParamID lives in the store regardless of how many screens show it.

### ADR-3 Data pipeline, Excel is primary
`scripts/extract-data.mjs` reads the xlsx (SheetJS) for every parameter and option, the clickdummy `DATA` line only for the screen ↔ parameter mapping, mask specs and notes, then applies `src/data/overrides.json` (hand-reviewed, every entry cites its reason; docx v1.6 wins). `scripts/validate-data.mjs` fails the build on unknown types, bad colours, broken conditions, missing icons or labels. Output JSON is committed so the app never parses Excel at runtime.

### ADR-4 Targeted re-render
A full `innerHTML` rebuild on every value change is too expensive for the embedded GPU. The store exposes `subscribe(selector, fn)`; `ParamRow` patches value/lock/visibility in place. Full screen re-render only on navigation, language, theme or orientation change.

### ADR-5 Three layouts, one DOM
`[data-orientation]` on `<html>` switches a CSS grid (`.hmi`) between portrait (bars top/bottom) and landscape LH/RH (bars on the edges, mirrored). Upside-down variants rotate the root 180° in CSS. If the device OS rotates the framebuffer instead, that CSS layer is dropped (OPEN-POINTS).

### ADR-6 Offline assets only
Fonts are self-hosted via `@fontsource` (OFL), icons are an inline SVG sprite with `currentColor`. No CDN, no raster images except the configurable logo. Transitions are opt-in (`.pressable`), ≤120 ms, transform/opacity/filter only.

### ADR-7 Figma generated from code
Code is the source of truth during the build; Figma (`Novexx Presentations`, pages `HMI / …`) is regenerated at review gates via the Figma MCP. Designer edits are read back at the next gate and ported into tokens/components (docs/FIGMA.md, docs/DESIGN-LOG.md).

## Data flow at runtime

```
params.json + overrides ──► store.params (id → value)  ◄── persist.js (localStorage)
menu-tree.json          ──► router / MenuScreen / ParamListScreen
simulator.js            ──► store.machine (state, counters, encoder, io, logs) every 1 s
session (level, user)   ──► access.js gates rows, tiles, actions
conditions.js           ──► row visibility (re-evaluated when a referenced param changes)
```

## Conventions
- Files: `PascalCase.js` for UI modules, `kebab-case` for scripts, `camelCase.js` for core.
- A UI module exports `render(props) → html` and optionally `mount(el, ctx)` returning an `unmount`.
- Only `.pressable`, `.card-border`, `.scroll-y`, `.hmi*` and `.t-*` are component classes; the rest is utilities.
- Every requirement-bearing decision is traced in `docs/REQUIREMENTS-TRACE.md`; every open question in `docs/OPEN-POINTS.md`; every design tweak in `docs/DESIGN-LOG.md`.
