# Requirements trace

Binding document: `docs/sources/Frontend_Design_Requirements_Labeller_HMI_v1.6.docx` (PID Group). Every section maps to tickets (`docs/tickets/`) and to the test that proves it. Status: todo, in progress, done. Tests named "gate" are reviewed at the design gate.

## 1. Document sections

| Section | Requirement (summary) | Tickets | Test | Status |
|---|---|---|---|---|
| §1 Purpose and scope | Keep the visual style and icon language of the first draft; carry it across the whole interface; check larger text sizes; deliverable is Figma plus HTML/CSS | P0-05, P0-08, P5-02 | gate G0-1 | in progress |
| §1.1 Out of scope | No firmware behaviour, no parameter wording, no brand assets beyond the logo area | all | none | n/a |
| §2 Reference material | drawio binding for structure, Excel for parameter type and control, clickdummy for structure and function, prototype for style; docx decides conflicts | P0-02, P0-03 | data:validate | done |
| §3 Display | 4.3", 800x480, dark primary + light required, gloves, embedded rendering with no heavy effects | P0-05, P1-06, P4-06, P0-09 | perf.spec, gate G4-3 | in progress |
| §3.1 Six orientations | Portrait 480x800 default, landscape LH/RH 800x480 with bars on the edges, upside-down variants rotate without separate frames | P1-06, P4-02a, P4-02b | screenshot matrix | todo |
| §3.2 Layout consequences | Max six tiles per page with paging; touch >= 60 px primary / 48 px rows; every screen works in portrait and landscape; parameter screens scroll, no content lost | P2-01, P2-04, P4-02a, P4-02b, P4-04 | touch-targets.spec, screenshot matrix | todo |
| §4 Users | Operator, technician, application engineer personas | P1-13, P3-20, P3-21 | gate G1-2 | todo |
| §4.1 Access levels | Levels 0-4; L0 default with no menu; level always visible; unreadable not shown, read-only locked; both faces for level-dependent screens | P1-04, P1-09, P1-12, P2-03, P2-04, P3-06, P3-16a, P3-16b, P3-17 | access.test, e2e per level | todo |
| §5.1 Tokens | Colour, status, text and typography tokens continued; Figtree / Fira Code licence-free; spacing 4-60 | P0-05, P0-06, P0-08 | gate G0-1 | done |
| §5.2 Light and dark | Both themes, dark default; icons single colour; status colours distinguishable and never the only carrier of meaning | P0-05, P0-04, P4-01a, P4-01b | screenshot matrix light, gate G4-1 | in progress |
| §5.3 Logo | Defined logo area with maximum size; branding configurable via 608 | P1-11, P1-12 | gate G1-2 | todo |
| §5.4 Components | Status bar, title bar, nav bar, menu tile, paging, parameter row, group header, toggle, selection list, keypad, keyboard, slider, favourite, info, list row, table row, confirmation, progress, toast, placeholders, modal, each with states | P1-08, P1-09, P1-10, P2-01, P2-03, P2-05 to P2-12, P3-01 | styleguide screenshots, gates G1-1, G2-2, G3-1 | partial: all components built (list row, table row, confirmation, progress, placeholders done 2026-11-10, P3-01); gate G3-1 open |
| §6 Information architecture | Structure from drawio, unchanged | P0-02, P2-02 | data:validate | done |
| §6.1 Main menu | Six entries; colour code per branch | P2-01, P2-02 | gate G2-1 | todo |
| §6.2 Navigation rules | Back returns to where the user came from; linked paths with cross-link hint; search by name or ID with visible ParamID; four quicklinks (614-617); favourites as a view | P1-02, P2-02, P2-03, P2-12, P3-20, P1-12 | router.test, e2e navigation | todo |
| §6.3 Home screen | Machine state, device name, start/pause, quicklinks, logo; errors and warnings shown here first | P1-12 | e2e home, gate G1-2 | todo |
| §7 Standard parameter screens | One generated pattern for all lists | P2-04 | e2e list screens | todo |
| §7.1 Parameter row | Value visible, indent <= 2, favourite, help indicator with 40/600 modal, conditional rows absent, read-only and locked treatments | P2-03, P2-04, P2-11, P2-12 | styleguide, e2e | todo |
| §7.2 Types and controls | Boolean toggle, discrete list, number keypad, string keyboard, range slider, action button, state display; time/date picker for 700/701 (not in §7.2, OPEN-POINTS #3) | P2-05 to P2-10, P2-13 | e2e per control | todo |
| §7.3 Editing behaviour | Few steps, one confirm, invalid explained, changed-from-default marker | P2-07, P2-14 | validate.test, checklist G2-3 | done in code, checklist in P2-14; sign-off at G2-3 |
| §8 Special screens (common) | Empty/loading/error states, shared confirmation, defined row height and end-of-list, refresh rate | P3-01, P1-07, P4-05 | styleguide, gate G3-1 | todo |
| §8.1 Select Format | L1; loaded marked; confirm names format; blocked while running; empty state | P3-02 | e2e formats | done 2026-11-10 |
| §8.2 Modify Format | L2; pre-selected; diff summary; no-differences state | P3-03 | e2e formats | done 2026-11-10 |
| §8.3 Create New Format | L2; not pre-filled; duplicate inline; toast on return | P3-04 | e2e formats | done 2026-11-10 |
| §8.4 Speed Test | m/min and Hz at 1 s; no-signal state; result block; read L1 run L2 | P3-05 | e2e speed test | done 2026-11-10 |
| §8.5 IO-Test | Modular table; input/output at a glance; forcing at L3 with marking and reset-all; both faces | P3-06 | e2e IO test | done 2026-11-10 |
| §8.6 Diagnosis Logs | Toggle first; timestamp, type, role; FIFO; export; off/empty state; L2 view L3 activate | P3-08 | e2e logs | done 2026-11-10 |
| §8.7 Error History | Newest first; search from 2 chars with keyboard; empty and end states; L1 read L3 clear | P3-09 | e2e error history | done 2026-11-10 |
| §8.8 Reporting | Counters, comment, date/user without scrolling; commit resets; L3 | P3-10 | e2e reporting | done 2026-11-10 |
| §8.9 Backup | USB browser; no-USB empty state; naming dialog; Backup vs Format; progress; L2 create L3 load | P3-11 | e2e backup | done 2026-11-10 |
| §8.10 FW-Update | Versions side by side; own progress view; success/restart/failure/invalid signature; downgrade allowed; L3 | P3-12 | e2e update | done 2026-11-10 |
| §8.11 Reporting QR | Scannable from 30 cm; text; regenerated; configurable URL template; L1 | P3-19 | e2e | todo |
| §8.12 Search | From 2 chars; name, path, value; empty / no-match / too-many; back to results; filtered by level | P3-20 | e2e search | todo |
| §8.13 Create New User | Five fields; masked password with policy feedback (618-627); Save gated; duplicate inline; L3 | P3-14 | validate.test, e2e | todo |
| §8.14 User Management | Two faces; temp language reset; disable own role confirmed; users disabled never deleted; black/white lists | P3-16a, P3-16b | e2e at L1/L2/L3 | todo |
| §8.15 Secure Code | Explanation first; two paths; L4 open until hh:mm on screen and status bar; generate confirmed; device-only; audit entries | P3-17, P1-04, P1-08, P3-08 | e2e secure code | todo |
| §8.16 Setup wizard | First start and from Service; forced password step; progress %; skips in summary; L3 | P3-21 | e2e wizard | todo |
| §8.17 Start-up screen | Logo, device name, continuous progress, still-starting and failed states, machine type + FW line, every orientation | P1-11 | e2e boot | todo |
| §9 Icons | Outline, single colour, recolourable per state and theme; Mono's icons take precedence | P0-04 | data:validate, styleguide | done |
| §9.1 Icon list | 67 names mapped to screens | P0-04, P0-02 | data:validate | done |
| §10 Deliverables | Figma file by screen group, HTML/CSS, components with states, tokens for both themes, all screens in 3 layouts x 2 themes, icons, spec, prototype | P0-08, P1-15, P2-16, P3-22a-c, P4-09a-b, P5-01, P5-02 | Figma vs screenshots | in progress |
| §10.1 General acceptance | Complete structure; touch targets on demo display; 3 layouts; 2 themes; states; performance; licences | P4-04, P4-05, P4-06, P5-03 | checklist P5-03 | todo |
| §11 Open points | Wizard list, help texts, text resources with ID ranges and 30 % German, modal styling from PID | P1-05, P2-11, P3-21, P4-03, P5-04 | OPEN-POINTS.md | in progress |

## 2. Screen tree (drawio / clickdummy, 62 nodes)

| Node id | Title | Kind | Ticket | Status |
|---|---|---|---|---|
| root | Main Menu | menu | P2-01, P2-02 | todo |
| settings | Settings | menu | P2-02 | todo |
| machine | Machine | menu | P2-02 | todo |
| options | Options | menu | P2-02 | todo |
| pconnector | PConnector | list (16) | P2-04 | todo |
| printers | Printers | list (17), option-gated 146 | P2-04, P2-01 | todo |
| control | Control | list (17), option-gated 177/187 | P2-04, P2-01 | todo |
| mio | MIO-Card | list (16) | P2-04 | todo |
| buscard | Bus and Network Card | placeholder, dynamic name | P2-01 | todo |
| unwinder | Unwinder | list (5) | P2-04 | todo |
| rewinder | Rewinder | placeholder, D-Series only | P2-01 | todo |
| driveunit | Drive Unit | menu | P2-02 | todo |
| start | Start | list (20) | P2-04 | todo |
| stop | Stop | list (13, 1 TBD) | P2-04 | todo |
| speed | Speed | list (8) | P2-04 | todo |
| drivesettings | Drive Settings | list (5) | P2-04 | todo |
| tandem | Tandem | list (16), gated 238 | P2-04 | todo |
| ref-digitalio-machine | Digital IO (ref) | ref -> digitalio | P1-02, P2-02 | todo |
| interface | Interface | menu | P2-02 | todo |
| digitalio | Digital IO | menu | P2-02 | todo |
| sensors | Sensors | menu | P2-02 | todo |
| ref-start | Start (ref) | ref -> start | P1-02 | todo |
| ref-stop | Stop (ref) | ref -> stop | P1-02 | todo |
| furtherio | Further IO-Signals | list (6) | P2-04 | todo |
| ref-control | Control (ref) | ref -> control | P1-02 | todo |
| ref-pconnector | PConnector (ref) | ref -> pconnector | P1-02 | todo |
| ref-mio | MIO-Card (ref) | ref -> mio | P1-02 | todo |
| network | Network | list (10) | P2-04, P2-13 | todo |
| can | CAN | list (5, 1 TBD) | P2-04 | todo |
| ref-buscard | Bus and Network Card (ref) | ref -> buscard | P1-02 | todo |
| label | Label | list (13) | P2-04 | todo |
| hmi | HMI | list (12) | P2-04, P2-13 | todo |
| production | Production | menu | P2-02 | todo |
| formats | Formats | menu | P2-02 | todo |
| selectformat | Select Format | mask formatlist | P3-02 | todo |
| modifyformat | Modify Format | mask formatlist | P3-03 | todo |
| createformat | Create New Format | mask textinput | P3-04 | todo |
| batch | Batch Mode | list (5) | P2-04 | todo |
| info | Information/Counters | list (22, 2 headers) | P2-04 | todo |
| service | Service | menu | P2-02 | todo |
| tests | Tests | menu | P2-02 | todo |
| speedtest | Speed Test | mask speedtest | P3-05 | todo |
| iotest | IO-Test | mask iotable | P3-06 | todo |
| applicatortest | Applicator Test | list (12) | P3-07 | done 2026-11-10 |
| testmode | Test-Mode | list (6) | P3-07 | done 2026-11-10 |
| diagnostic | Diagnostic Function | menu | P2-02 | todo |
| diaglogs | Diagnosis Logs | mask eventlog | P3-08 | todo |
| errorhistory | Error History | mask errorlog | P3-09 | done 2026-11-10 |
| reporting | Reporting | mask servicereport | P3-10 | done 2026-11-10 |
| files | Files | menu | P2-02 | todo |
| backup | Load/Store Backup | mask browser | P3-11 | done 2026-11-10 |
| fwupdate | FW-Update | mask browser | P3-12 | done 2026-11-10 |
| usermodified | User modified Parameters | mask usermodified (override) | P3-13 | todo |
| help | Help/Contact/Links | menu | P2-02 | todo |
| reportingqr | Reporting QR | mask qr | P3-19 | todo |
| search | Search Field | mask search | P3-20 | todo |
| usermgmt | Users and Authentication | menu | P2-02 | todo |
| createuser | Create New User | mask form | P3-14 | todo |
| usersettings | User Settings | list (11) | P3-15 | todo |
| usermanage | User Management | mask usermgmt | P3-16a, P3-16b | todo |
| securecode | Secure Code | mask qr | P3-17 | todo |
| cracountry | Country Settings | list (1) | P3-18 | todo |

## 3. Screens only in the docx (not in the drawio tree)

| Screen | Source | Ticket | Status |
|---|---|---|---|
| Start-up screen | §8.17 | P1-11 | todo |
| Home, Level 0 face | §4.1, §6.3 | P1-12 | todo |
| Login | §4.1 | P1-13 | todo |
| Stand-by | §5.4, param 613 | P1-16 | todo |
| Favourites | §6.2 | P2-12 | todo |
| Setup wizard | §8.16 | P3-21 | todo |
| Styleguide / dev panel (not a product screen) | plan | P1-10b, P1-14 | in progress |
