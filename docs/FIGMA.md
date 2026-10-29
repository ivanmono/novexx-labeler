# Figma

File: **Novexx Presentations** (key `kNEZtQrnGyteWqDZIi0JAf`)
https://www.figma.com/design/kNEZtQrnGyteWqDZIi0JAf/Novexx-Presentations

## Pages

| Page | Owner | Content |
|---|---|---|
| Presentation#1, Icons, Icon rules, Icons v1 | Mono design | Existing. **Never modified by the sync.** Icons v1 (node `2014:468`) is the source of the 67 `icon/<name>` components exported to `src/assets/icons`. |
| HMI / 01 Tokens | generated | Variable collections `HMI Colour` (modes Dark, Light), `HMI Type`, `HMI Space`, `HMI Radius`; a token sheet frame mirroring `#/styleguide`. |
| HMI / 02 Components | generated | One component set per `src/ui/components` module, variants per state (docx §5.4). |
| HMI / 03 Screens – Portrait | generated | 480×800 frames, dark and light, one per screen. |
| HMI / 03 Screens – Landscape LH | generated | 800×480 frames. |
| HMI / 03 Screens – Landscape RH | generated | 800×480 frames. |
| HMI / 04 Flows | generated | Prototype wiring home → menu → parameter → edit → back plus special screens. |

Frame naming: `<screen-id> / <theme> / <orientation> / <state>` e.g. `home / dark / portrait / running-L0`.
Variable naming mirrors `src/styles/tokens.css` semantic names: `colour/bg`, `colour/surface`, `colour/status/run`, `colour/level/3`, `colour/branch/settings` …

## Sync (agent-driven, at each gate)

1. Code → Figma: Playwright screenshots are the visual reference; `use_figma` creates or updates variables, component sets and frames. Frames generated earlier are replaced in place (matched by name); hand-edited nodes carry the plugin-data flag `hmi.handEdited=true` and are updated field by field, never recreated.
2. Figma → code: `get_variable_defs` + `get_design_context` on `HMI /` pages are diffed against the last sync; token or variant changes are ported to `tokens.css` / the component module and logged as `DT-nn` in `docs/DESIGN-LOG.md`.
3. Priority order: portrait dark complete first, then light, then landscape. Roughly 54 screens × 6 variants ≈ 324 frames, created in batches per area to respect MCP rate limits.

## Icon export

Agent step (plan P0-04): `download_assets(nodeId, svg)` for each `icon/*` component on Icons v1, saved to `src/assets/icons/<name>.svg`, then `npm run icons:sprite` normalises (background rects removed, stroke → `currentColor`, 2 px, round caps/joins) and builds `sprite.svg`. Re-run when Mono adds or changes icons.

## Write access note (2026-10-29)

The official Figma MCP (`use_figma`) returns "read-only mode" for this file, while reads and `download_assets` work. Writes go through the **Figma Console MCP Desktop Bridge** (plugin running inside Figma Desktop with the user's own edit rights): `figma_execute` with plain Plugin API code. Differences to remember: `createText()` starts in Inter, so set `fontName` before `characters`; `textStyleId` must be set with `setTextStyleIdAsync`; the helper APIs `createAutoLayout`, `node.query`, `node.set` do not exist there.
