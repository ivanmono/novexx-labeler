# Design log

Every design tweak, from chat or from Figma, gets an entry. Code and Figma are reconciled against this list at each review gate (see docs/FIGMA.md).

Format:

```
## DT-nn · <short title>            (date, gate)
Source: chat | figma <node id / page>
Change: what changed, in one or two sentences
Where: token / component / screen (file path)
Before → after: screenshot names under tests/e2e/__screenshots__ or Figma frame names
Status: applied in code | applied in Figma | both
```

## DT-00 · Baseline tokens from the first draft (2026-10-29, G0-1)

Source: docx §5.1 and `D:\Projects\NovexxPrototype-HTML\src\styles\base\_tokens.css`
Change: dark palette carried over verbatim; light palette completed (the prototype's was partial); status "ink" variants added so status text stays readable on light; level and branch colour sets named.
Where: `src/styles/tokens.css`
Before → after: n/a (baseline)
Status: both (Figma: collections HMI Primitives, HMI Colour, HMI Space, HMI Radius, HMI Type; page HMI / 01 Tokens)

## DT-01 · Icons on a 24 px canvas with a 1.5 px stroke (2026-10-30, G1-2)

Source: chat ("Make whole new sheet with 24x24px icons in 1.5 stroke width", then "Switch sprite")
Change: the app sprite is built from the new Figma page `Icons v1 – 24 px` (Mono's 67 icons scaled to 24×24, strokes set to 1.5 px) instead of Icons v1 at 48 px / 2 px. Relative line weight goes from 2/48 to 1.5/24, so every icon reads about 50 % heavier: 1.5 px at 24 px, 2 px at 32 px, 3 px at 48 px.
Where: `src/assets/icons/*.svg`, `src/assets/icons/sprite.svg` (viewBox 0 0 24 24), `scripts/build-sprite.mjs` (canvas from the source viewBox), `scripts/figma/build-frames.js` (icon instances from `icon/24/<name>`)
Before → after: `test-results/figma/*.png` captured before and after; Figma frames on `HMI / 03 Screens – Portrait` had their 94 icon instances swapped in place
Status: both

## DT-02 · Designer tweak of the home screen, read into DT-03 … DT-06 (2026-10-30, G1-2)

Source: figma node 2045:1372, frame `home / dark / portrait / ready-L0 - tweak` on `HMI / 03 Screens – Portrait`
Change: the frame was compared node by node with the generated home frame; every difference is logged below as its own DT. The 38 px gaps between header, centre block, cards and nav bar in the tweak are auto-layout leftover space, not a chosen value, and were not copied.
Where: see DT-03 … DT-06
Before → after: `home / dark / portrait / ready-L0` (generated) vs `home / dark / portrait / ready-L0 - tweak`
Status: both (all four applied, confirmed in chat: "all")

## DT-03 · Compact header: 48 px status bar, 24 px side margins (2026-10-30, G1-2)

Source: figma node 2045:1372 (designer tweak)
Change: portrait status bar 80 → 48 px (new token `--spacing-status` / Figma `size/status`; the nav bar and both bars in landscape keep 80); status bar side padding 16 → 24; home top row 24 px side padding, 8 px vertical padding, 4 px gap between device name and type/serial. Header total 144 → 108 px.
Where: `src/styles/tokens.css`, `src/styles/components.css` (portrait grid rows), `src/ui/shell/StatusBar.js`, `src/ui/screens/HomeScreen.js` (home__top)
Before → after: `test-results/figma/home-dark-portrait-ready-l0.png` before/after; Figma frames rebuilt
Status: both

## DT-04 · Centre block on a 32 px rhythm, smaller state pill (2026-10-30, G1-2)

Source: figma node 2045:1372
Change: gap between start button, state pill and login hint 12 → 32 px; pill 40 → 28 px tall with 8 px horizontal padding and a 12 px caption on a 12 px line.
Where: `src/ui/screens/HomeScreen.js` (home__center, home__pill)
Before → after: home frames before/after
Status: both

## DT-05 · Quicklink cards: 116 px, 20 px title on two lines, 14 px bold value (2026-10-30, G1-2)

Source: figma node 2045:1372
Change: card 85 → 116 px (114 inner + 1 px ring), 12 px padding, icon centred; text column with 4 px gaps; title 18 → 20 px semibold, clamped to two lines instead of truncating; value 16 px semibold → 14 px bold (Fira Code, brand-hi); inner radius 23 → 24 so surface and gradient ring share one radius (token `--radius-card-inner` / Figma `radius/card-inner`).
Where: `src/ui/screens/HomeScreen.js` (quickLinks), `src/styles/tokens.css`
Before → after: home frames before/after
Status: both

## DT-06 · Level badge breaks out of the nav bar (2026-10-30, G1-2)

Source: figma node 2045:1372
Change: in portrait the level badge sits 17 px above the nav bar's top edge, on the state line, with the user/level caption 40 px below the bar top. Screens keep 32 px clearance above the nav bar (home quicklinks and login keypad: bottom padding 12 → 32). Landscape unchanged.
Where: `src/styles/components.css` (.nav-bar__badge, .nav-bar__name), `src/ui/shell/NavBar.js`, `src/ui/screens/HomeScreen.js`, `src/ui/screens/LoginScreen.js`
Before → after: home and login frames before/after
Status: both
