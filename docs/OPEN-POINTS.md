# Open points for PID and Mono

Questions the sources leave open, with the assumption taken in the meantime. Numbered, never renumbered. Status: open until PID or Mono answers; then the answer and the affected tickets are updated.

Sources: docx = Frontend_Design_Requirements_Labeller_HMI_v1.6; Excel = Parameterliste-PreSeriesPhase (12); CD = clickdummy report (PID_Labeller_HMI_Clickdummy.html, "Open questions" section).

## A. Decisions taken in the data (src/data/overrides.json)

| # | Question | Source | Assumption taken | Tickets | Status |
|---|---|---|---|---|---|
| 1 | Type of IPAddress (108), SubnetMask (109), Gateway_Address (110) is "?" | Excel rows 23-25; CD checks | String with a dotted-decimal IPv4 control (`ip`), numeric keypad | P0-03, P2-13 | open |
| 2 | SubnetMask default "AA:AA:AA:AA" with alphabetical keyboard | Excel row 24 | Copy error; default 255.255.255.0, same control as 108/110 | P0-03 | open |
| 3 | Info_Time (700) and Info_Date (701) are Strings with a numeric keypad; §7.2 has no date/time control | Excel rows 303-304; docx §7.2 | Dedicated time and date picker sheets: stepper columns hh : mm and dd . mm . yyyy, wrap except the year, impossible dates explained inline, "Now" from the device clock, seconds not edited (built in P2-13) | P2-13 | open |
| 4 | AppAlarm (323) colour "#fffff" is a 5-digit hex | Excel; CD checks | Dropped; colours come from tokens | P0-03 | open |
| 5 | HMI_Logo_Selection (608) Val = 502 (a language option) | Excel | Copy error; current value 609 (NOVEXX logo) | P0-03 | open |
| 6 | Conditions of 273/274 use AND between two values of one selection ({269=271}&{269=272}) | Excel | Meant as OR: {269=271};{269=272} | P0-03 | open |
| 7 | Condition of 246 (Printfunction via CAN-Input) references Batch Mode (247) | Excel | Gated on External_Canbus_Enable (238) instead | P0-03 | open |
| 8 | Which range parameters get a slider; Excel marks none | docx §7.2 | 122 SpeedFixed, 123 SpeedFeed_Manual, 130 Speed_Modification, 297 Test speed, 613 Standby timer | P2-09 | open |
| 9 | Sensor_Type options Opt4-Opt10 (226-232) | CD "What changed" vs CD open question | Reserved on purpose, hidden in the selection list | P2-06 | open |
| 10 | Diagnosis recording toggle has no parameter | docx §8.6 | Dummy parameter 900 Diag_Recording_Enable (R2/W3) | P3-08 | open |
| 11 | Secure Code parameters (limit of codes, session duration) | docx §8.15, Excel backlog | Dummy 901 SecureCode_Request_Limit, 902 SecureCode_Session_Minutes | P3-17, P1-04 | open |
| 12 | Reporting QR URL template is not in the parameter list | docx §8.11 | Dummy 906 Reporting_QR_URL_Template with {serial} {machine} {fw} placeholders | P3-19 | open |
| 13 | CRA_relevant_Target_Country (729) is a Boolean although a country is a selection; read level 4, not editable | Excel | Read-only display at L4 until PID defines the selection | P3-18 | open |

## B. Behaviour and design

| # | Question | Source | Assumption taken | Tickets | Status |
|---|---|---|---|---|---|
| 14 | How does a user log in? The docx only says "reached by user profile" | docx §4.1 | Pick a profile from a list, then password on the keypad; L0 after start and auto log-off | P1-13 | open |
| 15 | What does "write level 4" mean for 619-627 when L4 is defined as reset / create-admin only? | docx §4.1 vs Excel | Rows shown locked at L3; editable only inside an L4 session | P3-15, P1-04 | open |
| 16 | Stand-by state: look and behaviour of the stand-by screen | docx §5.4 status bar "stand-by"; param 613 | Dim screen with logo, wake on touch, status bar state | P1-16 | open |
| 17 | Do 180-degree orientations come from the OS (framebuffer) or must the UI rotate itself? | docx §3.1 | UI rotates its root with CSS; dropped if the OS rotates | P1-06, P4-02b | open |
| 18 | Embedded browser engine and version (Tailwind v4 needs Chromium 111 or newer) | docx §3 | Build targets chrome111 | P0-09 | open |
| 19 | Touch targets must be checked on the demo display | docx §10.1 | Checked in-browser at 1:1 pixels; hardware check pending | P4-04 | open |
| 20 | PID wants to send a modal dialog styling suggestion (CE) | docx §11 | Modal designed from the first draft until it arrives | P1-10 | open |
| 21 | Where are formats stored: internal memory, USB or both? | CD §8.1 open; docx §8.9 | Internal list; USB only through Backup/Format files | P3-02, P3-11 | open |
| 22 | What exactly does a format contain? | docx §8.1 (format-relevant parameters); Excel v12 column "Format relevant" | The parameters marked Format relevant in the Excel (carried as `formatRelevant`) | P3-02, P3-03 | open |
| 23 | Is loading a format allowed while running? | docx §8.1 says blocked; CD said "decide" | Blocked while running, with a message | P3-02 | open |
| 24 | Rewinder screen only for the D-Series, enabled via crypto chip | drawio note | Tile hidden unless seed/machine.json says D-Series; placeholder content | P2-01 | open |
| 25 | Bus and Network card: dynamic tile name "comes later" | drawio note | Disabled placeholder tile; name from the detected card in the seed | P2-01 | open |
| 26 | Text resources: many parameters have no TextResID, and chrome texts have no ID range yet | docx §11; Excel column TextResID 1 | Keys tr<N> where present, param.<id> / opt.<id> otherwise; chrome keys free-form | P1-05, P4-03 | open |
| 27 | Setup wizard parameter list and order | docx §8.16, §11 | 5-20 dummy parameters over several steps | P3-21 | open |
| 28 | Help texts in every language | docx §7.1, §11 | Placeholders with real lengths (40 / 600 characters) | P2-11 | open |
| 29 | Login UI, auto log-off time per user: unit and default | docx §8.13 | Minutes, default 10 | P1-13, P3-14 | open |
| 30 | IO count and pin assignment per machine type | docx §8.5 | Seed with one MIO card group and one "further IO" group | P3-06 | open |

## C. Clickdummy open questions not answered by docx v1.6

Summarised from the clickdummy report (26 questions, duplicates merged). Questions the docx already answers are omitted.

| # | Question | Assumption taken | Tickets | Status |
|---|---|---|---|---|
| 31 | Is there a level 4 as a profile, or only the secure-code session? | Session only (docx §4.1) | P1-04 | open |
| 32 | Stop screen: "Minimum Stop Input Pulse Length" row is TBD, and CAN screen "Option CAN-Bus" is TBD | Rendered as TBD rows (status tbd), no parameter | P2-04 | open |
| 33 | Two planned Rewinder rows have no ParamID | Rendered as planned rows in the placeholder | P2-01 | open |
| 34 | SubnetMask keyboard type differs from IP and Gateway | See #2 | P0-03 | open |
| 35 | Info_Time / Info_Date widget | See #3 | P2-13 | open |
| 36 | HMI_Dark_Mode (612) had no effect in the clickdummy | Bound to the theme | P1-06 | open |
| 37 | Quicklinks hold ParamIDs: how does the user pick one? | Picker from favourites and search (P2-12, P2-13) | P2-12 | open |
| 38 | "Formats/Recipes" naming: the 2026-09-21 diagram dropped "Recipes" | "Formats" everywhere | P2-02 | open |
| 39 | Status-bar icons: which options are shown? | network, CAN, web server, card from the seed | P1-08 | open |
| 40 | Standby timer exists but no stand-by screen | See #16 | P1-16 | open |
| 41 | Which machine type dependent screens exist beyond Rewinder? | Only Rewinder and the bus card | P2-01 | open |
| 42 | Printers: "Printfunction via CAN-Input" is the same parameter as on CAN | One value (246), cross-link hint | P2-02 | open |
| 43 | Diagnosis activation screen vs toggle | Toggle on the logs screen (docx §8.6) | P3-08 | open |
| 44 | Mode of the IO test force switches at L1 vs L3 | Two faces (docx §8.5): below L3 no force column and a "needs level 3" line; at L3 switches on outputs only. Forcing drives the output HIGH; switching it off releases it (built 2026-11-10, DT-57) | P3-06 | open |
| 45 | User management: picker for black/white lists | Manual ID entry; picker later with the web server | P3-16b | open |
| 46 | Speed test refresh rate | 1 s (docx §8.4) | P3-05 | open |
| 47 | Error history: severity levels and colours | high / mid / low with icon + text | P3-09 | open |
| 48 | Backup naming: separator and date format in "device + serial + date" | `<device>_<serial>_<yyyy-mm-dd>` | P3-11 | open |
| 49 | Icon grid: rules say 48 px stroke 2, docx proposals are 24 px stroke 1.8 | Mono's Icons v1 geometry on a 24 px canvas with a 1.5 px stroke (DT-01, 2026-10-30); names identical | P0-04 | open |
| 50 | The clickdummy report quotes three different resolutions (272x480, 480x640, 480x800) | 800x480 per docx §3 | all | open |
| 51 | Touch target size: docx §4 asks for 10 mm primary / 8 mm rows and equates that with "roughly 60 px and 48 px", but on the 4.3" 800x480 display (8.54 px/mm) 60 px is 7.0 mm and 48 px is 5.6 mm. First test on the device (2026-11-05): UI looks small, touch imprecise | Measured on the board 2026-11-05 (`#/touchtest`, bare finger): panel mapped correctly (2.8 mm scatter, no offset); only 10 mm and up hit every time, 7 mm 1/6. Re-based in code to 88 / 68 px and one type step up (DT-13). Open: designer and PID sign-off, Figma update, glove test | P0-05, P4-04 | open |
| 52 | Portrait editors open as a full page (DT-28), while docx §7.2 asks that the editor not cover the edited field | Page title carries the parameter name; both back buttons return to the list. Confirm with designer / PID | P2-05 … P2-10 | open |
| 53 | The icon set has no check mark, folder, file, USB drive or "one level up" icon, which the success state, the file browser and the placeholders need | Success: a check drawn in CSS; folder `files` (closed folder), current folder `folderopen`, file `recipe`, up `back`, no USB `files`. Designer to add `check`, `folder`, `file`, `usb`, `up` to Icons v1 | P3-01, P3-11, P3-12 | resolved 2026-11-10: `check`, `file`, `up`, `usb` added to Icons v1 – 24 px (DT-53); folders keep `files`, which already is a closed folder |
