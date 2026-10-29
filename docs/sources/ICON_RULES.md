# Icon rules v1.0

Baseline: the icon components on the "Icon rules" page of the Figma file (Machine, Unwinder, Rewinder, Production, Counter, Service, Settings, Help, Users & Authentication, Menu, Home, Users, Options, Interface, Label, Display, Drive, Drive settings, Start, Stop, Speed). The first set built from these rules is on the "Icons v1" page.

## 1. Canvas and stroke
1. Canvas 48 x 48, one Figma component per icon, named `icon/<name>`.
2. Centrelines stay inside the 4-44 square. The stroke's outer edge may reach 3. The visual centre of the icon is near (24, 24).
3. Stroke 2 px, centred, round caps, round joins, no fills.
4. Single colour. No opacity, no gradients. In delivery the stroke is bound to a colour variable so one file serves dark and light theme and every status colour.
5. Scaled to 24 px (stroke becomes 1 px) the icon must still read.

## 2. Geometry
6. Geometric icons: whole-pixel coordinates and sizes, pixel snapping on.
7. Angles are 0, 45 and 90 degrees. Curves only as circles and arcs. Accepted exceptions: hexagon (integer vertices, 9:16 slope), play triangle (14,8) (38,24) (14,40).
8. 45 degree edges lie on integer lines x + y = c or x - y = c, so their endpoints are whole pixels. Where such an edge meets a circle, that meeting point is the one allowed fractional point.
9. Organic icons (gear, wrench, shield, person) may use fractional points and Bezier curves. They follow the same stroke, margin and gap rules and must not look heavier or lighter than the geometric icons next to them.
10. Corner radius: 3 on bodies and boxes, 1 on small inner details (labels, bars). No other values.
11. A dot (pip, question-mark point) is a zero-length line with a round cap, never a filled circle.

## 3. Detail budget
12. One idea per icon, at most 5 distinct elements. A repeated element (three wheels, four tally marks, three slider rows) counts as one.
13. Clear gap between two strokes at least 2 px (inner edge to inner edge). Exception: repeated small elements such as wheels may drop to 1 px. If a detail does not fit, remove it, do not shrink it.
14. Must read at 48 px (design size), 32 px and 24 px.

## 4. Recurring motifs (reuse, do not reinvent)
15. Ground line: y = 42, x 4 to 44. Everything that stands on the floor or a conveyor rests on it.
16. Stand: vertical line x = 8, tangent to the roll, down to the ground line.
17. Machine roll: circle r 8 centred (16, 14), hub circle r 2. The peel arm leaves the roll at 45 degrees. Web roll (unwinder, rewinder): outer ring r 13 and inner ring r 7, both centred (21, 21); the web leaves tangent at the bottom of the outer ring (y = 34, x 21 to 41).
18. Direction: open chevron at 45 degrees, arms 4 px in x and y, tip on the end of the line it points along. Away from a roll = unwinder, into a roll = rewinder.
19. Product: rounded box standing on the ground line or belt, with a label (a small rounded bar or rectangle) on its face.
20. Badge (lock, check, plus, eye): bottom-right quadrant, at most 12 x 10 px, never overlaps the main shape.
21. Person: head ring r 5, shoulders half circle r 10 to 11. A second person is shown only as the right-hand head arc and shoulder arc.
22. Rolling stock for the labeller domain keeps one vocabulary: roll, web, box, label, belt, motor. Anything else is a generic UI symbol (menu, search, lock).

## 5. Naming, delivery, review
23. Component name `icon/<name>`; the name list follows the icon list in the requirements (section 9.1).
24. SVG export: 48 x 48, stroke `currentColor`, stroke-width 2, round caps and joins.
25. A new icon is checked at 48, 32 and 24 px on both a dark and a light background before it is accepted.
