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

## DT-02 · (pending) designer tweak of the home screen (2026-10-30, G1-2)

Source: figma node 2045:1372, frame `home / dark / portrait / ready-L0 - tweak` on `HMI / 03 Screens – Portrait`
Change: to be read after P1-17 lands (tokens bound), so the diff can be expressed in tokens / components
Where: tbd
Before → after: `home / dark / portrait / ready-L0` vs the tweak frame
Status: pending review
