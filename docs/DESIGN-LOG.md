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

## DT-07 · Landscape home in two columns (2026-11-04, presentation pass)

Source: chat — polish the 12 presentation screens in all three layouts
Change: at 480 px height the stacked home (header, start button, pill, login hint, 2 × 2 quicklinks) needed ~510 px and the cards covered the "Log in to operate the machine" hint. Landscape now uses a grid: header across both columns, start button + pill + hint on the left (2 fr, gap 20 px), the quicklink cards on the right (3 fr, vertically centred, 16 px bottom padding), the error banner across both. Portrait unchanged. New Tailwind variant `land:` keyed on `data-orientation`, not the viewport.
Where: `src/styles/app.css` (`@custom-variant land`), `src/ui/screens/HomeScreen.js`
Before → after: `test-results/presentation/home-dark-landscape-lh-ready-l0.png` before/after
Status: code (Figma landscape frames built from it)

## DT-08 · User name on two lines in the landscape rail (2026-11-04, presentation pass)

Source: chat — presentation pass
Change: in the 80 px landscape nav rail the user name under the level badge was cut to "M.MUST…", "NOT LO…". It now wraps onto two lines, breaking after the dot (a zero-width space) and anywhere only as a last resort, at 11 px with no tracking and no side padding; every seed name fits whole. Portrait keeps one line with an ellipsis.
Where: `src/ui/shell/NavBar.js`, `src/styles/components.css` (.nav-bar__name)
Before → after: landscape presentation captures before/after
Status: code (Figma landscape frames built from it; the NavBar component set itself is portrait)

## DT-09 · Editor sheet sized by its content in portrait (2026-11-04, presentation pass)

Source: chat — presentation pass
Change: the portrait sheet was capped at a flat 320 px below the edited row, which put the bottom two rows of the text keyboard under the nav bar. The cap now follows the sheet's own content height (320–480 px); the list scrolls the edited row up to make room and, when the list is too short to scroll (Device Name near the end of HMI), gets temporary bottom padding while the sheet is open, so the row stays visible above the sheet (docx §7.2).
Where: `src/ui/editors.js`
Before → after: `editor-dark-portrait-text.png` before/after
Status: code

## DT-10 · Range hint and error on separate lines in the numeric field; shorter date hint (2026-11-04, presentation pass)

Source: chat — presentation pass
Change: numeric keypad: "Min · Max · Default" and the out-of-range message shared one line, so the hint truncated to "DEFAU…" and the message wrapped; the error now has its own line under the hint. Date picker: the hint reads "1.1.2027 – 31.12.2099 · Default 01.01.2027" (was "Min … · Max … · Default …") and is centred, so it no longer wraps left-aligned in the 60 % landscape sheet.
Where: `src/ui/components/NumericKeypad.js`, `src/ui/components/DateTimePicker.js`
Before → after: `editor-*-numeric-error.png`, `editor-*-date-error.png` before/after
Status: code (NumericKeypad has no own component set; DateTimePicker set refreshed)

## DT-11 · Landscape home: quicklinks in one column of wide cards (2026-11-05, designer tweak)

Source: Figma — designer's tweak frame `home / dark / landscape-lh / ready-L0-1` (node 2087:8692)
Change: the four quicklinks stack in one column (368 px wide, 8 px gap) instead of a 2 × 2 grid; each card is a row (icon, category, title, value) with no 114 px minimum, so it is 93 px tall and the title fits on one line. While the error/warning banner shows, the column would overlap the device name, so the gap drops to 4 px and the cards to 8 px vertical padding (85 px). The tweak frame used the speed icon on every card (a duplication leftover); each card keeps its menu-branch icon.
Where: `src/ui/screens/HomeScreen.js` (`renderQuickCard` `tight`, `Layout` prop), `src/ui/screens/Components.js`
Before → after: `home-*-landscape-*-ready-l0.png`, `home-*-landscape-*-alarm-overlay-l1.png`
Status: code + Figma (QuicklinkCard gained `Layout=tile|row|row-tight`; LH/RH home frames swapped to the row variants)

## DT-12 · Landscape status bar: state label horizontal under the dot (2026-11-05, designer tweak)

Source: Figma — StatusBar landscape variants edited by the designer
Change: the state label ("Ready", "Alarm") reads horizontally, centred under the dot, instead of running vertically up the rail. The rail's side padding drops to 4 px so the longest labels ("Warnung", "Stand-by", 67 px) fit on one line; anything longer wraps between words. The "secure until" note stays vertical.
Where: `src/ui/shell/StatusBar.js`, `src/styles/components.css`
Before → after: any landscape frame, top of the status rail
Status: code + Figma (four landscape StatusBar variants updated; landscape NavBar variants reset to badge-above-name after the trial reorder)

## DT-13 · Touch targets and type re-based in mm for the 4.3" panel (2026-11-05, device test)

Source: touch test on the NXP i.MX93 board (`#/touchtest`, bare finger): accuracy 2.8 mm mean / 4.3 mm max error, no offset (−0.8 / +0.6 mm), corners 3.2 vs centre 2.3 mm, i.e. the panel is mapped correctly and the misses are finger scatter. Hit rate per size: 5 mm 3/6, 6 mm 2/6, 7 mm 1/6, 8 mm 5/6, 10 mm 6/6, 12 mm 6/6. Today's 60 px primary (7 mm) and 48 px rows (5.6 mm) are below what is hit reliably; the docx mm rule (§3.2: 10 / 8 mm) holds, its px figures do not (#51).
Change:
- Tokens: `--spacing-touch` 60 → 88 px (10.3 mm), `--spacing-touch-row` 48 → 68 px (8.0 mm), title bar 64 → 72 px; the title-bar back button fills the bar (72 × 88).
- Type one step up: caption 12 → 13, label 14 → 16, body-sm 16 → 18, body 18 → 20, body-lg 20 → 22, title 24 → 28, hero 32 → 36 px (display 48 unchanged). At 217 ppi 16 px text was under 2 mm high.
- Keypad, keyboard and date/time sheets are `wide` in landscape (whole main area instead of 60 %): the numeric field and the date/time Now / Set buttons sit beside the keys, so the keypad keys are 88 px and the steppers keep 88 px. Numpad keys 68 px in portrait; alpha keys 60 px portrait / 68 px landscape (their width stays limited by 11 keys per row: 35 px portrait, 50 px landscape).
- Slider: the input is a full row tall (68 px touch area, 8 px track drawn as background), thumb 32 → 40 px.
- Landscape home quicklinks drop the category line (the branch icon carries it) so four cards fit under the device name, with and without the error banner. Login: the ABC/123 mode button is at least 68 px wide.
- Nav bar stays 80 px (9.4 mm) so the landscape content width is unchanged.
Where: `src/styles/tokens.css`, `src/styles/components.css`, `src/ui/shell/SheetHost.js` (`wide`), `src/ui/shell/TitleBar.js`, `src/ui/components/NumericKeypad.js`, `AlphaKeyboard.js`, `DateTimePicker.js`, `src/ui/screens/HomeScreen.js`, `LoginScreen.js`
Before → after: every screen; most visible on parameter lists (8 rows instead of 11 in portrait) and the landscape editors
Status: code only — Figma components and the presentation frames still show 60 / 48 px; needs designer and PID sign-off (#51). Glove test on the board still to do.

## DT-14 · Type-size trial on the board; home reworked for larger type (2026-11-05, device feedback)

Source: chat — on the board, every 16 px text is unreadable (16 px is a 1.3 mm cap height at 217 ppi)
Change:
- The type tokens are variables with three presets, switched live from the dev panel ("Type size") or with `?type=l|xl` in the URL, kept per device: M 13 / 16 / 18 / 20 / 22 / 28 / 36 px (caption / label / body-sm / body / body-lg / title / hero, the DT-13 scale and still the default), L 16 / 18 / 20 / 22 / 24 / 30 / 40, XL 18 / 20 / 22 / 24 / 28 / 32 / 44. One preset is picked on the board, then becomes the only scale.
- Home: quicklink value 16 → body (20–24 px), serial number label → body-sm, state pill 28 → 36 px tall, "log in to operate" → body-sm. The quicklink category line is dropped in both orientations (the branch icon names the branch). Landscape: the logo, device name and serial sit in the left column above the start button, and the quicklinks take the full height of the right column, so they no longer collide with the serial at any preset. The start button never shrinks.
- Landscape nav user name 11 → 13 px.
Where: `src/styles/tokens.css`, `src/ui/dev/DevPanel.js`, `src/ui/screens/HomeScreen.js`, `src/styles/components.css`
Before → after: `home-*` at M / L / XL, both orientations, ready and alarm
Status: code only (trial) — other screens follow once a preset is chosen; Figma not updated
