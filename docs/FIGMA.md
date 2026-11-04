# Figma

File: **Novexx Presentations** (key `kNEZtQrnGyteWqDZIi0JAf`)
https://www.figma.com/design/kNEZtQrnGyteWqDZIi0JAf/Novexx-Presentations

## Pages

| Page                                        | Owner                  | Content                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentation#1, Icons, Icon rules, Icons v1 | Mono design            | Existing. **Never modified by the sync.** Icons v1 (node `2014:468`) is the source of the 67 `icon/<name>` components exported to `src/assets/icons`.                                                                                                                                                    |
| Icons v1 – 24 px                            | generated (2026-10-30) | Mono's 67 icons cloned at 24×24 with a 1.5 px stroke, components `icon/24/<name>`, one grid frame. Scaled copies of Icons v1 (caps/joins as in the source); regenerate rather than hand-edit when Icons v1 changes. **Source of the app sprite and of the icon instances in the screen frames** (DT-01). |
| HMI / 01 Tokens                             | generated              | Variable collections `HMI Colour` (modes Dark, Light), `HMI Type`, `HMI Space`, `HMI Radius`; a token sheet frame mirroring `#/styleguide`.                                                                                                                                                              |
| HMI / 02 Components                         | generated              | One component set per `data-cmp` component, one variant per state (docx §5.4), auto layout, tokens bound. StatusBar (State × 8), NavBar (Level 0–4 × Line run/standby/warning/error), QuicklinkCard (filled, empty) so far; the screen frames place instances of them.                                   |
| HMI / 03 Screens – Portrait                 | generated              | 480×800 frames, dark and light, one per screen.                                                                                                                                                                                                                                                          |
| HMI / 03 Screens – Landscape LH             | generated              | 800×480 frames.                                                                                                                                                                                                                                                                                          |
| HMI / 03 Screens – Landscape RH             | generated              | 800×480 frames.                                                                                                                                                                                                                                                                                          |
| HMI / 04 Flows                              | generated              | Prototype wiring home → menu → parameter → edit → back plus special screens.                                                                                                                                                                                                                             |

Frame naming: `<screen-id> / <theme> / <orientation> / <state>` e.g. `home / dark / portrait / running-L0`.
Variable naming mirrors `src/styles/tokens.css` semantic names: `colour/bg`, `colour/surface`, `colour/status/run`, `colour/level/3`, `colour/branch/settings` …

## Sync (agent-driven, at each gate)

Code → Figma runs through three small scripts in `scripts/figma/` plus the Desktop Bridge:

| Step         | Tool                                                | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Serialize | `serialize-dom.js` (runs in the page)               | Walks the rendered `.hmi` shell and emits a JSON layer tree: a frame for every element that paints or clips (background, gradient, border, shadow, overflow), text layers with the computed Figtree / Fira Code font, sprite icons as `icon/<name>` references with colour and rotation, `::before/::after` boxes that paint.                                                                                                                                                                                                                                                                                     |
| 2. Capture   | `npm run figma:capture` (`capture.mjs`, Playwright) | Drives the app through `window.__hmi` into each state listed in the script, injects the serializer and writes `test-results/figma/<name>.json` + a reference PNG per state. Frame names follow `<screen> / <theme> / <orientation> / <state>`.                                                                                                                                                                                                                                                                                                                                                                    |
| 3. Build     | `build-frames.js` via `figma_execute`               | Plain Plugin API code that recreates a capture on a page: gradients → `GRADIENT_LINEAR/RADIAL` with a computed transform, `color(srgb …)` / `oklab()` (Tailwind colour-mix output) → sRGB, box-shadow → drop shadows, per-side borders → thin rectangles, icons → recoloured **instances of the `Icons v1 – 24 px` components** (so the designer edits one icon, not 300 vectors). The builder source is stored once in the file's plugin data (`hmi.builder`, `npm run figma:payload -- --store`) and each frame call is only the compact JSON (`npm run figma:payload -- --frames <dir> "<page>" <file.json>`). |

Rules the builder follows:

- Frames with the same name are replaced in place (position kept). A frame with plugin data `hmi.handEdited=true` is skipped and reported, never overwritten.
- Text is truncated with an ellipsis only where the browser itself cut it (text wider than its box). Figma's Figtree metrics run a few percent wider than Chromium's, so shrink-wrapped labels keep their natural width and their clip box is opened instead.
- Fonts: Figtree and Fira Code (both available in Figma); weight → style name; falls back to Inter only if a style is missing.
- **Tokens are bound, not copied** (P1-17). The serializer names the token behind every value and the builder binds it:
  solid fills, strokes, text colour and icon strokes → `colour/*` variables (an opacity modifier such as
  `bg-status-error/15` or a `color-mix(… NN%, transparent)` in component CSS becomes paint opacity on the bound
  colour); uniform corner radii → `radius/*`; text → the `HMI/*` text style when family, weight, size, line height
  and tracking match exactly, else `type/size/*` + `type/family/*` variables with the weight left free. The root frame
  gets its theme as the explicit `HMI Colour` mode, so flipping the mode on a frame switches the whole screen.
  Token source of truth is the Tailwind utility on the element (`bg-surface`, `text-level-3`); the fallback is the
  computed value matched against the probed `--hmi-*` variables of the current theme, first match in a fixed
  priority order (bg, surface, surface-2, line, …, status, status-ink, level, branch). Literal `text-black` /
  `text-white` and the brand wordmark (23 px) stay raw on purpose. Not bound: shadows, spacing.
- Name mapping `tokens.css` ↔ Figma: `--hmi-<name>` ↔ `colour/<name>`, except `--hmi-status-X-ink` ↔
  `colour/status-ink/X`, `--hmi-keyboard-key[-pressed]` ↔ `colour/key[-pressed]`; Tailwind `text-muted` /
  `text-faint` are `colour/text-muted` / `colour/text-faint`. Radii `--radius-*` ↔ `radius/*`, type sizes
  `--text-*` ↔ `type/size/*`.
- **Gradients** are bound per stop. Every stop of `--hmi-gradient-*` is a token of its own in `tokens.css`
  (`--hmi-gradient-stroke-0 … -2`, `-stroke-strong-0 … -2`, `-surface-0/1`, `-page-0/1`, `-run-mid`, `-standby-mid`,
  `-error-mid`, `-warning-mid`) ↔ `colour/gradient/<family>/<stop>` in HMI Colour with Dark and Light values. The
  serializer matches a gradient layer only when all its opaque stops belong to one family in order, so a grey that two
  families share never cross-binds; `transparent` stops stay unbound.

Text set with `writing-mode: vertical-rl` (the landscape status label) is emitted with `vertical: up|down` and the builder rotates the layer ±90° into the captured box.

Not carried over (yet): CSS transforms other than `rotate`, inset shadows, `::placeholder`, mix-blend modes. SVGs that are not sprite icons (the logo mark) are inlined as vectors with `var(--token)` colours resolved to the computed value.

### Components (page `HMI / 02 Components`)

Components are generated from the same markup as the screens, so a screen frame and its component set never drift:

- A render function marks its root with `data-cmp="<Set>" data-cmp-props="Prop=value,…"` (StatusBar, NavBar,
  QuicklinkCard, TitleBar, Toast, Modal, Sheet, StartButton, StatePill, ProfileRow, ListRow, Button, Key, NumpadKey,
  ProgressBar). A part inside a component that a screen resizes carries `data-cmp-part="<name>"` (the filled bar of
  the progress bar): it becomes a named layer and its captured size is applied to the instance. The dev route `#/components` (`src/ui/screens/Components.js`) renders every variant once;
  `npm run figma:capture -- --components` serializes that sheet to `components.json` and
  `npm run figma:payload -- --components <dir> "HMI / 02 Components" [Set] [Prop=value]` builds the sets (the filters
  keep one `figma_execute` call small). Variant names are `Prop=value, Prop=value`; an existing variant is refilled
  in place (same node id, so instances follow), a new one joins the set.
- Component captures are "full": every element becomes a frame and flex / grid containers become **auto layout**
  with the CSS gap, padding, justify and align. A plain block becomes a column too: with one child (centred in the
  box, as a button label, → justify centre) or with block children stacked at one constant gap (the `mt-3` between
  the two paragraphs of a destructive dialog). A negative margin on the first / last child (`-ml-2` on the title-bar
  back button, `-mr-2` on the sheet close) shrinks the padding to where the child starts, since auto layout has no
  margins; a zero-height spacer (`<span class="w-2">`) stays as an 8 × 0 frame so it keeps its place in the row. A frame **hugs** an axis when the element
  has no `w-`/`h-`/`size-` class (for a component root: on the sheet wrapper) and is not stretched or grown by its
  parent; `min-h-*` becomes a min height. Absolute children stay absolute. Text with `line-clamp-n` (or a
  `truncate` line inside a component) gets a fixed width, auto height, `maxLines = n` and an ending ellipsis, so an
  override wraps and truncates like the browser (a two-line quicklink title grows the card from 116 to 118 px, as in the
  app).
- Screen captures stop at a `data-cmp` root and emit an **instance**: variant by props, then overrides in DOM order
  (texts and their colours — a level-coloured value in a plain list row keeps its `colour/level/n` binding; icon
  instances swapped to `icon/24/<name>` and recoloured; layer opacities by name; sizes of named parts). The instance is sized
  like the browser box except on axes the component hugs. Everything inside a `data-cmp` root is the component's
  own content, except a **slot**: an element marked `data-cmp-slot="<name>"` (the Modal and Sheet bodies) holds
  what the screen puts there — an editor, a help text — so the serializer leaves it out of the instance and
  captures it separately (`slots: [{ name, node }]`). The builder sizes the instance to the captured box, hides
  the placeholder's own children and fixes its height to the slot's (a hugging placeholder would collapse and
  pull the footer up), then builds the slot content as a sibling named `<Set> / slot <name>` on top of the
  instance. So a sheet with a selection list is one Sheet instance plus OptionRow instances, and the main
  component stays generic.
- The builder finds a component only as a variant inside a **component set named after the `data-cmp` value**
  (`QuicklinkCard` → `State=filled`). Variants pulled out of their set (loose `QuicklinkCard/filled` components)
  are not found and the frame build stops with an error; recombine them (Figma: select both → Combine as variants,
  rename the set) rather than rebuilding.
- Bridge quirks that cost an afternoon: a sequential `await` loop over `loadFontAsync` / `getMainComponentAsync` /
  `exportAsync` never returns — collect the promises and `Promise.all` them; `fetch` is blocked in the plugin
  sandbox, so the builder source and every payload go through the `figma_execute` argument; set
  `layoutPositioning = 'ABSOLUTE'` before `x`/`y`, and `textTruncation` before `maxLines` (each resets the other).
  A builder change is applied to the stored copy with the same string replace on both sides and verified with a
  checksum, or re-stored whole.

Figma → code: `get_variable_defs` + `get_design_context` on `HMI /` pages are diffed against the last sync; token or variant changes are ported to `tokens.css` / the component module and logged as `DT-nn` in `docs/DESIGN-LOG.md`.

Priority order: portrait dark complete first, then light, then landscape. Roughly 54 screens × 6 variants ≈ 324 frames, created in batches per area.

### Synced so far (2026-10-30)

`HMI / 03 Screens – Portrait`: home (ready-L0, running-L1, alarm-L1, alarm-overlay-L1) and login (profiles, password-numpad, password-keyboard, password-wrong) in dark; home ready-L0 and login profiles in light; all rebuilt with bound tokens on 2026-10-30 (P1-17) and again after the G1-2 tweaks DT-03 … DT-06 (48 px status bar, compact header, 116 px quicklink cards, badge on the nav line). The designer's frame `home / dark / portrait / ready-L0 - tweak` stays on the page as the reference for that review. Added the same day for the rest of G1-2: start-up (booting, still-starting, failed; booting also in light), user (L1) and stand-by (dimmed). Non-sprite inline SVGs such as the logo mark are now carried over as vectors with `var(--token)` colours resolved. `HMI / 02 Components` (2026-10-30, P1-15): StatusBar, NavBar and QuicklinkCard component sets with auto layout and bound tokens; the home, login, user and stand-by frames were rebuilt with instances of them (start-up has no shell components). 2026-11-02: TitleBar (Back × Subtitle, plus one branch-marked variant per main-menu branch), Toast (ok, reject), Modal (info, error, confirm, confirm destructive, help) and Sheet sets added; the login and user frames rebuilt with TitleBar instances. Toast, Modal and Sheet have no screen frame yet (no captured state shows them). Same day: StartButton (Machine × Locked), StatePill (State × 8), ProfileRow (Level × Enabled), ListRow (Divider), Button (Tone × Icon), Key (Kind × Content), NumpadKey (Kind × Content) and ProgressBar (Tone, bar width as a size override) — 14 sets, 86 variants — and all 16 portrait frames rebuilt so that every shell part, card, key, row and button on them is an instance. Not components: the logo mark (an inline SVG placeholder for the customer's logo, three sizes) and the generic card wrapper (its content differs per screen; a slot approach comes with P2-16). A frame with ~40 instances takes two to three minutes to build through the bridge, so frames go one or two per `figma_execute` call.

2026-11-02 (P2-16): GroupHeader (State), OptionRow (Selected), Pager (Position × 3), MenuTile (State × Link, 4),
Slider (State × 3) and ParamRow (State default · locked · readonly · action × Indent 0–2 × Changed, plus
Indent=0 Help=no — 25 variants) added: 21 sets, 124 variants in all. Portrait dark frames: menu root-L1,
options-L3 (disabled option tiles), digitalio-L3 (linked tiles with the cross-link sub-line); list speed-L2,
hmi-L3, usersettings-L3 (group header, locked W4 rows); editor select (Sheet slot with OptionRow instances),
numeric-error (Sheet slot with the field, the inline range message and 16 NumpadKey instances), slider (Sheet
slot with a Slider instance) and help (Modal Kind=help with the help text and a Button instance in its slot).
The slider thumb is a CSS pseudo-element and is not captured; the track and the fill are. A list frame with
13 rows (~40 instances) runs past the 300 s bridge timeout but finishes in Figma — check `hmi.generated` and
the instance count instead of retrying.

2026-11-02 (P2-13): DateTimePicker (Kind time · date × State default · error, 3 variants, node `2073:12576`):
22 sets, 127 variants. The builder has no `align-self` and no margins, so the `:` / `.` separators carry
their offset to the value line as top padding (`pt-[90px]`) in the markup.

2026-11-04 (presentation pass, 12 screens × portrait / landscape LH / landscape RH): `npm run figma:capture -- --presentation`
(`node scripts/figma/capture.mjs test-results/presentation --presentation`) captures exactly those 36 states. StatusBar
and NavBar got an `Orientation` property (portrait · landscape-lh · landscape-rh): the existing variants were renamed
in place to `…, Orientation=portrait` (same node ids, instances unchanged), and the landscape rails were added only
for the combinations the 12 screens use (StatusBar ready · alarm, NavBar L0–L3 on the run line and L1 on the error
line); the rest follow with P4-09b. The components sheet renders the rails inside a wrapper carrying its own
`data-orientation`, so the landscape CSS applies there without rotating the page. The RH rails and RH frames differ
from LH only in the bar sides, the sheet side and the "Landscape LH/RH" value text, so the RH NavBar variants and RH
frames were derived from LH in Figma (clone, swap the rail instances, mirror the sheet); a later builder run with
RH captures refills them by name. Frames: 12 on `HMI / 03 Screens – Landscape LH`, 12 on `… – Landscape RH`, and on
the portrait page the four new or changed ones (editor language, numeric-error, text, date-error). In those frames
only what is visible inside 800 × 480 / 480 × 800 was built (rows behind or below a sheet are left out), and the
keyboard / keypad keys of the portrait text and numeric frames were cloned from the finished LH frames and resized
to the captured boxes — building 38 keys through the builder took ~40 min, cloning takes seconds.

Builder changes the same day (len 31635, checksum 3135273424):
- **Reflow:** an instance whose captured width differs from its master (the 480 px Sheet / Slider / TitleBar in a
  384 / 640 px landscape box) gets FIXED width and the layers that spanned the master's full inner width set to
  FILL, collected at master size before any resize.
- **Opacity:** the instance's own opacity is applied (a disabled Set button, a dimmed start button); layer opacity
  overrides by name are skipped when a layer of that name already has the value (several `action/step` layers).
- **Borders:** per-side border rectangles get constraints that stretch along their edge, so a wider instance keeps a
  full-width divider; the masters on `HMI / 02 Components` were patched the same way.
- **Vertical text** (see Rules above).
New variant: Button `Tone=primary, Icon=yes` (the picker's Set). Totals: 22 sets / 142 variants.

Lessons: plugin code yields at every `await`, so a second `figma_execute` runs *interleaved* with a build that has
outlived its 300 s bridge timeout — check `hmi.generated` and child counts, never send a test build alongside. A
missing variant makes a timed-out build die silently half-way (no console error): check every `set / props` of the
captures against the file first. `npx playwright test` empties `test-results/`, so captures meant for a long sync
go to a directory outside it. Repeated sub-objects make up most of a payload: hoisting them into constants
(`node scripts/figma/minify.mjs <payload.js>`, ~55 % smaller) and generating rows and keys in a loop keeps a frame call under 15 kB.

## Icon export

Agent step (plan P0-04, re-done for DT-01 on 2026-10-30): export every `icon/24/*` component on `Icons v1 – 24 px` as SVG and save it to `src/assets/icons/<name>.svg`, then `npm run icons:sprite` normalises (background rects removed, stroke → `currentColor`, stroke width kept at 1.5, caps/joins as exported) and builds `sprite.svg` with `viewBox="0 0 24 24"`. Re-run when Mono adds or changes icons: regenerate the 24 px page from Icons v1 first.

Export through the Desktop Bridge: `exportAsync({ format: 'SVG', svgSimplifyStroke: true })` on all components **in one `Promise.all`** (a sequential `await` loop over more than two exports never returns), then write the saved tool result to the icon files with a Node one-liner. The Icons v1 (48 px, 2 px) files are no longer in the repo; the 24 px set renders at 18–64 px in the app, so a 24 px icon shows a 1.5 px line and a 48 px one a 3 px line (previously 1 px and 2 px).

## Write access note (2026-10-29)

The official Figma MCP (`use_figma`) returns "read-only mode" for this file, while reads and `download_assets` work. Writes go through the **Figma Console MCP Desktop Bridge** (plugin running inside Figma Desktop with the user's own edit rights): `figma_execute` with plain Plugin API code. Differences to remember: `createText()` starts in Inter, so set `fontName` before `characters`; `textStyleId` must be set with `setTextStyleIdAsync`; the helper APIs `createAutoLayout`, `node.query`, `node.set` do not exist there.
