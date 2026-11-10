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
Status: both (Figma P2-17, 2026-11-09: size/touch 88, touch-row 68) — still needs designer and PID sign-off (#51); glove test on the board still to do.

## DT-14 · Type-size trial on the board; home reworked for larger type (2026-11-05, device feedback)

Source: chat — on the board, every 16 px text is unreadable (16 px is a 1.3 mm cap height at 217 ppi)
Change:
- The type tokens are variables with three presets, switched live from the dev panel ("Type size") or with `?type=l|xl` in the URL, kept per device: M 13 / 16 / 18 / 20 / 22 / 28 / 36 px (caption / label / body-sm / body / body-lg / title / hero, the DT-13 scale and still the default), L 16 / 18 / 20 / 22 / 24 / 30 / 40, XL 18 / 20 / 22 / 24 / 28 / 32 / 44. One preset is picked on the board, then becomes the only scale.
- Home: quicklink value 16 → body (20–24 px), serial number label → body-sm, state pill 28 → 36 px tall, "log in to operate" → body-sm. The quicklink category line is dropped in both orientations (the branch icon names the branch). Landscape: the logo, device name and serial sit in the left column above the start button, and the quicklinks take the full height of the right column, so they no longer collide with the serial at any preset. The start button never shrinks.
- Landscape nav user name 11 → 13 px.
Where: `src/styles/tokens.css`, `src/ui/dev/DevPanel.js`, `src/ui/screens/HomeScreen.js`, `src/styles/components.css`
Before → after: `home-*` at M / L / XL, both orientations, ready and alarm
Status: code only (trial, closed by DT-15: XL chosen, the switch removed); Figma not updated

## DT-15 · XL type scale adopted for every screen (2026-11-05, device feedback)

Source: chat — of the DT-14 presets, XL reads best on the board
Change:
- XL is the only type scale (caption 18, label 20, body-sm 22, body 24, body-lg 28, title 32, hero 44 px; display 48 unchanged). The trial switch (dev panel "Type size", `?type=`) is removed.
- Parameter rows: label and value wrap to two lines instead of truncating; the ParamID runs inline after the label text, so it no longer takes its own column.
- Menu tiles: subtitle wraps to two lines; the tile surface fills the grid cell when a neighbour is taller. Login profile rows: the role / password-changed line wraps.
- Home: quicklink title is body (24 px) in portrait so two-word titles fit beside the icon; body-lg in landscape.
- Captions (`t-caption`) keep uppercase with tracking 0.08em (was 0.15em, too wide at 18 px).
- Nav user name: the user's own spelling (not uppercase), label size in portrait, 15 px in the 80 px landscape rail (a long name such as "m.mustermann" still ends in "…" there).
Where: `src/styles/tokens.css`, `src/styles/components.css`, `src/ui/dev/DevPanel.js`, `src/ui/components/ParamRow.js`, `MenuTile.js`, `src/ui/shell/NavBar.js`, `src/ui/screens/HomeScreen.js`, `LoginScreen.js`
Before → after: every screen; parameter lists show about 7 rows in portrait
Status: both (Figma P2-17, 2026-11-09: type/size/* and HMI/* text styles on the XL scale) — still needs designer and PID sign-off (#51)

## DT-16 · Running glow around the start button much stronger (2026-11-05, device feedback)

Source: chat — on the board, "running" must be visible from a distance
Change: `--hmi-glow-run` was one soft 60 px shadow at 50 % in an olive green. It is now three layers in the status run green (#22d464): a solid 4 px ring, a 40 px / 14 px-spread inner glow at 85 %, and a 140 px / 56 px-spread halo at 55 %. Light theme: same layers, toned down (ring in the darker run green, 60 % / 30 %).
Where: `src/styles/tokens.css` (only the start button uses the token)
Before → after: `home-*-run` portrait and landscape
Status: both (Figma P2-17, 2026-11-09: StartButton run / alarm variants carry the glow)

## DT-17 · Home device name and serial one step smaller (2026-11-05, device feedback)

Source: chat — on the board, device name and serial read too large at XL
Change: device name body (24 px) → body-sm (22 px); type · serial body-sm (22 px) → label (20 px).
Where: `src/ui/screens/HomeScreen.js`
Before → after: `home-*`, top right (portrait) / top left (landscape)
Status: both (Figma P2-17, 2026-11-09: presentation home frames)

## DT-18 · Real NOVEXX logo (2026-11-05, chat)

Source: Figma "Novexx Presentations", frame 0:137, layer `Logo` (0:155, image `Novexx_Solutions_Logo 1`, 300 × 107 PNG, white on transparent)
Change: the NOVEXX logo selection (608 = 609) shows the real "NOVEXX SOLUTIONS" logo instead of the spaced teal wordmark, on home (140 px wide), start-up (160 px) and stand-by (140 px). The PNG is white; the light theme renders it near-black with a CSS filter. ETIPACK and custom stay dummy wordmarks.
Where: `src/assets/logos/novexx.png`, `src/ui/components/Logo.js`, `src/styles/components.css`, `src/ui/screens/HomeScreen.js`
Before → after: `home-*`, `startup-*`, stand-by
Status: both (Figma P2-17, 2026-11-09: the PNG placed in every logo__img frame). The logo is a raster PNG at 300 px wide (about 2× the largest use); a vector version from PID would stay sharp at any size.

## DT-19 · Login profile list shows name and role only (2026-11-05, chat)

Source: chat — "do we need 'Password changed' on the login list?"
Change: the profile rows on the login screen no longer show "Password changed <date>"; the second line is the role only (Administrator, Operator, …). The docx asks for the last password change only in the L3 user-management list (P3-16b), and on the login screen it showed every password's age to anyone at the machine. The `login.lastChange` text stays for P3-16b.
Where: `src/ui/screens/LoginScreen.js`, `src/ui/screens/Components.js`
Before → after: `login-*`
Status: both for the ProfileRow component (Figma P2-17, 2026-11-09); the login profiles frame is not one of the 36 presentation frames and was not rebuilt

## DT-20 · Password keypad: three columns, no clear key, backspace bottom left (2026-11-05, chat)

Source: chat — the number layout of the password entry: remove "C", backspace to the bottom left
Change: the login password numpad (`renderNumpad({ pin: true })`) is a 3 × 4 grid: 7 8 9 / 4 5 6 / 1 2 3 / ⌫ 0 ↵. The clear key and the two empty fillers of the 4-column value keypad are gone, so every key is wider. Backspace sits bottom left, enter bottom right. The value keypad of the parameter editors is unchanged.
Where: `src/ui/components/Keyboard.js`, `src/ui/screens/LoginScreen.js`
Before → after: `login-*-password`
Status: both (Figma P2-17, 2026-11-09: login password-numpad frames)

## DT-21 · Password field anchored above the keys (2026-11-05, chat)

Source: chat — the empty band between the password field and the keypad
Change: on the password screen the field, the error line and the keys form one group at the bottom; the free space sits above, under the title. The field stays directly above the keys in 123 and ABC mode (it moves with the keyboard height), like the field above the keypad in the value editors. Landscape has no free space, so it looks the same. The error line is a full label line tall (was clipped at 20 px with the XL type).
Where: `src/ui/screens/LoginScreen.js`
Before → after: `login-*-password`
Status: both (Figma P2-17, 2026-11-09: login password-numpad frames)

## DT-22 · Text keyboard in five rows of at most ten keys (2026-11-05, chat)

Source: chat — the text keyboard looks too dense
Change: the umlauts and punctuation move to a row of their own, so no row has more than ten keys and every letter key is wider (portrait 35 → 40 px, landscape 50 → 56 px).
- lower / upper: q–p · a–l · ⇧ y–m ⌫ · ü ö ä - _ . @ · 123, space, enter
- symbols: 1–0 · ! ? # $ & * ( ) + = · € : ; , " ' < > ⌫ · % / [ ] - _ . @ · abc, space, enter
Five rows need more height: the keys in the landscape editor sheet are 52 px (were 68 px, four rows), and the login password field is 72 px tall in landscape (was 88 px). Portrait keeps 60 px keys.
Where: `src/ui/components/Keyboard.js`, `src/styles/components.css`, `src/ui/screens/LoginScreen.js`
Before → after: `editor-*-text`, `login-*-password` (ABC mode)
Status: both (Figma P2-17, 2026-11-09: Key set and the text-editor frames, five rows)

## DT-23 · More vertical space in pop-ups; long titles wrap (2026-11-05, chat)

Source: chat — more vertical spacing between title, text and buttons in the pop-up
Change: modal (info, error, confirm, help) padding: top 20 → 28 px, title to text 12 → 24 px, text to buttons 16 → 32 px, bottom 20 → 28 px, sides 20 → 24 px. The text-to-buttons gap sits on the button row, outside the scrolling text, so it stays visible when a long help text scrolls. Titles wrap to two lines instead of truncating ("Trigger-Button for Applicator Test Cycle"); the icon aligns with the first line.
Where: `src/ui/shell/ModalHost.js`
Before → after: `confirm-*`, `help-*`
Status: both for the Modal component (Figma P2-17, 2026-11-09)

## DT-24 · Branch colour as the title bar's left edge (2026-11-05, chat)

Source: chat — drill-down titles showed back arrow, a vertical colour mark and the title; the mark goes
Change: the 6 × 32 px pill between the back arrow and the title is removed; the title bar gets a 6 px left edge in the menu-branch colour instead, drawn as an inset shadow so the back arrow and title sit at the same place as on screens without a branch (a real border shifted them 6 px) (Settings blue, Production orange, Information green, Service yellow, Help teal, User management purple). Screens without a branch (main menu, login) have no edge.
Where: `src/ui/shell/TitleBar.js`, `tests/e2e/menu.spec.js`
Before → after: every drill-down screen, title bar
Status: both (Figma P2-17, 2026-11-09: TitleBar branch variants carry a 6 px branch-edge bar; the builder draws the edge on page title bars)

## DT-25 · Favourites as separate cards with their screen (2026-11-05, chat)

Source: chat — restyle the Favourites list card
Change: instead of one card with divided rows, each favourite is its own card (12 px apart). Above the name, the screen(s) the parameter lives on in the menu-branch colour ("Speed", "Stop · Label" when it appears on two screens), so a favourite says where it comes from. The name is semibold; the star is dropped on this screen (every row is a favourite). Value, changed marker, chevron and help button stay; un-starring still works from the help pop-up.
Where: `src/ui/screens/ParamListScreen.js` (favourites branch), `src/ui/components/ParamRow.js` (`context`)
Before → after: `favourites-portrait-*`
Status: code only — the favourites screen is not in the presentation set; Figma frame to follow

## DT-26 · Favourite card: help top right, chevron at the edge, smaller one-line value (2026-11-05, chat)

Source: chat — favourite card tweaks (screen name, name and ParamID unchanged)
Change: the help icon is bigger (28 px, was 20) and sits in the card's top-right corner (absolute, 68 px touch area); the chevron takes the right edge, with the value, at the bottom of the card. The value is body-sm (22 px, was 24) on one line, up to 60 % of the card wide, so an IP address no longer breaks between digits. Cards are at least 100 px tall so the value row stays clear of the help corner. The ParamID has its own line under the name (it no longer runs inline after it).
Where: `src/ui/components/ParamRow.js` (`context` variant)
Before → after: `favourites-portrait-*`
Status: code only — see DT-25

## DT-27 · Favourite card: value on the name's line (2026-11-05, chat)

Source: chat — move the value (IP address) inline with the title
Change: the card is a small grid: screen name, parameter name and ParamID stacked on the left; value and chevron sit on the name's line at the right edge (they were at the bottom of the card). The help icon stays in the top-right corner; its touch area is 68 × 44 px so it ends above the value line. Supersedes the bottom placement of DT-26.
Where: `src/ui/components/ParamRow.js` (`context` card; value markup shared with the list row)
Before → after: `favourites-portrait-*`
Status: code only — see DT-25

## DT-28 · Portrait editors open as a page with back (2026-11-05, chat)

Source: chat — editing opened "some kind of drawer"; move it to a new page with a back button
Change: in portrait every parameter editor (selection list, numeric keypad, slider, text keyboard, time / date picker, quicklink picker) covers the screen area as a page: title bar with back arrow and the parameter name (with the branch-colour edge), body below. Keypads, keyboards and pickers sit at the bottom (field directly above, as on the password screen, DT-21), with numpad keys at 88 px and keyboard keys at 68 px; lists start at the top. The title-bar back and the nav-bar BACK both close the editor and stay on the parameter screen. The page uses the shell's background gradient. The nav bar stacks above editor pages (z 35, modals stay above at 40) so the level badge rising over its edge is never covered, and the page body has 28 px bottom padding so the keys clear the badge. Landscape keeps the side sheet for now.
Deviation: docx §7.2 asks that the editor not cover the edited field; on a page the field's name is the page title instead, and the list is back as soon as the editor closes. Toggles still flip in place.
Where: `src/ui/shell/SheetHost.js` (page mode), `src/app.js` (`back` closes an open editor first), `src/ui/editors.js`, `src/styles/components.css`, `tests/e2e/editors.spec.js`
Before → after: `editor-*-portrait`
Status: both (Figma P2-17, 2026-11-09: Sheet State=page and the editor frames) — needs designer / PID confirmation of the §7.2 deviation (open point #52)

## DT-29 · Favourite card: help icon back in its right-hand column (2026-11-05, chat)

Source: chat — move the help icon back to the right (no absolute position), at its earlier size
Change: the help icon returns to its own 68 px column at the right of the card, 20 px like in the parameter lists, centred vertically (it was a 28 px icon pinned to the top-right corner, DT-26). Value and chevron stay on the name's line (DT-27). The help column is 48 px wide on these cards (68 px tall), so chevron and help icon sit about 20 px apart instead of about 40 px; list rows keep the 68 × 68 help target. The icon is right-aligned in that column with the same 17 px inset from the card edge as the text on the left, and sits on the value line (centres level).
Where: `src/ui/components/ParamRow.js`
Before → after: `favourites-portrait-*`
Status: code only — see DT-25

## DT-30 · Parameter rows: 20 px text, chevron next to help, corner mark on dependent rows (2026-11-05, chat)

Source: chat — PConnector screen looked off (indented rows read as misalignment); global change to the parameter cards
Change (every parameter row and favourite card in the app):
- Parameter name and value 24 → 20 px (label size); the ParamID stays 18 px.
- The help column is 48 px wide with the icon right-aligned 17 px from the card edge, and the row has no right padding, so the chevron sits about 20 px from the help icon (was about 40 px). Help stays 68 px tall.
- Dependent (conditional) rows show a corner mark (└, 12 px, faint) before the name; the indent per level is unchanged in total (the mark takes part of it), so names line up as before.
- Values wrap between words only ("PConnector PLC Signals" no longer breaks inside "PConnector").
Where: `src/ui/components/ParamRow.js`
Before → after: every parameter list (e.g. `pconnector`, `label`, `speed`), `favourites-*`
Status: both (Figma P2-17, 2026-11-09: ParamRow set)

## DT-31 · ParamID always on its own line under the name (2026-11-05, chat)

Source: chat — the number should always appear in the next row
Change: in every parameter row the ParamID sits on its own line under the name (it ran inline after the name, and dropped to the next line only when the name was long). Same as on the favourite cards (DT-26). Rows keep 68 px; the favourite star stays after the name; the corner mark of dependent rows (DT-30) aligns with the name line.
Where: `src/ui/components/ParamRow.js`
Before → after: every parameter list
Status: both (Figma P2-17, 2026-11-09: ParamRow set)

## DT-32 · Landscape pass, first fixes: nesting, status label, menu tiles (2026-11-05, landscape review)

Source: landscape review of every screen
Change:
- Nesting: rows directly under a group header ("INFORMATION") line up with the header; in the source data they are one level in, which drew a corner mark (DT-30) on every Information row. Only nesting under another row counts as indent now, conditional or not (Inhibit and Cycle-Signal sit under PConnector Function Selection without a condition and keep their mark). Applies to both orientations.
- Status rail (landscape): the state label is 18 px (was 22 px, which broke "Running" into "Runnin / g"); the rail's side padding is 2 px, so the longest state, "Stand-by" (76 px), fits on one line, and nothing breaks inside a word.
- Menu tiles (landscape, three per row): title 24 px (was 28 px, which broke "Authentication" inside the word).
Where: `src/ui/screens/ParamListScreen.js`, `src/ui/components/ParamRow.js`, `src/ui/shell/StatusBar.js`, `src/styles/components.css`, `src/ui/components/MenuTile.js`
Before → after: `info-*`, `pconnector-*`, landscape status rail, `menu-landscape-*`
Status: both (Figma P2-17, 2026-11-09: landscape menu and list frames)

## DT-33 · Landscape editors open as pages too (2026-11-05, landscape review)

Source: chat — landscape editors as pages, like portrait (DT-28)
Change: in landscape every editor opens as a page over the main area (title bar with back and the parameter name, branch edge) instead of the docked side sheet with grip and close. Lists start at the top; the numeric keypad keeps the field beside the keys (keys 84 px); the time / date picker keeps Now / Set beside the steppers; the text keyboard sits under the field with 48 px keys (five rows under the title bar). Both back buttons close the editor. The docked sheet stays in the code (`page: false`) but no editor uses it.
Where: `src/ui/shell/SheetHost.js`, `src/styles/components.css`, `tests/e2e/editors.spec.js`
Before → after: `editor-*-landscape`
Status: both (Figma P2-17, 2026-11-09: landscape editor frames) — same §7.2 deviation as DT-28 (open point #52)

## DT-34 · Landscape home and rails: badge only, vertical state, machine data under the start column (2026-11-05, landscape review)

Source: chat — landscape home review
Change:
- Nav rail (landscape): the user name / "Not logged in" under the level badge is hidden; the badge (always visible, docx §4.1) stays and still opens login / user. Portrait keeps the name.
- Status rail (landscape): the state label runs vertically under the dot, read bottom to top like the "secure until" note, at full size (22 px); it is never wrapped (replaces the horizontal label of DT-12 / DT-32). Status text stays on every screen so the state is never colour-only.
- Home (landscape): device name and type · serial move from under the logo to the bottom of the left column, below the state pill and the log-in hint; the logo sits alone at the top. Portrait keeps them top right.
- Home: "Log in to operate the machine" is centred (it wraps in the landscape column).
Where: `src/ui/shell/NavBar.js`, `src/ui/shell/StatusBar.js`, `src/styles/components.css`, `src/ui/screens/HomeScreen.js`
Before → after: `home-*-landscape` (L0, L1 run, alarm)
Status: both (Figma P2-17, 2026-11-09: StatusBar / NavBar landscape variants, landscape home frames)

## DT-35 · Landscape numeric keypad under the field, not beside it (2026-11-05, landscape review)

Source: chat — in landscape the keypad sat on the right and the field on the left; the keypad belongs at the bottom
Change: the numeric editor has the same layout in both orientations: field and range hint on top, keypad below across the full width, at the bottom of the page. In landscape the keys are 148 × 60 px (were 66 × 84 px beside the field): shorter, but more than twice as wide.
Where: `src/ui/components/NumericKeypad.js`, `src/styles/components.css`
Before → after: `editor-numeric-landscape`
Status: both (Figma P2-17, 2026-11-09: landscape numeric-error frames)

## DT-36 · Landscape time / date picker stacked: Now / Set at the bottom (2026-11-05, landscape review)

Source: chat — stack the landscape picker like the keypad (DT-35)
Change: the time / date picker has one layout in both orientations: steppers and hint on top, Now / Set side by side at the bottom. In landscape the up / down steppers are 60 px tall (88 px in portrait) so everything fits under the title bar; the separator between the fields moves up to match.
Where: `src/ui/components/DateTimePicker.js`
Before → after: `editor-time-landscape`, `editor-date-landscape`
Status: both (Figma P2-17, 2026-11-09: landscape date-error frames)

## DT-37 · More space between the number field and its range hint (2026-11-05, chat)

Source: chat — the info text sat too close to the input field
Change: the gap between the numeric field and the "Min · Max · Default" hint is 12 px (was 4 px), in both orientations. To keep the landscape page free of scrolling, its keypad keys are 58 px tall (were 60 px).
Where: `src/ui/components/NumericKeypad.js`, `src/styles/components.css`
Before → after: `editor-numeric-*`
Status: both (Figma P2-17, 2026-11-09: numeric-error frames)

## DT-38 · Landscape status rail transparent (2026-11-05, chat)

Source: chat — make the right-hand bar (state and icons) transparent to see how it looks
Change: the landscape status rail has no fill (was the background at 70 %); the page gradient shows through. The 1 px divider to the content stays. Portrait status bar unchanged.
Where: `src/styles/components.css`
Before → after: any landscape screen, right rail
Status: both (Figma P2-17, 2026-11-09: StatusBar landscape variants) — kept after the trial, with the divider line

## DT-39 · Landscape home: left column centred vertically (2026-11-05, chat)

Source: chat — align logo, start button, state pill and the rest in the vertical centre (landscape)
Change: in landscape the logo moves into the start column, and the whole group (logo, start button, state pill, log-in hint at L0, device name and serial) is centred vertically in the left column, which now spans the full height beside the quicklinks (the separate top row is gone in landscape). With the error banner the group centres in the space above it. Portrait unchanged.
Where: `src/ui/screens/HomeScreen.js`
Before → after: `home-*-landscape`
Status: both (Figma P2-17, 2026-11-09: landscape home frames)

## DT-40 · Strong glow for warning and alarm too (2026-11-05, chat)

Source: chat — do the big running shadow (DT-16) for warning and alarm as well
Change: the start button's glow has the same three layers in every machine state that matters from a distance: solid 4 px ring, dense 40 px inner glow, wide 140 px halo — run green, warning orange (new `--hmi-glow-warning`, `shadow-glow-warning`), alarm red (`--hmi-glow-error`, was one soft 60 px shadow). Light theme: same layers, toned down. The start button is disabled during an alarm; it no longer fades as a whole (that dimmed the glow to 40 %) — only its play icon dims.
Where: `src/styles/tokens.css`, `src/styles/components.css`, `src/ui/screens/HomeScreen.js`
Before → after: `home-*-warning`, `home-*-alarm`
Status: both (Figma P2-17, 2026-11-09: StartButton alarm variants; tokens updated)

## DT-41 · Start icon in the state colour (2026-11-05, chat)

Source: chat — on running, warning and alarm, colour the icon too
Change: the start button's icon takes the state colour along with its glow: run green (pause icon, as before), warning orange, alarm red. Otherwise brand teal, or muted when locked (L0). The alarm icon is no longer dimmed (DT-40); the button stays disabled during an alarm.
Where: `src/ui/screens/HomeScreen.js`
Before → after: `home-*-warning`, `home-*-alarm`
Status: both (Figma P2-17, 2026-11-09: StartButton icon colours)

## DT-42 · Warning in amber; state pill keeps its height (2026-11-05, chat)

Source: chat — warning orange was too close to alarm red; the state pill under the start button changed height on alarm / warning
Change:
- Warning colour is amber #ff9f0a (light-theme text #b86b00), was orange #ff601c. It is a colour of its own (`--raw-amber-*`): status dot and label, home pill, banner, nav line, start-button glow and icon. The level-2 badge and the Production branch stay orange.
- The state pill is 36 px in every state: with the error / warning banner the start column ran short of height and the pill shrank. It no longer shrinks; the landscape column spacing is 12 px (was 16 px) so the whole group still fits above the banner at L0.
Where: `src/styles/tokens.css`, `src/ui/screens/HomeScreen.js`
Before → after: `home-*-warning`, `home-*-alarm`
Status: both (Figma P2-17, 2026-11-09: amber/500 / amber/700 primitives, warning aliases)

## DT-43 · Landscape home: logo at the top, machine data at the bottom, cards spread to match (2026-11-06, chat)

Source: chat — "on horizontal home, pull logo to top, and Jakobs XLS... to the bottom"; then space the cards so their top lines up with the logo and their bottom with the machine data
Change:
- In the landscape start column the logo sits at the top edge and the machine name / type · serial at the bottom edge; start button, state pill and login hint stay centred between them (auto margins). The column has 16 px top/bottom padding (was 8 px).
- The quicklink cards spread over the same height: the first card's top lines up with the logo's top, the last card's bottom with the machine data's bottom (16 px padding in both columns). The gap between cards is 16 px (was 8 px) and the cards share the rest of the height equally (about 100 px each, were 93 px); spreading only the gaps (about 25 px) was too much.
- The state pill sits 24 px below the start button (was 12 px); the other gaps in the column are 8 px (were 12 px), which only shows when the column is full.
- With the alarm banner at L0 both columns are full: the start group closes up and the logo sits 8 px from the top instead of 16 px; nothing scrolls or is cut off.
Where: `src/ui/screens/HomeScreen.js`
Before → after: `home-landscape-*`
Status: both (Figma P2-17, 2026-11-09: landscape home frames)

## DT-44 · User screen: Log out clear of the nav bar; one bottom row in landscape (2026-11-06, chat)

Source: chat — the button on `#/user` looked squished
Change:
- Portrait: the Log out button ended 16 px above the nav bar, under the level badge that rises 17 px over the bar's edge. The screen now keeps 32 px clear above the nav bar like the other portrait screens (DT-06).
- Landscape: Log out sat 32 px below the fold (it needed scrolling). User management and Log out now share the bottom row (3 : 2 width, so "User management" stays on one line); the page fits without scrolling, also with the L4 "secure until" row.
Where: `src/ui/screens/UserScreen.js`
Before → after: `user-*`
Status: code only — the user screen is not in the presentation set; Figma frame to follow

## DT-45 · Slider styled after the first draft's playground slider (2026-11-06, chat)

Source: chat — take the slider styling from the first draft (`D:\Projects\NovexxPrototype-HTML`, `src/styles/components/_slider.css`, `playground.html`) and try it; ready to revert
Change:
- Track: 15 px with a 2 px gradient ring (`--hmi-gradient-stroke`, the draft's `--gradient-stroke-secondary`) on the form surface (was a flat 8 px pill).
- Fill coloured by thirds of the range, as in the draft: red (`status-error-ink`, the draft's `--red-light`) below 1/3, yellow (`status-standby`) to 2/3, green (`status-run`) above (was brand teal at every value).
- Thumb: 40 px round on the card surface gradient with a 2 px gradient ring (was white with a teal border); grows 10 % while dragging.
- Min and max above the track, flush with its start and end; tick marks under the track (11, long at 0 / 50 / 100 %); Default on its own line below.
- Steppers match the thumb: a 56 px circle with the same gradient ring and surface gradient, 28 px chevron; the touch area stays 88 × 88 px.
- Kept from the app: the large value with unit on top (the draft's detail-page readout); the touch area of the track (68 px tall); the value label that follows the thumb in the draft is left out, the large value shows it already.
Note: red / yellow / green are the machine-state colours (alarm, stand-by, running) everywhere else in the app; on the slider they only mean the position in the range.
Where: `src/ui/components/Slider.js`, `src/styles/components.css`
Before → after: `editor-slider-*`
Status: both (Figma P2-17, 2026-11-09: Slider set) — kept after the trial

## DT-46 · Start-button glow pulses while running, on warning and on alarm (2026-11-09, chat)

Source: chat — animate the shadow around the home start button when it shows running, warning or alarm
Change:
- The state glow (DT-16 / DT-40) breathes: it fades from full strength to 35 % and back. Running and warning: 1.6 s each way; alarm: 0.8 s, so it reads as more urgent. Ready / locked keep the steady teal glow.
- Only opacity animates, on a pseudo-element that carries the glow, so the embedded GPU composites it and the 140 px halo is not repainted every frame (docx §3: basic animations only). Ring, glow and halo fade together. Off when the system asks for reduced motion.
- Tried and rejected in chat: a liquid aura with orbiting particles, and a light running around the rim (after the "glowing button" reference video); back to the pulse.
Where: `src/ui/screens/HomeScreen.js` (`data-pulse`), `src/styles/components.css`
Before → after: `home-*-run`, `home-*-warning`, `home-*-alarm`
Status: both for the look (Figma P2-17, 2026-11-09: the glow at full strength); the pulse itself is code only (Figma has no animation here) — to be checked for smoothness on the board

## DT-47 · Action rows get an action pill with a pressed state (2026-11-09, P2-10)

Source: plan — P2-10 left the dedicated pressed action-button variant open; docx §7.2 "Action: needs a pressed state"
Change:
- Action parameter rows (1–7, 800–808) show an outlined pill (64 × 44 px, brand outline, power icon) instead of a bare icon. It fills with the brand colour while pressed and stays filled while the "moves the machine" confirmation is open, so it is clear which action is waiting.
- IP fields show the address hint when a key cannot be taken, instead of ignoring it (§7.3, P2-14).
Where: `src/ui/components/ParamRow.js`, `src/ui/screens/ParamListScreen.js` (`data-armed`), `src/styles/components.css` (`.param-action`), `src/ui/components/AlphaKeyboard.js`
Before → after: `action-armed` (phase2-flows.spec)
Status: both (Figma P2-17, 2026-11-09: ParamRow State=action carries the outlined action pill)

## DT-48 · Icon strokes stay 1.5 px at every size (2026-11-10, chat)

Source: chat — "all icons from icon set should be 1.5 stroke thickness"
Change:
- The icon set is drawn on a 24 px canvas with a 1.5 px stroke. Icons shown larger (32 px in the bars, 48 px on tiles) scaled the stroke with them, to about 2 px and more. The stroke now stays 1.5 px at any size.
- Code: the sprite gives every stroked shape `vector-effect="non-scaling-stroke"` (added by `scripts/build-sprite.mjs`; the exported SVGs are unchanged).
- Figma: stroke weight 1.5 on every icon instance on the HMI pages (components and screens; 565 vectors changed); the builder resets it after scaling, so rebuilds keep it. The masters on "Icons v1 – 24 px" were already 1.5 and were not touched. Spinners and progress rings are not icons and keep their own stroke.
Where: `scripts/build-sprite.mjs`, `src/assets/icons/sprite.svg`, `scripts/figma/build-frames.js`
Status: both (2026-11-10)

## DT-49 · Dialog buttons 78 px tall (2026-11-10, Figma)

Source: Figma — designer edit of the Modal set: the buttons hug their label with 24 px padding (78 px) instead of the 88 px touch height
Change: OK / Cancel / destructive buttons in every dialog are 78 px tall; radius 16 and the 32 / 28 px space around them unchanged. Still well above the 60 px minimum of docx §5.4, but below the 88 px touch target of DT-13 — part of the #51 sign-off.
Where: `src/ui/shell/ModalHost.js`
Status: both (2026-11-10; Figma edited by the designer, code followed)

## DT-50 · Light badge text for levels 2 and 3 (2026-11-10, Figma)

Source: Figma — designer edit of the NavBar set (portrait L2 / L3 badge text white); chat: "dependable on user role user badge should have light text like i added to NavBar"
Change: the level badge shows white text on the orange (L2, supervisor) and purple (L3) badges, black text on L0, L1 and L4. Contrast in dark theme: white on orange 3.0 : 1, on purple 3.9 : 1 (22 px bold, large text). In the light theme the darker level colours would read better with white on every level (L0 5.4, L1 4.7, L4 5.6 : 1 against 3.9, 4.5, 3.7 with black) — open for the designer.
Where: `src/ui/shell/NavBar.js` (`LIGHT_BADGE`)
Status: both (2026-11-10; Figma landscape NavBar variants set to match the designer's portrait ones)

## DT-51 · Ioskeley Mono replaces Fira Code (2026-11-10, chat)

Source: chat — "Download this font and use it instead Fira Code: https://ahatem.github.io/IoskeleyMono/"
Change:
- The monospace face for parameter values, codes, counters and the password field is Ioskeley Mono v2.2.0 (built on Iosevka; SIL OFL 1.1, like Fira Code). Figtree stays the text face.
- Code: Regular / SemiBold / Bold from the release's web subset (Latin, punctuation, arrows, math; about 95 KB each) self-hosted in `src/assets/fonts/ioskeley-mono/` with the licence; `@fontsource/fira-code` removed. Token `--font-mono`.
- Ioskeley is narrower than Fira Code, so values take less width at the same size.
- Figma: the font has to be installed on the machine running Figma (desktop TTF, Normal / Hinted). Then `type/family/mono` switches to it and every mono text follows; the builder maps both names to that variable.
Where: `src/styles/fonts.css`, `src/styles/app.css`, `src/styles/tokens.css`, `scripts/figma/build-frames.js`
Status: both (2026-11-10: font installed; `type/family/mono` and the HMI/Param text styles switched, 289 mono texts on the HMI pages now Ioskeley Mono Regular / Semibold / Bold, no missing fonts; the builder also accepts the "Semibold" spelling)

## DT-52 · Shared pieces for the special screens (2026-11-10, P3-01)

Source: plan P3-01; docx §5.4 (list row, table row, confirmation, progress / result, placeholders) and §8 (scroll indication, end-of-list marker, one confirmation pattern, "no USB drive" as an empty state). The clickdummy sketches give the content only.
Change (Mono's visual design for these, first version for gate G3-1):
- List rows: title with a meta line (date · level, size · date), 68 px minimum; selected = brand tint (15 %) + filled radio mark; disabled = 40 % opacity. Folder and file rows carry a 44 px icon tile that turns brand when selected.
- End of list: "End of list" between two hairlines. Scroll indication: a fade to the page colour and a chevron at the bottom edge while more content follows.
- IO rows: HIGH as a green pill, LOW grey; the force switch turns amber when on; a forced output gets an amber left edge, a 10 % amber tint and the "Forced" tag, so it can be found in a long list (amber = warning colour, DT-42).
- Progress / result: a strong card; running shows the phase, the percentage in Ioskeley Mono and a warning line in amber; success / failure show a 80 px tinted badge (green check / red alarm). The check is drawn in CSS until the icon set has one (#53).
- Placeholders: 96 px icon disc, title, one line of help, optional action; loading is a turning ring (static when reduced motion is asked for).
- File browser: path bar (open-folder icon, last folder bold), "One level up" row, folders before files, foreign files greyed.
Where: `src/ui/components/{ListRow,TableRow,ConfirmDialog,ProgressResult,Placeholder,FileBrowser}.js`, `src/styles/components.css` (`.scroll-hint`, `.hmi-switch`, `.placeholder__spinner`)
Before → after: `shared-*` (shared.spec)
Status: both (2026-11-10; Figma sets ListRow, ListEnd, TableHeader, TableRow, PathBar, Placeholder, ProgressResult)
Note (Figma builder, same day): assigning a variable-bound paint resets its opacity to 1, so translucent fills (NavBar 85 %, tints) came out opaque in Figma. The builder now sets the opacity again after the assignment (`setFills`); 30 NavBar variants and 73 bar instances on the screen pages were corrected in place.

## DT-53 · Four new icons: check, file, up, usb (2026-11-10, chat)

Source: chat — "create missing icons in Icons v1 – 24 px page"; open point #53 (the P3-01 pieces had no check, file, "one level up" or USB icon)
Change:
- New components on "Icons v1 – 24 px", drawn to the rules of that page (24 px canvas, 1.5 px stroke, round caps and joins, half-pixel coordinates, corner radius 1.5, 45° diagonals): `icon/24/check` (tick), `icon/24/file` (page with folded corner, no lines — `recipe` keeps the lined page for formats), `icon/24/up` (arrow up on a bent stem: one folder level up), `icon/24/usb` (stick with two contacts; redrawn by the designer the same day: larger body 5–19 × 10–22, connector 8–16). Checked at 48 px on light and dark next to `files`, `recipe`, `back`, `lock`, `plus`.
- No separate folder icon: `files` already is a closed folder and stays the folder row icon.
- Used in code: success badge (was a check drawn in CSS), file rows, "One level up", "No USB drive". Figma: ProgressResult success badge and the ListRow file variants switched to the new icons.
Where: `src/assets/icons/{check,file,up,usb}.svg`, sprite rebuilt (71 icons); `ProgressResult.js`, `FileBrowser.js`
Status: both (2026-11-10). The 48 px masters on "Icons v1" were not touched; to be drawn there if the 48 px set is kept in step.

## DT-54 · Format screens (2026-11-10, P3-02 … P3-04)

Source: plan P3-02 … P3-04; docx §8.1–8.3 (content and acceptance), clickdummy "formatlist" / "textinput" sketches (content only)
Change (Mono's design, first version for gate G3-1):
- Select / Modify share one page: the format list (ListRow select rows: name, "date · who (level)", a brand "Loaded" tag) in a scroll area with the scroll hint and end marker, and a fixed action strip at the bottom: a status line and the primary button. Landscape puts status and button side by side to keep four rows visible.
- The status line carries the state: "n parameters differ from the live settings", "No differences to the stored file" (green, check), "Select a format first", or "Stop the machine to load a format" (amber). The button never silently does nothing: when it cannot act it is dimmed and explains with a toast (not selected, running, no differences, needs level 2 with a lock icon).
- Loading is a normal confirmation (it changes the machine, not a file); overwriting is destructive (red, "cannot be undone"). Both name the format and repeat the difference count.
- Create: the name field (Input, Kind=text) with the keyboard below on the page; a duplicate shows "<name> already exists" as you type and an "Overwrite instead" button (beside the field in landscape); the Save key on the keyboard saves.
- Decision: after Create or Overwrite the saved format is marked loaded, because the live values now equal it.
Where: `src/ui/screens/formats/*.js`, `src/core/formats.js`, `src/data/seed/formats.json`, `ListRow` (`tag`)
Before → after: `formats-*` (formats.spec)
Status: code only — Figma frames with P3-22b

## DT-55 · Keyboard submit key shows a check (2026-11-10, chat)

Source: chat — "Change icon on keyboard teal submit button to check icon"
Change: the teal submit key on the alphabetical keyboard and on both numpads (parameter editors, login, Create Format) shows the new `check` icon instead of `activate` (power) or `save`. The power icon stays where it means "run / switch on": start button, action rows, the start confirmation. The date picker's "Set" button is a button, not a keyboard key, and keeps its icon.
Where: `src/ui/components/Keyboard.js` (default), `AlphaKeyboard.js`, `NumericKeypad.js`, `LoginScreen.js`, `formats/CreateFormat.js`
Status: both (2026-11-10: Figma Key and NumpadKey `Kind=enter` variants swapped to `icon/24/check`; the screen frames follow)

## DT-56 · Speed Test screen (2026-11-10, P3-05)

Source: plan P3-05; docx §8.4 (live m/min and Hz once a second, no-signal state, result block set apart, warning before the test, read L1 / run L2)
Change (Mono's design, first version):
- Two cards: "Live · external encoder" with two large Ioskeley Mono readouts (m/min, Hz) and a status dot (green = signal, red = none); "Result" in a strong-border card with time to next label and rated product rate. Landscape: the two cards side by side.
- No signal: both readouts "—" plus a red "No encoder signal" line with what to check; never a 0 that looks like a reading.
- Bottom strip: amber "The test moves the machine." and Run speed test (L2, lock below); while measuring, "Measuring… n of 5 s", a progress bar and Stop. The test length (5 s) is a prototype value; the real one comes from the firmware.
- Product rate shows "Off (Calc Product Rate)" when parameter 136 is off instead of a number.
Where: `src/ui/screens/service/SpeedTest.js`, `src/core/simulator.js`
Before → after: `speedtest-*` (speedtest.spec)
Status: code only — Figma frames with P3-22b

## DT-57 · IO-Test screen (2026-11-10, P3-06)

Source: plan P3-06; docx §8.5 (modular row / group header / state indicator, in vs out at a glance, forcing at L3 with marking, reset on leave or timeout, "all outputs back to normal", explicit warning, L1 and L3 faces)
Change (Mono's design, first version):
- Group filter as pill chips at the top (All + one per IO group from the machine configuration); in "All" each group has its header and its own card.
- Rows (TableRow): pin in Ioskeley Mono with an IN (grey) / OUT (teal) tag under it; function; a lamp pill for the state (filled dot + HIGH on green, ring + LOW on grey); on L3 a force switch on outputs only.
- Forcing: the switch drives the output HIGH; off releases it. The first force on a visit asks once with the warning; a forced row gets the amber edge, tint and "Forced · n s" (time to the automatic reset); the bottom strip says how many outputs are forced and offers "All outputs back to normal". Leaving the screen resets everything.
- Below L3 the force column is left out entirely and the strip says forcing needs level 3 (the read-only face).
Where: `src/ui/screens/service/IoTest.js`, `src/ui/components/TableRow.js`, `src/core/simulator.js` (`FORCE_TIMEOUT_MS`)
Before → after: `iotest-*` (iotest.spec)
Status: both for the TableRow set (Figma rebuilt 2026-11-10); the screen frames with P3-22b

## DT-58 · Applicator test feedback and counter units (2026-11-10, P3-07)

Source: plan P3-07 (buttons confirm, counters at the 1 s refresh, L3); Excel parameters 722–727 carry no unit
Change:
- The applicator test and test-mode screens stay parameter lists; the action rows now do something in the simulator and say so: actuator buttons toast "Cylinder active · On / Off", the single-step button "Single step cycle · 2/4", and the four times appear in the counter rows.
- Units on the counters (through overrides.json, not by hand in the generated data): 722–725 in ms, 726 in s; 727 is a plain count.
Where: `src/core/simulator.js` (`applicator`, test-mode tick), `src/ui/screens/ParamListScreen.js`, `src/data/overrides.json`
Before → after: `applicatortest-l3` (applicator.spec)
Status: code only — screen frames with P3-22b
