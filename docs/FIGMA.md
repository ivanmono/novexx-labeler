# Figma

File: **Novexx Presentations** (key `kNEZtQrnGyteWqDZIi0JAf`)
https://www.figma.com/design/kNEZtQrnGyteWqDZIi0JAf/Novexx-Presentations

## Pages

| Page                                        | Owner                  | Content                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentation#1, Icons, Icon rules, Icons v1 | Mono design            | Existing. **Never modified by the sync.** Icons v1 (node `2014:468`) is the source of the 67 `icon/<name>` components exported to `src/assets/icons`.                                                                                                                                                    |
| Icons v1 – 24 px                            | generated (2026-10-30) | Mono's 67 icons cloned at 24×24 with a 1.5 px stroke, components `icon/24/<name>`, one grid frame. Scaled copies of Icons v1 (caps/joins as in the source); regenerate rather than hand-edit when Icons v1 changes. **Source of the app sprite and of the icon instances in the screen frames** (DT-01). |
| HMI / 01 Tokens                             | generated              | Variable collections `HMI Colour` (modes Dark, Light), `HMI Type`, `HMI Space`, `HMI Radius`; a token sheet frame mirroring `#/styleguide`.                                                                                                                                                              |
| HMI / 02 Components                         | generated              | One component set per `src/ui/components` module, variants per state (docx §5.4).                                                                                                                                                                                                                        |
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

Not carried over (yet): CSS transforms other than `rotate`, inset shadows, `::placeholder`, mix-blend modes, SVGs that are not sprite icons (these are inlined as vectors instead).

Figma → code: `get_variable_defs` + `get_design_context` on `HMI /` pages are diffed against the last sync; token or variant changes are ported to `tokens.css` / the component module and logged as `DT-nn` in `docs/DESIGN-LOG.md`.

Priority order: portrait dark complete first, then light, then landscape. Roughly 54 screens × 6 variants ≈ 324 frames, created in batches per area.

### Synced so far (2026-10-30)

`HMI / 03 Screens – Portrait`: home (ready-L0, running-L1, alarm-L1, alarm-overlay-L1) and login (profiles, password-numpad, password-keyboard, password-wrong) in dark; home ready-L0 and login profiles in light; all rebuilt with bound tokens on 2026-10-30 (P1-17). Shell components (`02 Components`), start-up, user and stand-by frames follow with P1-15.

## Icon export

Agent step (plan P0-04, re-done for DT-01 on 2026-10-30): export every `icon/24/*` component on `Icons v1 – 24 px` as SVG and save it to `src/assets/icons/<name>.svg`, then `npm run icons:sprite` normalises (background rects removed, stroke → `currentColor`, stroke width kept at 1.5, caps/joins as exported) and builds `sprite.svg` with `viewBox="0 0 24 24"`. Re-run when Mono adds or changes icons: regenerate the 24 px page from Icons v1 first.

Export through the Desktop Bridge: `exportAsync({ format: 'SVG', svgSimplifyStroke: true })` on all components **in one `Promise.all`** (a sequential `await` loop over more than two exports never returns), then write the saved tool result to the icon files with a Node one-liner. The Icons v1 (48 px, 2 px) files are no longer in the repo; the 24 px set renders at 18–64 px in the app, so a 24 px icon shows a 1.5 px line and a 48 px one a 3 px line (previously 1 px and 2 px).

## Write access note (2026-10-29)

The official Figma MCP (`use_figma`) returns "read-only mode" for this file, while reads and `download_assets` work. Writes go through the **Figma Console MCP Desktop Bridge** (plugin running inside Figma Desktop with the user's own edit rights): `figma_execute` with plain Plugin API code. Differences to remember: `createText()` starts in Inter, so set `fontName` before `characters`; `textStyleId` must be set with `setTextStyleIdAsync`; the helper APIs `createAutoLayout`, `node.query`, `node.set` do not exist there.
