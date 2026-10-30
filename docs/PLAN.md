# Plan — Labeller HMI functional app with dummy data

## Context

PID Group commissioned Mono to design and build the next-generation HMI for its labeller machines (4.3", 800×480, capacitive touch, gloves). Four inputs exist:

| Input | Binding for | Location |
|---|---|---|
| `Frontend_Design_Requirements_Labeller_HMI_v1.6.docx` (PID, Oct 2026) | **Everything. Where inputs disagree, this document decides.** | `C:\Users\ibasic\Desktop\Novexx` |
| `PID_Labeller_HMI_Clickdummy.html` | Structure and function (54 screens, 214 parameters, 15 mask specs, open questions). Not binding for design. | same |
| `Menu Structure20260921 (1).drawio` + `Parameterliste-PreSeriesPhase (12).xlsx` | Menu tree; parameter type → control, ranges, defaults, access, show conditions | same |
| `D:\Projects\NovexxPrototype-HTML` (Webpack + PostCSS/BEM, 18 static pages) | Style reference only: tokens, Figtree/Fira Code, gradient-border cards, dark theme | existing repo |
| Figma `Novexx Presentations` (key `kNEZtQrnGyteWqDZIi0JAf`) | Mono's icon set: page **Icons v1** has 67 components `icon/<name>` (48 px, stroke 2) | Figma |

Goal: a complete, clickable, state-driven HMI app with dummy data that implements every requirement in the v1.6 document, built in the same Figma file in parallel, with phases, tickets and tests. Deliverables per docx §10: Figma file, HTML/CSS implementation, components with all states, tokens for both themes, all screens in 3 layouts × 2 themes, icons, spec, clickable prototype.

## Decisions already made (with the user)

- New repo at `D:\Projects\NovexxLabelerApp` (GitHub later).
- **Vite + Tailwind v4 + vanilla JS (ES modules)**. No framework, no TypeScript. Replaces Webpack + PostCSS.
- Figma is generated **from the code** by Claude via the Figma MCP into `Novexx Presentations` (new pages; existing pages untouched). A designer polishes afterwards.
- Icons: **export Mono's Icons v1 from Figma now**; the 67 PID 24 px SVGs in `Novexx/icons` are only a fallback for any missing name (currently none).
- Tickets as **Markdown in the repo** (`docs/`), traced to docx sections.
- Tests: **Vitest** (unit) + **Playwright** (flows + screenshots in 3 layouts × 2 themes).
- Languages: **English + German** real, other 24 selectable with English fallback.

## Architecture

### Repo layout (`D:\Projects\NovexxLabelerApp`)

```
index.html                 single entry, <html data-theme data-orientation>
vite.config.js, tailwind via @tailwindcss/vite
package.json               dev/build/preview/test/test:e2e/data:sync/icons:sync/figma:sync
scripts/
  extract-data.mjs         clickdummy DATA (line 641) + xlsx → src/data/*.json (idempotent, re-runnable)
  validate-data.mjs        asserts known quirks are handled (types "?", 5-digit colour, AND/OR fixes…)
  export-icons.mjs         Figma Icons v1 → src/assets/icons/*.svg → sprite
src/
  main.js                  boot: load data, restore persistence, start simulator, mount shell, start router
  styles/app.css           @import "tailwindcss"; @theme tokens; [data-theme=light] overrides; @layer components (gradient-border, type scale)
  data/
    params.json            214 params (id, name, type, inputType, unit, min, max, default, cond, accessRead/Write, options, subindex, icon, color)
    options.json           127 discrete options
    menu-tree.json         54 nodes (menu/list/mask/placeholder/ref) with branch colour, icon, items[]
    overrides.json         docx v1.6 corrections to clickdummy data (access levels, pre-fill rules, FIFO…) — reviewed by hand
    runtime.json           cmd/state params 1–13
    i18n/en.json, de.json  UI chrome + parameter names + option labels + help placeholders (40/600 char)
    seed/                  dummy formats, users, logs, errors, IO pins, USB tree, firmware versions
  core/
    store.js               tiny reactive store (get/set/subscribe/select), slices: machine, session, params, ui, data
    router.js              hash router + explicit back-stack ("back returns to where you came from", refs resolve to one screen)
    conditions.js          show-condition parser: `;` OR (lowest), `&` AND, `{id}`, `{id=opt}`, `{id!=opt}`, `{id>n}`, `{id<n}` — fixes clickdummy bugs
    access.js              levels 0–4, canRead/canWrite(param, level), L4 time-limited session
    validate.js            numeric min/max/step, string rules, password policy (618–627), duplicate names
    i18n.js                t(key), language switch, temp language, fallback, text-length audit helper
    theme.js               dark/light via data-theme; bound to HMI_Dark_Mode (612)
    orientation.js         portrait / landscape-lh / landscape-rh + 180° variants via data-orientation; bound to 601
    persist.js             localStorage snapshot (params, users, formats, logs, favourites, session); "factory reset" in dev panel
    simulator.js           dummy firmware: machine state machine (Offline/Online/Pause/Run/Alarm/Warning), counters ticking in Run, encoder m/min+Hz, live IO toggling, error/warning injection, boot progress, FW-update progress, auto log-off, standby timer
  ui/
    shell/                 AppShell, StatusBar, TitleBar, NavBar (level badge), Toast, ModalHost, SheetHost
    components/            MenuTile, Pager, ParamRow, GroupHeader, ToggleBar, SelectionList, NumericKeypad, AlphaKeyboard, Slider, FavouriteMarker, HelpModal, ListRow, TableRow, ConfirmDialog, ProgressResult, Placeholder(empty/loading/error), Button, Icon
    screens/
      StartupScreen, HomeScreen, LoginScreen, MenuScreen (generic), ParamListScreen (generic), FavouritesScreen, SearchScreen,
      formats/ SelectFormat, ModifyFormat, CreateFormat
      service/ SpeedTest, IoTest, ApplicatorTest, TestMode, DiagnosisLogs, ErrorHistory, Reporting, Backup, FwUpdate, UserModified
      users/ CreateUser, UserSettings, UserManagement, SecureCode, CountrySettings
      help/ ReportingQr, Search
      wizard/ SetupWizard
    dev/DevPanel.js        hidden panel (keyboard shortcut): set level, machine state, orientation, theme, language, inject error, reset data — also used by Playwright
    screens/Styleguide.js  dev route #/styleguide: every component in every state, for design review gates
tests/
  unit/                    vitest: conditions, access, validate, store, router back-stack, i18n fallback, simulator transitions
  e2e/                     playwright: flows + screenshots (matrix: 3 layouts × 2 themes × EN/DE for key screens)
docs/
  PLAN.md                  this plan, kept current
  ARCHITECTURE.md          module map + ADRs (why Vite, why no framework, data pipeline)
  REQUIREMENTS-TRACE.md    docx section → tickets → tests
  tickets/P0-..P5-*.md     one file per ticket (goal, scope, acceptance criteria quoting the docx, test, Figma output)
  OPEN-POINTS.md           questions for PID/Mono with the assumption taken meanwhile
  DESIGN-LOG.md            DT-nn design tweaks from chat or Figma: what, where, before/after
  FIGMA.md                 page structure, naming, how sync works
```

### Key patterns

- **Screens are data.** `menu-tree.json` drives MenuScreen and ParamListScreen; special screens are modules registered by `mask.type`. Adding a parameter = editing JSON. `ref` nodes resolve to their target so a screen reachable from two places is one screen (docx §6.2), rendered with its home-branch colour as the cross-link hint.
- **One value per ParamID.** Shared IDs (212/215 on Start, MIO, PConnector, Further IO; 173–175, 216–218, 233, 236–237, 801/802/117 on Label and Start/Stop; 238–240 on Tandem and CAN) live once in the store.
- **Shell layout** is a CSS grid on `[data-orientation]`: portrait = status bar top, nav bar bottom; landscape-lh / -rh = bars on left and right edges (mirrored). Upside-down = same layout with `rotate(180deg)` on the root, edge-anchored elements checked.
- **Tailwind v4** with tokens in `@theme` (colour, spacing 4/8/12/16/24/32/48/60, radii, shadows, fonts). Light theme overrides the CSS variables under `[data-theme="light"]`; status colours never the only carrier of meaning (icon + text). A few `@layer components` classes for the recurring gradient-border card and the type scale; everything else utilities. **No CDNs**: Figtree + Fira Code self-hosted (OFL, licence-free), icons as an inline SVG sprite with `currentColor`.
- **Performance budget** (embedded target): no blur/backdrop filters, no large raster images, transitions ≤150 ms opacity/transform only, lists virtualised only if >200 rows (none expected).
- **Figma sync** is an agent-driven step (Claude via the Figma MCP, in batched sessions) at the end of each phase: tokens → Figma variables (dark + light modes), components → component sets with variants per state, screens → frames per layout and theme in pages `HMI / 01 Tokens`, `HMI / 02 Components`, `HMI / 03 Screens – Portrait`, `… – Landscape LH`, `… – Landscape RH`, `HMI / 04 Flows`. Order of priority: portrait dark complete first, then light, then landscape (≈54 screens × 6 variants ≈ 324 frames in total, so batches per area). Playwright screenshots are the visual reference; `html_to_figma` / `use_figma` create the frames. Existing pages (Presentation#1, Icons, Icon rules, Icons v1) are never modified.

## Design tweak loop (both directions, gate after each ticket group)

- **Code is the source of truth during the build; Figma is the designer's surface.** Both are kept equal at every gate.
- **Styleguide screen** (`src/ui/screens/Styleguide.js`, route `#/styleguide`, dev-only): every component in every state, with theme / orientation / language switchers. Built in P1 and extended by every component ticket. This is what you look at in the in-app browser.
- **Review gates** after each ticket group (≈3–6 tickets): shell; start-up + home + login; menus; parameter row + editors; formats; service tests; diagnostics + files; users; help + wizard; light theme; landscape. At a gate I show the screens (in-app browser + screenshot sheet), you tweak in chat and/or in Figma.
- **Tweaks become `DT-nn` entries in `docs/DESIGN-LOG.md`**: source (chat or Figma node), what changed, which token/component, before/after screenshot. Nothing is tweaked ad hoc without an entry, so the §10 spec stays complete.
- **Chat → code**: I edit the token or component, screenshots regenerate, the styleguide shows the result.
- **Figma → code**: at each gate I diff the `HMI /` pages against the last sync (Figma MCP `get_design_context` / variable defs) and port changed tokens and component variants into code, logging each as a `DT`.
- **Code → Figma**: after the gate's tweaks are in, the affected components and screens are regenerated into Figma. Frames I generated are replaced; frames or components a designer hand-edited are updated in place, never duplicated.
- Each phase table below includes its gates as `G<phase>-<n>` rows.

## Phases and tickets

Ticket IDs are stable (`P<phase>-<nn>`); each gets a file in `docs/tickets/` with acceptance criteria quoting the docx. Estimates are relative (S ≤ ½ day, M ≈ 1 day, L ≈ 2–3 days).

### Phase 0 — Foundation and data pipeline (docx §2, §5.1, §9, §10)

| ID | Ticket | Size |
|---|---|---|
| P0-01 | Scaffold repo: Vite, Tailwind v4, ESLint + Prettier, Vitest, Playwright, npm scripts, `.gitignore`, git init | S |
| P0-02 | `scripts/extract-data.mjs`: the **xlsx is the primary source** (SheetJS, dev dep) for parameters/options; the clickdummy `DATA` line is used only for the screen ↔ ParamID mapping and mask specs; output `src/data/*.json` with drawio cell IDs and Excel rows for traceability | M |
| P0-03 | `overrides.json` + `validate-data.mjs`: apply docx v1.6 corrections (Select Format L1 + blocked while running; Create Format not pre-filled; FIFO logs; Secure Code visible at any level; Reporting L3; FW downgrade allowed), fix data quirks (types `?` on 108–110 → ip/string, `#fffff`, Editable normalisation, AND/OR on 273/274, 246's condition pointing at Batch Mode, Info_Time/Date Excel serials, HMI_Logo_Selection Val=502, reserved Sensor_Type options 226–232 flagged `reserved`), fail the build on unknown values | M |
| P0-04 | Icon export is an **agent step via the Figma MCP** (not a Node script): read the 67 `icon/*` components from page `2014:468`, save SVGs normalised to `currentColor` stroke 2 into `src/assets/icons/`, then `scripts/build-sprite.mjs` builds the sprite; fallback to `Novexx/icons/*.svg` by name. Alternative if a Figma personal access token is provided: REST export script | M |
| P0-09 | Confirm the embedded HMI browser engine with PID (Tailwind v4 needs Chromium ≥111 / cascade layers, `color-mix`); record in OPEN-POINTS; if unknown, keep a fallback build target in mind (no decision blocked) | S |
| P0-05 | Tokens: `@theme` from §5.1 + prototype `_tokens.css`; full light palette (prototype's is incomplete); type scale with sizes checked for readability on 800×480 (§1 asks to try larger) | M |
| P0-06 | Self-host fonts, base `index.html`, dev panel skeleton | S |
| P0-07 | Docs skeleton: PLAN, ARCHITECTURE (ADRs), REQUIREMENTS-TRACE, OPEN-POINTS, FIGMA, all ticket files for P1–P5, `CLAUDE.md` | M |
| P0-08 | Figma: create `HMI / 01 Tokens` page with colour/spacing/type variables in dark + light modes | S |
| G0-1 | **Gate**: tokens and type scale reviewed on a token sheet in the browser and in Figma; `DESIGN-LOG.md` started | – |

Exit: `npm run dev` shows an empty shell in all three layouts; `npm test` passes data validation; Figma has tokens.

### Phase 1 — Core engine and shell (docx §3, §4, §5.4 shell parts, §6.3, §8.17)

| ID | Ticket | Size |
|---|---|---|
| P1-01 | Store + persistence + factory reset; **targeted re-render** (subscribe per slice, patch rows/values in place; full screen re-render only on navigation) to respect the embedded graphics budget | M |
| P1-02 | Router with explicit back-stack; `ref` resolution; deep links by screen id | M |
| P1-03 | Condition parser with tests for every operator and nesting case in the data (`;` lowest precedence) | S |
| P1-04 | Access model: levels 0–4, read gating (**unreadable params are not rendered at all**, §4.1), write gating (lock), L4 timed session, "visible from any level" rules; unit tests per level | M |
| P1-05 | i18n: EN + DE resources **keyed by TextResID where the Excel provides one** (§11 text-resource ID ranges), free keys for chrome, fallback, temp language per session, 30 % length audit helper | M |
| P1-06 | Theme + orientation switching bound to params 612/601, incl. 180° variants (CSS `rotate` on the root; note the risk for scroll/hit-testing and record "OS-level rotation?" as an open point) | M |
| P1-07 | Simulator: machine state machine (Offline/Online/Pause/Run/Alarm/Warning) with runtime commands 1–13, counters ticking, encoder values, IO toggling, error injection, auto log-off; **global live-value refresh 1 s** (§8); `seed/machine.json` with machine type (D-Series flag, crypto chip) and installed options (146, 177, 187, 112, 113, Bus card) that gate tiles | L |
| P1-08 | Status bar (Ready/running/paused/warning/alarm/stand-by, option icons, L4 "open until hh:mm") | M |
| P1-09 | Title bar (with/without back, truncation) + Nav bar (back, level badge 0–4, menu; side placement in landscape) | M |
| P1-10 | Toast, Modal host (info/error/confirmation, destructive variant), Sheet host | M |
| P1-10b | Styleguide screen (`#/styleguide`): shell parts and dialogs in all states, theme/orientation/language switchers; every later component ticket adds its section | M |
| G1-1 | **Gate**: shell (status bar, title bar, nav bar, toast, modal) in 3 layouts × 2 themes | – |
| P1-11 | Start-up screen: logo area (608), device name, boot progress against previous durations, "still starting", failed-start text, discreet machine type + FW version line | M |
| P1-12 | Home screen: Level-0 state, machine state, device name, start/pause with confirmation where it moves the machine, 4 quicklinks from 614–617, logo area, error/warning overlay carried from the prototype with **Alarm_Reset (1) and warning acknowledgement** | L |
| P1-13 | Login flow: user profile selection + password keypad; L0 default; log-off | M |
| P1-14 | Dev panel complete; Playwright harness with layout × theme matrix and screenshot naming | M |
| P1-15 | Figma: `02 Components` shell parts (status bar, title bar, nav bar, toast, modal) with variants; `03 Screens` start-up + home in 3 layouts × 2 themes | M |
| P1-16 | Stand-by state: HMI_Standby_Timer (613) dims/locks to a stand-by screen after inactivity, wake on touch, status bar "stand-by" state (prototype has a standby home; clickdummy has none) | M |
| G1-2 | **Gate**: start-up, home (all machine states, L0), login, stand-by; Figma sync of P1-15 happens after this gate's tweaks | – |

Exit: boot → home → login → level badge changes; machine state cycles from the dev panel and the shell reacts; screenshots exist for home in all 6 combinations.

### Phase 2 — Menu and standard parameter screens (docx §5.4, §6.1–6.2, §7)

| ID | Ticket | Size |
|---|---|---|
| P2-01 | MenuScreen: 6 tiles/page, pager (first/middle/last), branch colour code, tile with icon + label + **sub-line**, states default/**pressed**/disabled (option absent per `seed/machine.json`), 2 columns portrait / 3 landscape | M |
| P2-02 | All 16 menu nodes wired from `menu-tree.json`; cross-link hint for linked paths (applicator block, Digital IO, Bus card) | S |
| G2-1 | **Gate**: main menu and all 16 menu screens, paging, branch colours | – |
| P2-03 | ParamRow: value visible, unit, indent ≤2, states default/pressed/locked/read-only/changed-from-default/help-indicator; ParamID small low-contrast; GroupHeader | L |
| P2-04 | ParamListScreen: scroll, conditional rows absent without breaking layout, unreadable rows absent, live State values at the 1 s refresh, shared IDs | M |
| P2-05 | ToggleBar (immediate, no confirm) | S |
| P2-06 | SelectionList sheet: 2–8 options, 26-language case scrollable, long option text, **reserved options hidden** (Sensor_Type 226–232) | M |
| P2-07 | NumericKeypad: min/max/unit/default visible, inline out-of-range message, single confirm, integer vs float keys | M |
| P2-08 | AlphaKeyboard: lower/upper/numeric layouts, unfolds below the field without covering it, umlauts | M |
| P2-09 | Slider: for a defined list of range params (proposal: 122 SpeedFixed, 123 SpeedFeed_Manual, 130 Speed_Modification, 297 Test speed, 613 Standby timer), value never under the finger, stepper arrows, min/max states — list recorded in OPEN-POINTS | M |
| P2-10 | Action / Action Button with pressed state + confirmation when it moves the machine (801/802, 1–7, 800, 803–808) | S |
| P2-11 | Help modal: indicator on row, pop-up over list, 40/600 placeholder texts, scroll beyond | S |
| G2-2 | **Gate**: parameter row + all editors (toggle, list, keypad, keyboard, slider, action, help) on the styleguide and on 3 real list screens | – |
| P2-12 | Favourites: marker on row, Favourites screen under Settings (a view, not a copy), feeds quicklink config in HMI screen | M |
| P2-13 | HMI screen specifics: language (500), time/date pickers (700/701 need a date/time widget — not in the type table; design one), orientation, dark mode, logo selection, quicklinks | M |
| P2-14 | Checklist-only ticket (no new code): walk §7.3 edit behaviour across P2-03/P2-07/P2-11 — invalid entry explained not corrected; changed-from-default marker; locked rows show lock + "needs level n" toast | S |
| P2-15 | Unit tests (parser, validate, access) + Playwright: home → menu → parameter → edit → back for each control; screenshot every list screen in portrait dark, plus 3 representative lists in all 6 combos | M |
| G2-3 | **Gate**: favourites, search, HMI screen, edit-behaviour checklist | – |
| P2-16 | Figma: component sets for tile, pager, row, header, toggle, list, keypad, keyboard, slider, favourite, help; frames for main menu + 3 representative parameter screens (after G2-3 tweaks) | L |

Exit: all 21 list screens and 16 menus navigable with working editors and access gating.

### Phase 3 — Special screens (docx §8.1–8.17)

Each ticket: screen in 3 layouts, empty/loading/error states, confirmation pattern, access faces, seed data, Playwright flow + screenshot. Common pieces first.

| ID | Ticket | Size |
|---|---|---|
| P3-01 | Shared: ListRow, TableRow, ConfirmDialog (normal/destructive), ProgressResult, Placeholder states, end-of-list marker, scroll indication, USB file browser component | L |
| P3-02 | Select Format (L1, blocked while running, loaded marked, confirm names format) | M |
| P3-03 | Modify Format (L2, pre-selected, "n parameters differ", "no differences" state) | M |
| P3-04 | Create New Format (not pre-filled, duplicate handled inline, toast on return) | S |
| G3-1 | **Gate**: shared list/table/dialog/progress/placeholder components + the 3 format screens | – |
| P3-05 | Speed Test (1 s refresh, "no signal", result block, warn before moving) | M |
| P3-06 | IO-Test (modular rows/groups, on/off indicator, L1 and L3 faces, forcing with marking, reset-all, timeout) | L |
| P3-07 | Applicator Test + Test-Mode (buttons 803–808, counters 722–727, L3) | M |
| G3-2 | **Gate**: speed test, IO test (both faces), applicator test, test mode | – |
| P3-08 | Diagnosis Logs (toggle first, duration + space left, FIFO, export to USB, "off, empty" state; L2 view / L3 activate + clear; receives audit entries from logins, parameter changes old→new, state changes, errors, Secure Code open/close) | M |
| P3-09 | Error History (newest first, search from 2 chars with keyboard, row opens full text, FIFO, clear at L3) | M |
| P3-10 | Reporting – service done (counters, comment, auto date/user, commit resets 4 counters, L3) | M |
| P3-11 | Load/Store Backup (browser, no-USB state, naming dialog device+serial+date, Backup vs Format explained, progress/result, warn against pulling drive; L2 create / L3 load, load blocked while running) | L |
| P3-12 | FW-Update (versions side by side, confirm, own progress view without back, success/restart, failure with next steps, invalid-signature state, downgrade allowed) | L |
| P3-13 | User modified Parameters (list of params ≠ default; placeholder in diagram, docx silent → simple list) | S |
| G3-3 | **Gate**: logs, error history, reporting, backup, firmware update, user-modified list | – |
| P3-14 | Create New User (5 fields, masked password with toggle and live policy feedback from 618–627, level limited to grantable, Save gated, duplicate inline, cancel warning) | L |
| P3-15 | User Settings list (618–627; W4 rows shown locked at L3 — what "write level 4" means is an open point, see below) | S |
| P3-16a | User Management, L1/L2 face: own password, temp language with "resets at logout" note, disable own role with logout confirmation | M |
| P3-16b | User Management, L3 face: user list (name, role, last password change), per-user edit (password, level, auto log-off, language, black/white list ID entry), users disabled never deleted, live transition when level changes mid-session | L |
| P3-17 | Secure Code (explanation first, Generate → QR with machine data, Enter → code field, L4 open until hh:mm in screen + status bar, generate confirmed, data-erase flow, device-only marker; writes open/close entries to Diagnosis Logs) | L |
| P3-18 | Country Settings (729, read-only L4) | S |
| G3-4 | **Gate**: create user, user settings, user management (both faces), secure code, country | – |
| P3-19 | Reporting QR (scannable from 30 cm, text, regenerated on data change, configurable URL template in dev data) | S |
| P3-20 | Search (ID + name from 2 chars, numeric mode, results name/path/value filtered by level, empty / no-match / too-many states, back returns to results) | M |
| P3-21 | Setup wizard (auto on first start, re-run from Service, forced L3 password step, 5–20 dummy params over steps, % progress, skip only non-mandatory, summary) | L |
| G3-5 | **Gate**: QR, search, setup wizard | – |
| P3-22a | Figma: component sets for list row, table row, dialogs, progress, placeholders, USB browser (after the G3 gates' tweaks) | M |
| P3-22b | Figma: portrait dark frames for Formats + Service screens (P3-02 … P3-13) | M |
| P3-22c | Figma: portrait dark frames for Users + Help + Wizard screens (P3-14 … P3-21). Light and landscape frames come in P4-09 | M |

Exit: every node in the draw.io tree plus the four docx-only screens is reachable and functional with dummy data.

### Phase 4 — Themes, layouts, languages, states audit, performance (docx §3.2, §5.2, §10.1, §11)

| ID | Ticket | Size |
|---|---|---|
| P4-01a | Light theme pass: shell, start-up, home, menus, parameter lists + editors; contrast check; status meaning never colour-only | M |
| P4-01b | Light theme pass: all special screens (formats, service, users, help, wizard) | M |
| G4-1 | **Gate**: light theme, all screens | – |
| P4-02a | Landscape LH/RH pass: shell, home, menus, parameter lists + editors (keyboards unfold without covering the field at 480 px height) | L |
| P4-02b | Landscape LH/RH pass: all special screens; reduced-content or scroll/jump designs where portrait content does not fit; 180° check of edge-anchored elements | L |
| G4-2 | **Gate**: landscape LH + RH, all screens, incl. 180° | – |
| P4-03 | German pass: all chrome + parameter names; run the 30 % length audit; fix truncation | M |
| P4-04 | Touch target audit ≥60 px primary / ≥48 px rows, in all layouts | S |
| P4-05 | Empty / loading / error states audit for every data-loading screen | M |
| P4-06 | Performance: no heavy effects, bundle size, CPU-throttled Playwright run, animation budget | S |
| P4-07 | Accessibility basics: roles, labels, focus order for the keyboards and dialogs | S |
| P4-08 | Full screenshot matrix regenerated; visual regression baseline committed | S |
| G4-3 | **Gate**: German, touch targets, placeholder states, performance run | – |
| P4-09a | Figma: light-theme portrait frames for all screens | L |
| P4-09b | Figma: landscape LH + RH frames (dark and light) for all screens, batched per area to respect MCP rate limits | L |

### Phase 5 — Spec, prototype, handover (docx §10)

| ID | Ticket | Size |
|---|---|---|
| P5-01 | `HMI / 04 Flows`: clickable prototype home → menu → parameter → edit → back + each special screen | M |
| P5-02 | Spec/redlines: token system doc, component state matrix, per-screen notes "so the frontend can be rebuilt without asking back" | M |
| P5-03 | Acceptance checklist §10.1 walked and recorded in REQUIREMENTS-TRACE | S |
| P5-04 | OPEN-POINTS finalised for PID (wizard params, help texts, QR URL template, diagnosis toggle param, slider list, L4 semantics incl. "write level 4" rows, date/time widget, browser engine, OS-level vs CSS 180° rotation, touch targets to be checked on the demo display, PID's modal dialog styling suggestion) | S |
| P5-05 | README, setup/build docs, GitHub push and CI (lint, unit, e2e) | S |
| G5-1 | **Gate**: final Figma ↔ code reconciliation; every `DT` entry reflected on both sides; prototype flow walked | – |

## Assumptions recorded in OPEN-POINTS (proceed unless PID says otherwise)

- Login = pick a user profile from a list, then password on the numeric/alpha keypad; auto log-off per user; L0 after start.
- Slider applies to the five params listed in P2-09; the Excel marks none.
- Diagnosis activation toggle gets a dummy param ID 900; Secure Code params 901–905; QR URL template 906.
- Date/time (700/701) get a dedicated picker sheet (not in §7.2's table).
- Rewinder stays a placeholder (D-Series, crypto-chip gated); Bus & Network card placeholder with dynamic name.
- Icons v1 geometry overrides the docx's 24 px proposals; names are identical. Since DT-01 the app uses the 24 px / 1.5 px derivative (`Icons v1 – 24 px`).
- Dummy persistence via localStorage; factory reset from the dev panel.
- "Write level 4" rows (619–627) are shown locked at L3; whether an L4 session may edit them is for PID to confirm (docx defines L4 as reset / create-admin only).
- Touch targets are checked in-browser at 1:1 pixel size; the demo-display check (§10.1) needs PID hardware.
- 180° orientations use CSS rotation of the root; if the OS rotates the framebuffer instead, that layer is dropped.

## Verification

- `npm run data:sync && npm run validate` rebuilds JSON from the sources and fails on unknown values.
- `npm test` (Vitest): parser, access, validation, store, router, simulator transitions.
- `npm run test:e2e` (Playwright): flows per phase; screenshot matrix (3 layouts × 2 themes, EN + DE for text-heavy screens); CPU-throttled run for the performance budget.
- Manual: open `npm run dev` in the in-app browser at 480×800 and 800×480, walk the draw.io tree with the dev panel at each level, compare against the docx acceptance criteria per screen (REQUIREMENTS-TRACE).
- Figma: after each phase's sync, screenshot the new page via the Figma MCP and compare with the Playwright screenshot of the same screen.
