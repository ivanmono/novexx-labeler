# Tickets

One file per ticket (`<ID>.md`) and per review gate (`G<phase>-<n>.md`). IDs are stable. Sizes: S <= half a day, M about a day, L two to three days. Status values: todo, in progress, done, blocked.

Requirement trace: [../REQUIREMENTS-TRACE.md](../REQUIREMENTS-TRACE.md). Open points: [../OPEN-POINTS.md](../OPEN-POINTS.md). Design tweaks: [../DESIGN-LOG.md](../DESIGN-LOG.md).

## Phase 0 - Foundation and data pipeline

| ID | Title | Size | Status |
|---|---|---|---|
| [P0-01](P0-01.md) | Scaffold repo: Vite, Tailwind v4, lint, Vitest, Playwright | S | done |
| [G0-1](G0-1.md) | **Gate: tokens and type scale** | - | todo |
| [P0-02](P0-02.md) | extract-data.mjs: xlsx primary, clickdummy for tree and masks | M | done |
| [P0-03](P0-03.md) | overrides.json + validate-data.mjs | M | done |
| [P0-04](P0-04.md) | Export Icons v1 from Figma and build the sprite | M | done |
| [P0-05](P0-05.md) | Design tokens: @theme, dark + light, type scale | M | done |
| [P0-06](P0-06.md) | Self-host fonts, base index.html, dev panel skeleton | S | done |
| [P0-07](P0-07.md) | Docs skeleton: PLAN, ARCHITECTURE, trace, open points, tickets, CLAUDE.md | M | done |
| [P0-08](P0-08.md) | Figma: HMI / 01 Tokens page with variables | S | done |
| [P0-09](P0-09.md) | Confirm the embedded browser engine | S | todo |

## Phase 1 - Core engine and shell

| ID | Title | Size | Status |
|---|---|---|---|
| [P1-01](P1-01.md) | Store, persistence, factory reset, targeted re-render | M | done |
| [G1-1](G1-1.md) | **Gate: shell** | - | todo |
| [P1-02](P1-02.md) | Router with explicit back-stack and ref resolution | M | done |
| [G1-2](G1-2.md) | **Gate: start-up, home, login, stand-by** | - | todo |
| [P1-03](P1-03.md) | Condition parser with full operator coverage | S | done |
| [P1-04](P1-04.md) | Access model: levels 0-4, read hides, write locks, L4 session | M | done |
| [P1-05](P1-05.md) | i18n: EN + DE, TextResID keys, temp language, length audit | M | done |
| [P1-06](P1-06.md) | Theme and orientation bound to params 612 and 601 | M | done |
| [P1-07](P1-07.md) | Machine simulator and seed data | L | done |
| [P1-08](P1-08.md) | Status bar | M | done |
| [P1-09](P1-09.md) | Title bar and navigation bar | M | done |
| [P1-10](P1-10.md) | Toast, modal host, sheet host | M | done |
| [P1-10b](P1-10b.md) | Styleguide screen | M | done |
| [P1-11](P1-11.md) | Start-up screen | M | done |
| [P1-12](P1-12.md) | Home screen | L | done |
| [P1-13](P1-13.md) | Login flow | M | done |
| [P1-14](P1-14.md) | Dev panel complete and Playwright harness | M | done |
| [P1-15](P1-15.md) | Figma: shell components and first screens | M | todo |
| [P1-16](P1-16.md) | Stand-by state and wake | M | done |

## Phase 2 - Menu and standard parameter screens

| ID | Title | Size | Status |
|---|---|---|---|
| [P2-01](P2-01.md) | MenuScreen with tiles and paging | M | todo |
| [G2-1](G2-1.md) | **Gate: menus** | - | todo |
| [P2-02](P2-02.md) | Wire all 16 menu nodes and cross-link hints | S | todo |
| [G2-2](G2-2.md) | **Gate: parameter row and editors** | - | todo |
| [P2-03](P2-03.md) | ParamRow and GroupHeader | L | todo |
| [G2-3](G2-3.md) | **Gate: favourites, search, HMI screen, edit checklist** | - | todo |
| [P2-04](P2-04.md) | ParamListScreen | M | todo |
| [P2-05](P2-05.md) | ToggleBar | S | todo |
| [P2-06](P2-06.md) | SelectionList sheet | M | todo |
| [P2-07](P2-07.md) | NumericKeypad | M | todo |
| [P2-08](P2-08.md) | AlphaKeyboard | M | todo |
| [P2-09](P2-09.md) | Slider | M | todo |
| [P2-10](P2-10.md) | Action buttons with confirmation | S | todo |
| [P2-11](P2-11.md) | Help modal | S | todo |
| [P2-12](P2-12.md) | Favourites | M | todo |
| [P2-13](P2-13.md) | HMI screen specifics | M | todo |
| [P2-14](P2-14.md) | Edit-behaviour checklist (§7.3) | S | todo |
| [P2-15](P2-15.md) | Phase 2 tests | M | todo |
| [P2-16](P2-16.md) | Figma: parameter components and screens | L | todo |

## Phase 3 - Special screens

| ID | Title | Size | Status |
|---|---|---|---|
| [P3-01](P3-01.md) | Shared list, table, dialog, progress, placeholder, USB browser | L | todo |
| [G3-1](G3-1.md) | **Gate: shared components and formats** | - | todo |
| [P3-02](P3-02.md) | Select Format | M | todo |
| [G3-2](G3-2.md) | **Gate: service tests** | - | todo |
| [P3-03](P3-03.md) | Modify Format | M | todo |
| [G3-3](G3-3.md) | **Gate: diagnostics and files** | - | todo |
| [P3-04](P3-04.md) | Create New Format | S | todo |
| [G3-4](G3-4.md) | **Gate: users** | - | todo |
| [P3-05](P3-05.md) | Speed Test | M | todo |
| [G3-5](G3-5.md) | **Gate: help and wizard** | - | todo |
| [P3-06](P3-06.md) | IO-Test | L | todo |
| [P3-07](P3-07.md) | Applicator Test and Test-Mode | M | todo |
| [P3-08](P3-08.md) | Diagnosis Logs | M | todo |
| [P3-09](P3-09.md) | Error History | M | todo |
| [P3-10](P3-10.md) | Reporting (service done) | M | todo |
| [P3-11](P3-11.md) | Load/Store Backup (USB) | L | todo |
| [P3-12](P3-12.md) | FW-Update | L | todo |
| [P3-13](P3-13.md) | User modified Parameters | S | todo |
| [P3-14](P3-14.md) | Create New User | L | todo |
| [P3-15](P3-15.md) | User Settings list | S | todo |
| [P3-16a](P3-16a.md) | User Management, L1/L2 face | M | todo |
| [P3-16b](P3-16b.md) | User Management, L3 face | L | todo |
| [P3-17](P3-17.md) | Secure Code | L | todo |
| [P3-18](P3-18.md) | Country Settings | S | todo |
| [P3-19](P3-19.md) | Reporting QR | S | todo |
| [P3-20](P3-20.md) | Search | M | todo |
| [P3-21](P3-21.md) | Setup wizard | L | todo |
| [P3-22a](P3-22a.md) | Figma: special-screen components | M | todo |
| [P3-22b](P3-22b.md) | Figma: Formats and Service frames (portrait dark) | M | todo |
| [P3-22c](P3-22c.md) | Figma: Users, Help, Wizard frames (portrait dark) | M | todo |

## Phase 4 - Themes, layouts, languages, audits

| ID | Title | Size | Status |
|---|---|---|---|
| [P4-01a](P4-01a.md) | Light theme pass: shell, home, menus, parameter screens | M | todo |
| [P4-01b](P4-01b.md) | Light theme pass: special screens | M | todo |
| [G4-1](G4-1.md) | **Gate: light theme** | - | todo |
| [P4-02a](P4-02a.md) | Landscape pass: shell, home, menus, parameter screens | L | todo |
| [P4-02b](P4-02b.md) | Landscape pass: special screens and 180-degree check | L | todo |
| [G4-2](G4-2.md) | **Gate: landscape** | - | todo |
| [P4-03](P4-03.md) | German pass and 30 % length audit | M | todo |
| [G4-3](G4-3.md) | **Gate: German, touch targets, states, performance** | - | todo |
| [P4-04](P4-04.md) | Touch target audit | S | todo |
| [P4-05](P4-05.md) | Empty, loading, error states audit | M | todo |
| [P4-06](P4-06.md) | Performance budget | S | todo |
| [P4-07](P4-07.md) | Accessibility basics | S | todo |
| [P4-08](P4-08.md) | Screenshot matrix baseline | S | todo |
| [P4-09a](P4-09a.md) | Figma: light-theme portrait frames | L | todo |
| [P4-09b](P4-09b.md) | Figma: landscape frames dark and light | L | todo |

## Phase 5 - Spec, prototype, handover

| ID | Title | Size | Status |
|---|---|---|---|
| [P5-01](P5-01.md) | Figma flows: clickable prototype | M | todo |
| [G5-1](G5-1.md) | **Gate: final reconciliation** | - | todo |
| [P5-02](P5-02.md) | Spec and redlines | M | todo |
| [P5-03](P5-03.md) | Acceptance checklist §10.1 | S | todo |
| [P5-04](P5-04.md) | Open points finalised for PID | S | todo |
| [P5-05](P5-05.md) | README, docs, GitHub, CI | S | todo |
