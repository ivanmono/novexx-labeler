/**
 * Browser-side serializer: turns the rendered device shell (`.hmi`) into a plain JSON
 * layer tree that `build-frames.js` recreates in Figma through the Desktop Bridge.
 *
 * Usage (in the page, e.g. via the in-app browser's JS tool or Playwright):
 *   window.__hmiSerialize()            → { w, h, root }
 *
 * Rules
 *  - An element becomes a FRAME when it paints something (background, gradient, border,
 *    shadow), clips, or has opacity < 1. Otherwise its children attach to the nearest
 *    emitted ancestor (keeps the Figma layer tree shallow).
 *  - Text nodes become TEXT layers with the parent's computed font.
 *  - `svg.icon` sprite uses become `svg` layers (inline markup, currentColor resolved).
 *  - ::before / ::after with a background are emitted from their computed inset box.
 */
(function () {
  const px = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;
  const isTransparent = (c) =>
    !c || c === 'transparent' || /rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\)/.test(c) || /\/\s*0\)$/.test(c);

  // ---- design tokens: tokens.css semantic variables ↔ Figma variables (docs/FIGMA.md) ------
  // Order = priority when several tokens resolve to the same colour in the current theme.
  const COLOUR_VARS = [
    'bg',
    'surface',
    'surface-2',
    'line',
    'line-soft',
    'text',
    'text-muted',
    'text-faint',
    'chrome',
    'brand',
    'brand-hi',
    'brand-deep',
    'on-brand',
    'overlay',
    'keyboard-key',
    'keyboard-key-pressed',
    'status-ready',
    'status-run',
    'status-pause',
    'status-standby',
    'status-warning',
    'status-error',
    'status-run-ink',
    'status-standby-ink',
    'status-warning-ink',
    'status-error-ink',
    'level-0',
    'level-1',
    'level-2',
    'level-3',
    'level-4',
    'branch-settings',
    'branch-production',
    'branch-info',
    'branch-help',
    'branch-service',
    'branch-usermgmt',
  ];
  // gradient stop tokens (`--hmi-gradient-<name>-<stop>`), bound per stop on GRADIENT paints
  const GRADIENT_VARS = [
    'gradient-stroke-0',
    'gradient-stroke-1',
    'gradient-stroke-2',
    'gradient-stroke-strong-0',
    'gradient-stroke-strong-1',
    'gradient-stroke-strong-2',
    'gradient-surface-0',
    'gradient-surface-1',
    'gradient-page-0',
    'gradient-page-1',
    'gradient-run-mid',
    'gradient-standby-mid',
    'gradient-error-mid',
    'gradient-warning-mid',
  ];
  /** `--hmi-<v>` → Figma variable name in collection "HMI Colour" */
  const figmaName = (v) => {
    let m;
    if ((m = v.match(/^gradient-(.+)-(\d+|mid)$/))) return `colour/gradient/${m[1]}/${m[2]}`;
    if ((m = v.match(/^status-(\w+)-ink$/))) return `colour/status-ink/${m[1]}`;
    if ((m = v.match(/^(status|level|branch)-(\w+)$/))) return `colour/${m[1]}/${m[2]}`;
    if (v === 'keyboard-key') return 'colour/key';
    if (v === 'keyboard-key-pressed') return 'colour/key-pressed';
    return `colour/${v}`;
  };
  /** Tailwind utility colour name (bg-X / text-X / border-X, see @theme in tokens.css) → Figma name */
  const utilityToken = (u) => {
    if (u === 'muted') return 'colour/text-muted';
    if (u === 'faint') return 'colour/text-faint';
    let m;
    if ((m = u.match(/^status-(\w+)-ink$/))) return `colour/status-ink/${m[1]}`;
    if ((m = u.match(/^(status|level|branch)-(\w+)$/))) return `colour/${m[1]}/${m[2]}`;
    return `colour/${u}`;
  };
  const KNOWN = new Set(COLOUR_VARS.map(figmaName));
  const RADII = {
    8: 'radius/xs',
    12: 'radius/sm',
    16: 'radius/md',
    23: 'radius/card-inner',
    24: 'radius/card',
    9999: 'radius/pill',
  };
  let colourIndex = null; // computed colour string (current theme) → Figma names, priority order
  let rgbIndex = null; // "r,g,b" of the opaque tokens → Figma names (for colour-mix with transparent)
  /** rgb(…) / rgba(…) / color(srgb …) → { key: "r,g,b" (0–255), a } */
  function rgbOf(css) {
    let m = css.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (m) return { key: `${m[1]},${m[2]},${m[3]}`, a: m[4] == null ? 1 : +m[4] };
    m = css.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
    if (m)
      return {
        key: [m[1], m[2], m[3]].map((x) => Math.round(+x * 255)).join(','),
        a: m[4] == null ? 1 : +m[4],
      };
    return null;
  }
  let gradIndex = null; // computed colour string → gradient stop token names (current theme)
  function buildColourIndex() {
    colourIndex = new Map();
    rgbIndex = new Map();
    gradIndex = new Map();
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;visibility:hidden';
    document.body.appendChild(probe);
    for (const v of COLOUR_VARS) {
      probe.style.color = `var(--hmi-${v})`;
      const c = getComputedStyle(probe).color;
      if (!colourIndex.has(c)) colourIndex.set(c, []);
      colourIndex.get(c).push(figmaName(v));
      const rgb = rgbOf(c);
      if (rgb && rgb.a === 1) {
        if (!rgbIndex.has(rgb.key)) rgbIndex.set(rgb.key, []);
        rgbIndex.get(rgb.key).push(figmaName(v));
      }
    }
    for (const v of GRADIENT_VARS) {
      probe.style.color = `var(--hmi-${v})`;
      const c = getComputedStyle(probe).color;
      if (!gradIndex.has(c)) gradIndex.set(c, []);
      gradIndex.get(c).push(figmaName(v));
    }
    probe.remove();
  }
  /** split a CSS list on top-level commas (gradient layers, stops) */
  function splitTop(s) {
    const out = [];
    let depth = 0;
    let cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        out.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  /**
   * Gradient stop tokens per background layer: `[[tokenOrNull, …] …]`. A stop matches when its computed colour
   * equals a probed `--hmi-gradient-*` value; a group is used only when every opaque stop of the layer matches the
   * same gradient family (stroke, surface, …) in order, so equal greys in two families never cross-bind.
   */
  function gradientStopTokens(bgImage) {
    if (!colourIndex) buildColourIndex();
    const layers = splitTop(bgImage).map((layer) => {
      const m = layer.match(/^(?:linear|radial)-gradient\((.*)\)$/);
      if (!m) return null;
      const stops = splitTop(m[1]).filter((p) =>
        /^(rgba?\(|color\(|oklab\(|oklch\(|transparent)/.test(p),
      );
      const colours = stops.map(
        (p) => p.match(/^(rgba?\([^)]*\)|color\([^)]*\)|okl(?:ab|ch)\([^)]*\)|transparent)/)[1],
      );
      const candidates = colours.map((c) =>
        isTransparent(c) ? 'transparent' : gradIndex.get(c) || [],
      );
      const families = new Set();
      for (const c of candidates)
        if (c !== 'transparent') for (const t of c) families.add(t.replace(/\/[^/]+$/, ''));
      for (const fam of families) {
        const picked = candidates.map((c, i) => {
          if (c === 'transparent') return null;
          return (
            c.find((t) => t.startsWith(fam + '/') && (t.endsWith('/mid') || t.endsWith('/' + i))) ||
            undefined
          );
        });
        if (!picked.includes(undefined)) return picked;
      }
      return null;
    });
    return layers.some(Boolean) ? layers : undefined;
  }
  /** Token candidates from utility classes (`bg-surface`, `text-level-3`, `bg-status-error/15`); walks up for inherited colour */
  function classCandidates(el, prefixes, inherit) {
    const out = [];
    const re = new RegExp(`^(?:${prefixes.join('|')})-([a-z0-9-]+?)(?:/(\\d+))?$`);
    for (let e = el; e && e.nodeType === 1; e = inherit ? e.parentElement : null) {
      for (const c of e.classList) {
        const m = c.match(re);
        if (!m) continue;
        const token = utilityToken(m[1]);
        if (KNOWN.has(token)) out.push({ token, alpha: m[2] ? +m[2] / 100 : 1 });
      }
      if (out.length || e.classList.contains('hmi')) break;
    }
    return out;
  }
  /** The token a computed colour came from: a utility class on the element wins, else the first token with that value */
  function colourToken(css, candidates = []) {
    if (!colourIndex) buildColourIndex();
    const names = colourIndex.get(css) || [];
    for (const c of candidates) if (c.alpha < 1 || names.includes(c.token)) return c; // `/NN` is a colour-mix → trust the class
    if (names.length) return { token: names[0], alpha: 1 };
    // `color-mix(in srgb, var(--hmi-x) NN%, transparent)` in component CSS → token + paint opacity
    const rgb = rgbOf(css);
    const opaque = rgb && rgb.a < 1 ? rgbIndex.get(rgb.key) : null;
    return opaque && opaque.length ? { token: opaque[0], alpha: rgb.a } : null;
  }
  const withToken = (css, candidates) => {
    const t = colourToken(css, candidates);
    return t ? { token: t.token, ...(t.alpha < 1 ? { alpha: t.alpha } : {}) } : {};
  };

  function nameOf(el) {
    const d = el.dataset || {};
    if (d.cmpPart) return d.cmpPart; // a named part of a component (size override target)
    for (const k of [
      'icon',
      'action',
      'home',
      'startup',
      'profiles',
      'password',
      'keyboard',
      'numpad',
      'field',
      'badge',
      'status',
      'quicklinks',
      'errorOverlay',
    ]) {
      if (k in d) return `${el.tagName === 'svg' ? 'icon' : k}${d[k] ? '/' + d[k] : ''}`;
    }
    const cls = [...(el.classList || [])].find(
      (c) =>
        /__|^(status-bar|nav-bar|title-bar|card-border|home|keyboard|numpad|key|toast|modal|sheet|logo|hmi)/.test(
          c,
        ) && !/^(card-border--|pressable)/.test(c),
    );
    if (cls) return cls;
    return el.tagName.toLowerCase();
  }

  function spriteSvg(svgEl, color) {
    const use = svgEl.querySelector('use');
    const href = use?.getAttribute('href') || use?.getAttribute('xlink:href') || '';
    const sym = href && document.querySelector(href);
    const r = svgEl.getBoundingClientRect();
    if (!sym) return null;
    const vb = sym.getAttribute('viewBox') || '0 0 48 48';
    const inner = sym.innerHTML.replace(/currentColor/g, color);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${px(r.width)}" height="${px(r.height)}" fill="none" stroke="${color}">${inner}</svg>`;
  }

  /** Non-sprite inline SVG (e.g. the logo mark): the markup itself, currentColor resolved, sized to its box */
  function inlineSvg(svgEl, color) {
    const r = svgEl.getBoundingClientRect();
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width', String(px(r.width)));
    clone.setAttribute('height', String(px(r.height)));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // resolve var(--token) references (the logo mark paints with var(--hmi-brand)) to computed colours
    const probe = document.createElement('i');
    document.body.appendChild(probe);
    const parts = clone.outerHTML.split('currentColor').join(color).split('var(');
    let out = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const end = parts[i].indexOf(')');
      probe.style.color = 'var(' + parts[i].slice(0, end) + ')';
      out += getComputedStyle(probe).color + parts[i].slice(end + 1);
    }
    probe.remove();
    return out;
  }

  function textLines(node, cs, base) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) return null;
    const x1 = Math.min(...rects.map((r) => r.left));
    const y1 = Math.min(...rects.map((r) => r.top));
    const x2 = Math.max(...rects.map((r) => r.right));
    const y2 = Math.max(...rects.map((r) => r.bottom));
    let text = node.textContent.replace(/\s+/g, ' ').trim();
    if (cs.textTransform === 'uppercase') text = text.toUpperCase();
    return {
      text,
      x: px(x1 - base.left),
      y: px(y1 - base.top),
      w: px(x2 - x1),
      h: px(y2 - y1),
      lines: rects.length,
    };
  }

  function paintOf(cs, el) {
    const fills = [];
    if (!isTransparent(cs.backgroundColor))
      fills.push({
        kind: 'solid',
        color: cs.backgroundColor,
        ...withToken(cs.backgroundColor, el ? classCandidates(el, ['bg'], false) : []),
      });
    if (cs.backgroundImage && cs.backgroundImage !== 'none')
      fills.push({
        kind: 'image',
        css: cs.backgroundImage,
        stops: gradientStopTokens(cs.backgroundImage),
      });
    const bw = ['Top', 'Right', 'Bottom', 'Left'].map((s) => px(cs[`border${s}Width`]));
    const bc = ['Top', 'Right', 'Bottom', 'Left'].map((s) => cs[`border${s}Color`]);
    const bcands = el ? classCandidates(el, ['border', 'ring'], false) : [];
    const border = bw.some((w) => w > 0)
      ? { widths: bw, colors: bc, tokens: bc.map((c) => colourToken(c, bcands)?.token ?? null) }
      : null;
    const radius = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((c) =>
      px(cs[`border${c}Radius`]),
    );
    const radiusToken =
      radius.every((r) => r === radius[0]) && RADII[radius[0]] ? RADII[radius[0]] : undefined;
    const shadow = cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : null;
    return { fills, border, radius, radiusToken, shadow };
  }

  function pseudo(el, which, base) {
    const cs = getComputedStyle(el, which);
    if (!cs || cs.content === 'none' || cs.display === 'none') return null;
    const paint = paintOf(cs, null);
    if (!paint.fills.length && !paint.border) return null;
    const r = el.getBoundingClientRect();
    let x = r.left;
    let y = r.top;
    let w = px(cs.width);
    let h = px(cs.height);
    if (cs.position === 'absolute') {
      const top = cs.top !== 'auto' ? px(cs.top) : null;
      const left = cs.left !== 'auto' ? px(cs.left) : null;
      const right = cs.right !== 'auto' ? px(cs.right) : null;
      const bottom = cs.bottom !== 'auto' ? px(cs.bottom) : null;
      if (left != null && right != null) {
        x = r.left + left;
        w = r.width - left - right;
      } else if (left != null) x = r.left + left;
      else if (right != null) x = r.right - right - w;
      if (top != null && bottom != null) {
        y = r.top + top;
        h = r.height - top - bottom;
      } else if (top != null) y = r.top + top;
      else if (bottom != null) y = r.bottom - bottom - h;
    }
    if (!(w > 0 && h > 0)) return null;
    return {
      type: 'frame',
      name: `${nameOf(el)}${which}`,
      x: px(x - base.left),
      y: px(y - base.top),
      w,
      h,
      opacity: px(cs.opacity),
      clip: false,
      ...paint,
      children: [],
    };
  }

  // ---- components: `data-cmp="<Set>" data-cmp-props="Prop=value,…"` on a component root ----------
  const parseProps = (s) =>
    Object.fromEntries(
      (s || '')
        .split(',')
        .filter(Boolean)
        .map((kv) => kv.split('=').map((x) => x.trim())),
    );
  const collect = (n, type, acc = []) => {
    if (n.type === type) acc.push(n);
    for (const c of n.children || []) collect(c, type, acc);
    return acc;
  };
  const JUSTIFY = {
    'flex-start': 'start',
    start: 'start',
    normal: 'start',
    left: 'start',
    center: 'center',
    'flex-end': 'end',
    end: 'end',
    right: 'end',
    'space-between': 'between',
  };
  const ALIGN = {
    'flex-start': 'start',
    start: 'start',
    center: 'center',
    'flex-end': 'end',
    end: 'end',
    stretch: 'stretch',
    normal: 'stretch',
    baseline: 'start',
  };
  /**
   * Auto-layout facts for the builder (full mode only): a flex container (or a single-child grid)
   * becomes an auto-layout frame; children carry grow / stretch / absolute positioning.
   */
  function flexInfo(el, cs, rel, o) {
    const out = {};
    if (cs.position === 'absolute' || cs.position === 'fixed') out.abs = true;
    if (!o.full) return out;
    const isFlex = /flex/.test(cs.display);
    const isGrid = /grid/.test(cs.display) && el.children.length <= 1;
    // a plain block becomes a one-column layout, so the component hugs its content in Figma (a
    // longer override wraps and grows instead of clipping): with one child (an element or a text
    // run), or with block-level children stacked at one constant gap (margins between them)
    const flow = [...el.childNodes].filter(
      (c) =>
        (c.nodeType === 1 && !/absolute|fixed/.test(getComputedStyle(c).position)) ||
        (c.nodeType === 3 && c.textContent.trim()),
    );
    let blockGap = 0;
    let blockJustify = 'start';
    // a single child sitting centred in the content box (a button label) → justify centre
    const centred = () => {
      const c = flow[0];
      const b =
        c.nodeType === 1
          ? c.getBoundingClientRect()
          : (() => {
              const r = document.createRange();
              r.selectNodeContents(c);
              return r.getBoundingClientRect();
            })();
      const box = el.getBoundingClientRect();
      const top = b.top - (box.top + px(cs.borderTopWidth) + px(cs.paddingTop));
      const bottom = box.bottom - px(cs.borderBottomWidth) - px(cs.paddingBottom) - b.bottom;
      if (top > 0.5 && Math.abs(top - bottom) < 1.5) blockJustify = 'center';
      return true;
    };
    const stacked = () => {
      if (flow.some((c) => c.nodeType !== 1 || /inline/.test(getComputedStyle(c).display)))
        return false;
      const boxes = flow.map((c) => c.getBoundingClientRect());
      const top = el.getBoundingClientRect().top + px(cs.borderTopWidth) + px(cs.paddingTop);
      if (Math.abs(boxes[0].top - top) > 0.5) return false; // margin above the first child
      const gaps = boxes.slice(1).map((b, i) => b.top - boxes[i].bottom);
      if (gaps.some((g) => g < -0.5 || Math.abs(g - gaps[0]) > 0.5)) return false;
      blockGap = Math.max(0, Math.round(gaps[0] ?? 0));
      return true;
    };
    const isBlock =
      !isFlex &&
      !isGrid &&
      flow.length > 0 &&
      !/inline/.test(cs.display) &&
      (flow.length === 1 ? centred() : stacked());
    if (isFlex || isGrid || isBlock) {
      const col = isBlock || (isFlex && cs.flexDirection.startsWith('column'));
      out.layout = {
        dir: col ? 'col' : 'row',
        gap: isBlock ? blockGap : px(col ? cs.rowGap : cs.columnGap) || 0,
        pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px),
        justify: isBlock
          ? blockJustify
          : (JUSTIFY[isGrid ? cs.justifyItems : cs.justifyContent] ?? 'start'),
        align: isBlock ? 'stretch' : (ALIGN[cs.alignItems] ?? (isGrid ? 'start' : 'stretch')),
      };
      // hug sizing: no explicit size class (on the element, or on the sheet wrappers above a
      // component root, up to its section) and not stretched / grown by the parent → the frame
      // follows its content
      const cls = [...el.classList];
      if (!o.parent)
        for (
          let a = el.parentElement;
          a && !a.hasAttribute('data-cmp-section');
          a = a.parentElement
        )
          cls.push(...a.classList);
      out.layout.hugW = !cls.some((c) => /^(w-|size-)/.test(c)) && !el.style.width;
      out.layout.hugH = !cls.some((c) => /^(h-|size-)/.test(c)) && !el.style.height;
      if (cls.some((c) => /^min-h-/.test(c))) out.layout.minH = px(cs.minHeight);
      // a negative margin on the first / last child (`-ml-2` on a bar button) pulls it into the
      // padding; auto layout has no margins, so the padding shrinks to where the child starts
      const flowEls = flow.filter(
        (c) => c.nodeType === 1 && getComputedStyle(c).display !== 'none',
      );
      if (flowEls.length) {
        const box = el.getBoundingClientRect();
        const first = flowEls[0].getBoundingClientRect();
        const last = flowEls[flowEls.length - 1].getBoundingClientRect();
        const col = out.layout.dir === 'col';
        const lead = col
          ? first.top - box.top - px(cs.borderTopWidth)
          : first.left - box.left - px(cs.borderLeftWidth);
        const trail = col
          ? box.bottom - px(cs.borderBottomWidth) - last.bottom
          : box.right - px(cs.borderRightWidth) - last.right;
        const [i0, i1] = col ? [0, 2] : [3, 1];
        out.layout.pad[i0] = Math.max(0, Math.min(out.layout.pad[i0], px(lead)));
        out.layout.pad[i1] = Math.max(0, Math.min(out.layout.pad[i1], px(trail)));
      }
    }
    const p = o.parent;
    if (p?.layout && !out.abs) {
      if (parseFloat(cs.flexGrow) > 0) out.grow = true;
      const self =
        cs.alignSelf === 'auto' || cs.alignSelf === 'normal' ? p.layout.align : ALIGN[cs.alignSelf];
      const col = p.layout.dir === 'col';
      const inner = col
        ? p.w - p.layout.pad[1] - p.layout.pad[3]
        : p.h - p.layout.pad[0] - p.layout.pad[2];
      if (self === 'stretch' && Math.abs((col ? rel.w : rel.h) - inner) < 1) out.stretch = true;
      if (out.layout) {
        if (col ? out.stretch : out.grow) out.layout.hugW = false;
        if (col ? out.grow : out.stretch) out.layout.hugH = false;
      }
    }
    if (out.abs && out.layout) out.layout.hugW = out.layout.hugH = false; // absolute: keep the box
    return out;
  }

  function walk(el, base, out, o = {}) {
    if (el.id === 'dev-panel' || el.hasAttribute('data-sprite')) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const opacity = px(cs.opacity);
    if (opacity === 0) return;
    const r = el.getBoundingClientRect();
    // a zero-height (or -width) element still takes space in an auto-layout row (a spacer span):
    // keep it in full mode when it is a flow child of a layout
    const spacer = o.full && o.parent?.layout && (r.width > 0 || r.height > 0);
    if ((r.width <= 0 || r.height <= 0) && !spacer) return;
    const rel = {
      x: px(r.left - base.left),
      y: px(r.top - base.top),
      w: px(r.width),
      h: px(r.height),
    };

    // a component root on a screen → an instance of the Figma variant, with text / icon / opacity
    // overrides in DOM order; the full subtree stays attached as fallback when the set is missing
    if (o.mode === 'screen' && el.dataset.cmp && !o.inCmp) {
      const sub = [];
      walk(el, base, sub, { ...o, full: true, inCmp: true });
      const root = sub[0];
      if (root) {
        out.push({
          ...root,
          type: 'instance',
          set: el.dataset.cmp,
          props: parseProps(el.dataset.cmpProps),
          texts: collect(root, 'text').map((t) => t.text),
          icons: collect(root, 'icon').map((i) => ({
            icon: i.icon,
            color: i.color,
            token: i.token,
          })),
          opacities: collect(root, 'frame')
            .filter((f) => f !== root && f.opacity != null && f.opacity < 1)
            .map((f) => ({ name: f.name, opacity: f.opacity })),
          // text colours by DOM order (a level-coloured value in a plain row) and the sizes of
          // named parts (`data-cmp-part`, e.g. the filled bar of a progress bar)
          textColors: collect(root, 'text').map((t) => ({
            color: t.font.color,
            token: t.font.token,
            alpha: t.font.alpha,
          })),
          sizes: collect(root, 'frame')
            .filter((f) => f.part)
            .map((f) => ({ name: f.name, w: f.w, h: f.h })),
        });
      }
      return;
    }

    if (el.tagName.toLowerCase() === 'svg') {
      // Sprite icons map 1:1 to the Icons v1 components in Figma → emit name + colour only;
      // the builder places a recoloured instance. Non-sprite SVGs carry their markup.
      const iconName = el.dataset.icon;
      // CSS rotation (e.g. the 45° "plus" used as close): emit the unrotated box + angle
      let rot = 0;
      let box = rel;
      const m =
        cs.transform && cs.transform !== 'none' ? cs.transform.match(/matrix\(([^)]+)\)/) : null;
      // Tailwind v4 uses the individual `rotate` property; older CSS uses a transform matrix
      if (cs.rotate && cs.rotate !== 'none') rot = px(cs.rotate);
      else if (m) {
        const [a, b] = m[1].split(',').map(parseFloat);
        rot = Math.round(((Math.atan2(b, a) * 180) / Math.PI) * 100) / 100;
      }
      {
        if (rot) {
          const w = px(cs.width),
            h = px(cs.height);
          box = { x: px(rel.x + rel.w / 2 - w / 2), y: px(rel.y + rel.h / 2 - h / 2), w, h };
        }
      }
      if (iconName)
        out.push({
          type: 'icon',
          name: `icon/${iconName}`,
          icon: iconName,
          color: cs.color,
          ...withToken(cs.color, classCandidates(el, ['text', 'stroke', 'fill'], true)),
          ...box,
          rot: rot || undefined,
          opacity,
        });
      else {
        const svg = spriteSvg(el, cs.color) ?? inlineSvg(el, cs.color);
        if (svg) out.push({ type: 'svg', name: nameOf(el), ...rel, opacity, svg });
      }
      return;
    }

    const paint = paintOf(cs, el);
    const clip =
      /hidden|auto|scroll|clip/.test(cs.overflow) || /hidden|auto|scroll/.test(cs.overflowY);
    const emit =
      o.full ||
      paint.fills.length ||
      paint.border ||
      paint.shadow ||
      clip ||
      opacity < 1 ||
      el.classList.contains('hmi');
    const painted = paint.fills.length || paint.border || paint.shadow;
    const name = el.dataset.cmp && o.inCmp && !o.parent?.inCmp ? el.dataset.cmp : nameOf(el);
    const node = emit
      ? {
          type: 'frame',
          name: !painted && !o.full && /^(div|span|p|h\d)$/.test(name) ? 'clip' : name,
          ...rel,
          opacity,
          clip,
          ...paint,
          ...flexInfo(el, cs, rel, o),
          part: el.dataset.cmpPart ? true : undefined,
          children: [],
        }
      : null;
    if (node && o.inCmp) node.inCmp = true;
    const target = node ? node.children : out;

    const before = pseudo(el, '::before', base);
    if (before) target.push(before);

    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!child.textContent.trim()) continue;
        const t = textLines(child, cs, base);
        if (!t) continue;
        target.push({
          type: 'text',
          name: t.text.slice(0, 40),
          ...t,
          font: {
            family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
            size: px(cs.fontSize),
            weight: Number(cs.fontWeight) || 400,
            lineHeight: cs.lineHeight === 'normal' ? null : px(cs.lineHeight),
            letterSpacing: cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing),
            align: cs.textAlign,
            color: cs.color,
            ...withToken(cs.color, classCandidates(el, ['text'], true)),
            italic: cs.fontStyle === 'italic',
          },
          truncate: cs.textOverflow === 'ellipsis',
          // line-clamp-n → n lines then an ellipsis; in full mode a truncating single line too
          maxLines:
            parseInt(cs.webkitLineClamp) > 0
              ? parseInt(cs.webkitLineClamp)
              : o.full && cs.textOverflow === 'ellipsis' && cs.whiteSpace === 'nowrap'
                ? 1
                : null,
          boxX: rel.x,
          boxW: rel.w,
        });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child, base, target, { ...o, parent: node ?? o.parent });
      }
    }
    const after = pseudo(el, '::after', base);
    if (after) target.push(after);
    if (node) {
      delete node.inCmp;
      out.push(node);
    }
  }

  /**
   * Component sheet (#/components): every `[data-cmp]` root that is not nested in another one,
   * serialized in full mode with its own box as origin → [{ set, props, root }].
   */
  window.__hmiSerializeComponents = function (selector = '[data-components]') {
    const host = document.querySelector(selector);
    colourIndex = null;
    const roots = [...host.querySelectorAll('[data-cmp]')].filter(
      (el) => !el.parentElement.closest('[data-cmp]'),
    );
    return roots.map((el) => {
      const b = el.getBoundingClientRect();
      const out = [];
      walk(el, b, out, { mode: 'components', full: true, inCmp: true });
      return { set: el.dataset.cmp, props: parseProps(el.dataset.cmpProps), root: out[0] };
    });
  };

  window.__hmiSerialize = function (selector = '.hmi', { full = false } = {}) {
    const root = document.querySelector(selector);
    const base = root.getBoundingClientRect();
    colourIndex = null; // theme may have changed since the last call
    const out = [];
    walk(root, base, out, { mode: 'screen', full });
    const tree = out[0];
    tree.theme = document.documentElement.dataset.theme;
    tree.orientation = document.documentElement.dataset.orientation;
    return { w: px(base.width), h: px(base.height), root: tree };
  };
})();
