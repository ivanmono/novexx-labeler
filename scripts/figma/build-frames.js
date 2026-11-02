/* global figma */
/**
 * Figma-side builder (runs inside the Desktop Bridge plugin via `figma_execute`).
 * Input: `CAPTURES` = [{ name, w, h, root }] produced by serialize-dom.js, `PAGE` = page name.
 * Output: one top-level frame per capture on PAGE, laid out in a row; frames with the same
 * name are replaced in place (position kept) unless they carry pluginData hmi.handEdited.
 *
 * Plain Plugin API only (no helper wrappers): set fontName before characters, async font loads.
 */
// eslint-disable-next-line no-unused-vars
async function buildFrames(CAPTURES, PAGE, { gap = 80, components = false } = {}) {
  // ---- colour parsing -------------------------------------------------------------------
  const parseColor = (s) => {
    if (!s) return null;
    let m = s.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)/);
    if (m) return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255, a: m[4] == null ? 1 : +m[4] };
    m = s.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
    m = s.match(/^#([0-9a-f]{6})$/i);
    if (m)
      return {
        r: parseInt(m[1].slice(0, 2), 16) / 255,
        g: parseInt(m[1].slice(2, 4), 16) / 255,
        b: parseInt(m[1].slice(4, 6), 16) / 255,
        a: 1,
      };
    m = s.match(/^okl(ab|ch)\(\s*([\d.]+)%?\s+(-?[\d.]+)\s+(-?[\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/);
    if (m) {
      // Tailwind's colour-mix output (bg-status-error/15 …): oklab/oklch → sRGB
      let L = +m[2],
        A = +m[3],
        B = +m[4];
      if (m[1] === 'ch') {
        const h = (B * Math.PI) / 180;
        [A, B] = [A * Math.cos(h), A * Math.sin(h)];
      }
      const l_ = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3,
        m_ = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3,
        s_ = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
      const gam = (x) =>
        Math.min(1, Math.max(0, x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055));
      return {
        r: gam(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
        g: gam(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
        b: gam(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
        a: m[5] == null ? 1 : +m[5],
      };
    }
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    return null;
  };
  const solid = (c) =>
    c && c.a > 0 ? { type: 'SOLID', color: { r: c.r, g: c.g, b: c.b }, opacity: c.a } : null;

  // split on commas that are not inside parentheses
  const splitTop = (s) => {
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
  };
  const invert = ([[a, b, c], [d, e, f]]) => {
    const det = a * e - b * d;
    return [
      [e / det, -b / det, (b * f - c * e) / det],
      [-d / det, a / det, (c * d - a * f) / det],
    ];
  };
  // `tokens[i]` (from the serializer) binds stop i to a colour/gradient/* variable
  const parseStops = (parts, tokens = []) =>
    parts.map((p, i) => {
      const m = p.match(/^(.*?)(?:\s+([\d.]+)%)?$/);
      const c = parseColor(m[1].trim()) || { r: 0, g: 0, b: 0, a: 1 };
      const pos = m[2] != null ? +m[2] / 100 : i / Math.max(1, parts.length - 1);
      const stop = { position: pos, color: { r: c.r, g: c.g, b: c.b, a: c.a } };
      const v = tokens[i] && variables.get(tokens[i]);
      if (v) stop.boundVariables = { color: { type: 'VARIABLE_ALIAS', id: v.id } };
      return stop;
    });
  const gradientPaint = (css, w, h, tokens) => {
    let m = css.match(/^linear-gradient\((.*)\)$/);
    if (m) {
      const parts = splitTop(m[1]);
      let deg = 180;
      if (/deg$/.test(parts[0])) deg = parseFloat(parts.shift());
      else if (/^to /.test(parts[0])) {
        const d = parts.shift();
        deg = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 }[d] ?? 180;
      }
      const th = (deg * Math.PI) / 180;
      const dir = { x: Math.sin(th), y: -Math.cos(th) };
      const len = Math.abs(w * dir.x) + Math.abs(h * dir.y);
      const s = { x: w / 2 - (dir.x * len) / 2, y: h / 2 - (dir.y * len) / 2 };
      const e = { x: w / 2 + (dir.x * len) / 2, y: h / 2 + (dir.y * len) / 2 };
      const sx = s.x / w,
        sy = s.y / h,
        ex = e.x / w,
        ey = e.y / h;
      const vx = ex - sx,
        vy = ey - sy;
      const M = [
        [vx, -vy, sx + 0.5 * vy],
        [vy, vx, sy - 0.5 * vx],
      ];
      return {
        type: 'GRADIENT_LINEAR',
        gradientTransform: invert(M),
        gradientStops: parseStops(parts, tokens),
      };
    }
    m = css.match(/^radial-gradient\((.*)\)$/);
    if (m) {
      const parts = splitTop(m[1]);
      let rx = 0.5,
        ry = 0.5,
        cx = 0.5,
        cy = 0.5;
      const head = parts[0];
      if (/%|at /.test(head) && !parseColor(head.split(' ')[0])) {
        parts.shift();
        const size = head.match(/^([\d.]+)%\s+([\d.]+)%/);
        if (size) {
          rx = +size[1] / 100;
          ry = +size[2] / 100;
        }
        const at = head.match(/at\s+([\d.]+)%\s+([\d.]+)%/);
        if (at) {
          cx = +at[1] / 100;
          cy = +at[2] / 100;
        }
      }
      const M = [
        [2 * rx, 0, cx - rx],
        [0, 2 * ry, cy - ry],
      ];
      return {
        type: 'GRADIENT_RADIAL',
        gradientTransform: invert(M),
        gradientStops: parseStops(parts, tokens),
      };
    }
    return null;
  };
  const shadowEffects = (css) =>
    splitTop(css)
      .map((s) => {
        const col = s.match(/(rgba?\([^)]*\)|color\([^)]*\))/);
        const nums = s
          .replace(col ? col[0] : '', '')
          .trim()
          .split(/\s+/)
          .map(parseFloat);
        const c = parseColor(col ? col[0] : 'rgba(0,0,0,0.25)');
        if (!c || c.a === 0 || nums.length < 2) return null;
        return {
          type: 'DROP_SHADOW',
          color: { r: c.r, g: c.g, b: c.b, a: c.a },
          offset: { x: nums[0], y: nums[1] },
          radius: nums[2] || 0,
          spread: nums[3] || 0,
          visible: true,
          blendMode: 'NORMAL',
        };
      })
      .filter(Boolean);

  // ---- fonts ------------------------------------------------------------------------------
  const STYLE_BY_WEIGHT = {
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'SemiBold',
    700: 'Bold',
    800: 'ExtraBold',
    900: 'Black',
  };
  const fontCache = new Map();
  async function font(family, weight, italic) {
    const key = `${family}|${weight}|${italic}`;
    if (fontCache.has(key)) return fontCache.get(key);
    const style = (STYLE_BY_WEIGHT[weight] || 'Regular') + (italic ? ' Italic' : '');
    const candidates = [
      { family, style },
      { family, style: style.replace('SemiBold', 'Semi Bold') },
      { family: 'Inter', style: style.replace('ExtraBold', 'Extra Bold') },
      { family: 'Inter', style: 'Regular' },
    ];
    for (const f of candidates) {
      try {
        await figma.loadFontAsync(f);
        fontCache.set(key, f);
        return f;
      } catch (e) {
        /* try next */
      }
    }
    throw new Error('no font');
  }

  // ---- tokens: bind Figma variables / text styles where the serializer named one -----------
  // (variables, textStyles and colourCollection are loaded in the page section below, before build runs)
  const boundSolid = (c, token, alpha) => {
    const v = token && variables.get(token);
    if (!v) return solid(c);
    const base = c || { r: 0, g: 0, b: 0, a: 1 };
    const paint = {
      type: 'SOLID',
      color: { r: base.r, g: base.g, b: base.b },
      opacity: alpha ?? 1,
    };
    return figma.variables.setBoundVariableForPaint(paint, 'color', v);
  };
  const bindRadius = (f, token) => {
    const v = variables.get(token);
    if (!v) return;
    for (const k of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'])
      f.setBoundVariable(k, v);
  };
  const SIZE_TOKEN = {
    12: 'caption',
    14: 'label',
    16: 'body-sm',
    18: 'body',
    20: 'body-lg',
    24: 'title',
    32: 'hero',
    48: 'display',
  };
  /** Exact match → HMI/* text style; otherwise bind font size and family variables (weight stays free). */
  async function applyType(t, fnt) {
    const styleName = (
      (STYLE_BY_WEIGHT[fnt.weight] || 'Regular') + (fnt.italic ? ' Italic' : '')
    ).replace(' ', '');
    const lhPct = fnt.lineHeight ? (fnt.lineHeight / fnt.size) * 100 : null;
    const lsPct = ((fnt.letterSpacing || 0) / fnt.size) * 100;
    const style = textStyles.find(
      (s) =>
        s.fontName.family === fnt.family &&
        s.fontName.style.replace(' ', '') === styleName &&
        s.fontSize === fnt.size &&
        (lhPct == null
          ? s.lineHeight.unit === 'AUTO'
          : s.lineHeight.unit === 'PERCENT' && Math.abs(s.lineHeight.value - lhPct) < 1) &&
        Math.abs((s.letterSpacing.unit === 'PERCENT' ? s.letterSpacing.value : 0) - lsPct) < 0.5,
    );
    if (style) {
      await t.setTextStyleIdAsync(style.id);
      return;
    }
    const sz = variables.get(`type/size/${SIZE_TOKEN[fnt.size]}`);
    if (sz) t.setBoundVariable('fontSize', sz);
    const fam = variables.get(
      fnt.family === 'Fira Code'
        ? 'type/family/mono'
        : fnt.family === 'Figtree'
          ? 'type/family/sans'
          : '',
    );
    if (fam) t.setBoundVariable('fontFamily', fam);
  }

  // ---- auto layout (full-mode captures: component sheet) -----------------------------------------
  const AXIS = {
    start: 'MIN',
    center: 'CENTER',
    end: 'MAX',
    between: 'SPACE_BETWEEN',
    stretch: 'MIN',
  };
  function applyLayout(f, L, w, h) {
    f.layoutMode = L.dir === 'col' ? 'VERTICAL' : 'HORIZONTAL';
    f.primaryAxisSizingMode = 'FIXED';
    f.counterAxisSizingMode = 'FIXED';
    f.itemSpacing = L.gap;
    [f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft] = L.pad;
    f.primaryAxisAlignItems = AXIS[L.justify] ?? 'MIN';
    f.counterAxisAlignItems = L.align === 'stretch' ? 'MIN' : (AXIS[L.align] ?? 'MIN');
    f.resize(Math.max(0.01, w), Math.max(0.01, h));
    // hug: the serializer saw no explicit size and no stretch/grow from the parent
    const col = L.dir === 'col';
    if (L.minH) f.minHeight = L.minH;
    if (col ? L.hugH : L.hugW) f.primaryAxisSizingMode = 'AUTO';
    if (col ? L.hugW : L.hugH) f.counterAxisSizingMode = 'AUTO';
  }
  function applyChildLayout(c, ch, ox, oy, L) {
    if (ch.abs) {
      c.layoutPositioning = 'ABSOLUTE';
      c.x = ch.x - ox;
      c.y = ch.y - oy;
      return;
    }
    if (ch.grow) c.layoutGrow = 1;
    if (ch.stretch) c.layoutAlign = 'STRETCH';
    // a text run in a stretching column fills the width (so an override wraps instead of overflowing)
    if (c.type === 'TEXT' && L.dir === 'col' && L.align === 'stretch' && !L.hugW)
      c.layoutAlign = 'STRETCH';
  }
  /** Size, paint, layout and children of a frame-like node `n` into an existing frame / component `f`. */
  async function fillFrame(f, n, ox, oy) {
    f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
    f.clipsContent = !!n.clip;
    f.opacity = n.opacity ?? 1;
    const fills = [];
    for (const p of n.fills || []) {
      if (p.kind === 'solid') {
        const s = boundSolid(parseColor(p.color), p.token, p.alpha);
        if (s) fills.push(s);
      } else if (p.kind === 'image') {
        splitTop(p.css).forEach((layer, i) => {
          const g = gradientPaint(layer, n.w, n.h, p.stops?.[i] || []);
          if (g) fills.unshift(g); // CSS lists top layer first; Figma paints last on top
        });
      }
    }
    f.fills = fills;
    const [tl, tr, br, bl] = n.radius || [0, 0, 0, 0];
    f.topLeftRadius = tl;
    f.topRightRadius = tr;
    f.bottomRightRadius = br;
    f.bottomLeftRadius = bl;
    if (n.radiusToken) bindRadius(f, n.radiusToken);
    if (n.layout) applyLayout(f, n.layout, n.w, n.h); // before borders/children: ABSOLUTE needs a layout parent
    if (n.border) {
      const [t, r, b, l] = n.border.widths;
      const tokens = n.border.tokens || [];
      const uniform = t === r && r === b && b === l;
      if (uniform) {
        const c = parseColor(n.border.colors[0]);
        if (c) {
          f.strokes = [boundSolid(c, tokens[0])];
          f.strokeWeight = t;
          f.strokeAlign = 'INSIDE';
        }
      } else {
        // per-side borders → thin rectangles (Figma has per-side weights only on frames with
        // uniform colour, and CSS mixes colours), keep it simple and visible
        const sides = [
          [t, 0, 0, n.w, t, n.border.colors[0], tokens[0]],
          [r, n.w - r, 0, r, n.h, n.border.colors[1], tokens[1]],
          [b, 0, n.h - b, n.w, b, n.border.colors[2], tokens[2]],
          [l, 0, 0, l, n.h, n.border.colors[3], tokens[3]],
        ];
        for (const [wgt, x, y, w, h, col, token] of sides) {
          if (!wgt) continue;
          const c = parseColor(col);
          if (!c || c.a === 0) continue;
          const rct = figma.createRectangle();
          f.appendChild(rct);
          rct.name = 'border';
          if (n.layout) rct.layoutPositioning = 'ABSOLUTE'; // before x/y: auto layout would move it first
          rct.x = x;
          rct.y = y;
          rct.resize(Math.max(0.01, w), Math.max(0.01, h));
          rct.fills = [boundSolid(c, token)];
        }
      }
    }
    if (n.shadow) f.effects = shadowEffects(n.shadow);
    for (const ch of n.children || []) {
      const c = await build(ch, f, n.x, n.y, n.layout);
      if (c && n.layout) applyChildLayout(c, ch, n.x, n.y, n.layout);
    }
    return f;
  }

  // ---- component instances (screen captures: `data-cmp` roots) -----------------------------------
  const variantName = (props) =>
    Object.entries(props || {})
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
  const componentFor = (set, props) =>
    componentSets.get(set)?.children.find((c) => c.name === variantName(props)) ?? null;
  async function placeInstance(n, parent, ox, oy) {
    const comp = componentFor(n.set, n.props);
    if (!comp)
      throw new Error(`no component ${n.set} / ${variantName(n.props)} — build the set first`);
    const inst = comp.createInstance();
    parent.appendChild(inst);
    inst.name = `${n.set} / ${variantName(n.props)}`;
    inst.x = n.x - ox;
    inst.y = n.y - oy;
    // size like the browser box, but keep the component's hug axes (they follow the overrides)
    const sizing = (horizontal) =>
      inst.layoutMode === 'NONE'
        ? 'FIXED'
        : (inst.layoutMode === 'HORIZONTAL') === horizontal
          ? inst.primaryAxisSizingMode
          : inst.counterAxisSizingMode;
    const hugW = sizing(true) === 'AUTO';
    const hugH = sizing(false) === 'AUTO';
    const dw = !hugW && Math.abs(inst.width - n.w) > 0.5;
    const dh = !hugH && Math.abs(inst.height - n.h) > 0.5;
    if (dw || dh) {
      inst.resize(dw ? n.w : inst.width, dh ? n.h : inst.height);
      if (hugW) inst.layoutSizingHorizontal = 'HUG';
      if (hugH) inst.layoutSizingVertical = 'HUG';
    }
    // overrides, matched in DOM order (the variant was built from the same markup);
    // one Promise.all per kind: sequential awaits of loadFontAsync / getMainComponentAsync hang the bridge
    const texts = inst.findAll((x) => x.type === 'TEXT').slice(0, (n.texts || []).length);
    const changed = texts.filter((t, i) => t.characters !== n.texts[i]);
    await Promise.all(changed.map((t) => figma.loadFontAsync(t.fontName)));
    changed.forEach((t) => {
      t.characters = n.texts[texts.indexOf(t)];
    });
    // text colour overrides (a level-coloured value in a plain row): bound token or plain colour
    (n.textColors || []).forEach((tc, i) => {
      const t = texts[i];
      if (!t || !tc) return;
      const c = parseColor(tc.color);
      const cur = Array.isArray(t.fills) && t.fills[0];
      const curVar = cur && cur.boundVariables && cur.boundVariables.color;
      const want = tc.token && variables.get(tc.token);
      const same = want
        ? !!curVar && curVar.id === want.id
        : !!c &&
          !!cur &&
          cur.type === 'SOLID' &&
          !curVar &&
          Math.abs(cur.color.r - c.r) < 0.01 &&
          Math.abs(cur.color.g - c.g) < 0.01 &&
          Math.abs(cur.color.b - c.b) < 0.01;
      if (!same && (c || want)) t.fills = [boundSolid(c, tc.token, tc.alpha)];
    });
    const icons = inst.findAll((x) => x.type === 'INSTANCE' && x.name.startsWith('icon/'));
    const nIcons = Math.min(icons.length, (n.icons || []).length);
    const mains = await Promise.all(icons.slice(0, nIcons).map((ic) => ic.getMainComponentAsync()));
    for (let i = 0; i < nIcons; i++) {
      const want = iconComponents.get(`icon/24/${n.icons[i].icon}`);
      const main = mains[i];
      if (want && main && main.id !== want.id) {
        icons[i].swapComponent(want);
        icons[i].name = `icon/${n.icons[i].icon}`;
      }
      const c = parseColor(n.icons[i].color);
      if (c) {
        const paint = boundSolid({ ...c, a: 1 }, n.icons[i].token);
        for (const v of icons[i].findAll((x) => 'strokes' in x)) {
          if (v.strokes.length) v.strokes = [paint];
          if ('fills' in v && Array.isArray(v.fills) && v.fills.length) v.fills = [paint];
        }
      }
    }
    for (const o of n.opacities || []) {
      const t = inst.findOne((x) => x.name === o.name);
      if (t) t.opacity = o.opacity;
    }
    // size overrides for named parts (`data-cmp-part`, e.g. the filled bar of a progress bar)
    for (const s of n.sizes || []) {
      const f = inst.findOne((x) => x.name === s.name);
      if (f && (Math.abs(f.width - s.w) > 0.5 || Math.abs(f.height - s.h) > 0.5))
        f.resize(Math.max(0.01, s.w), Math.max(0.01, s.h));
    }
    return inst;
  }

  // ---- node creation ------------------------------------------------------------------------
  async function build(n, parent, ox = 0, oy = 0, L = null) {
    if (n.type === 'instance') return placeInstance(n, parent, ox, oy);
    if (n.type === 'text') {
      const t = figma.createText();
      parent.appendChild(t);
      t.fontName = await font(n.font.family, n.font.weight, n.font.italic);
      t.characters = n.text;
      t.fontSize = n.font.size;
      if (n.font.lineHeight) t.lineHeight = { value: n.font.lineHeight, unit: 'PIXELS' };
      if (n.font.letterSpacing) t.letterSpacing = { value: n.font.letterSpacing, unit: 'PIXELS' };
      await applyType(t, n.font);
      const c = parseColor(n.font.color);
      if (c || n.font.token) t.fills = [boundSolid(c, n.font.token, n.font.alpha)];
      t.name = n.name;
      const align =
        { left: 'LEFT', start: 'LEFT', center: 'CENTER', right: 'RIGHT', end: 'RIGHT' }[
          n.font.align
        ] || 'LEFT';
      t.textAlignHorizontal = align;
      if (n.maxLines && !(L && L.hugW)) {
        // clamped text (line-clamp-n, or a truncating line in a component): fixed box width, auto
        // height up to n lines, ellipsis — overrides wrap and truncate like the browser
        t.textAutoResize = 'HEIGHT';
        t.x = n.boxX - ox;
        t.y = n.y - oy;
        t.resize(n.boxW, n.h);
        t.textAutoResize = 'HEIGHT';
        t.textTruncation = 'ENDING'; // before maxLines: setting truncation resets it to 1
        t.maxLines = n.maxLines;
        t.opacity = n.opacity ?? 1;
        return t;
      }
      const truncated = n.truncate && n.w > n.boxW + 0.5; // only where the browser itself cut the text
      if (n.lines > 1 || truncated) {
        t.textAutoResize = 'HEIGHT';
        t.x = (n.lines > 1 ? n.x : n.boxX) - ox;
        t.resize(n.lines > 1 ? Math.max(n.w, n.boxW || 0) : n.boxW, n.h); // multi-line: full column, Figma's Figtree is wider
        t.textAutoResize = 'HEIGHT'; // resize() resets auto-resize to NONE; multi-line must keep growing
        t.y = n.y - oy;
        if (truncated) {
          t.textAutoResize = 'NONE';
          t.resize(n.boxW, n.h);
          t.textTruncation = 'ENDING';
        }
      } else {
        t.textAutoResize = 'WIDTH_AND_HEIGHT';
        // anchor by alignment so the glyph box lands where the browser put it
        if (align === 'RIGHT') t.x = n.x + n.w - t.width - ox;
        else if (align === 'CENTER') t.x = n.x + n.w / 2 - t.width / 2 - ox;
        else t.x = n.x - ox;
        t.y = n.y + (n.h - t.height) / 2 - oy;
      }
      t.opacity = n.opacity ?? 1;
      // Figma's font metrics run a little wider than Chromium's: never let a shrink-wrapped clip box cut the glyphs
      if (
        !truncated &&
        parent.type === 'FRAME' &&
        parent.clipsContent &&
        parent.fills.length === 0 &&
        t.x + t.width > parent.width + 0.5
      )
        parent.clipsContent = false;
      return t;
    }
    if (n.type === 'icon') {
      const comp = iconComponents.get(`icon/24/${n.icon}`) || iconComponents.get('icon/24/tbd');
      if (comp) {
        const inst = comp.createInstance();
        parent.appendChild(inst);
        inst.name = n.name;
        if (Math.abs(comp.width - n.w) > 0.01) inst.rescale(n.w / comp.width); // scales stroke weight too, like the SVG
        inst.x = n.x - ox;
        inst.y = n.y - oy;
        if (n.rot) {
          const th = (-n.rot * Math.PI) / 180; // CSS rotates clockwise, Figma counter-clockwise
          inst.rotation = -n.rot;
          inst.x = n.x + n.w / 2 - ox - (n.w / 2) * Math.cos(th) - (n.h / 2) * Math.sin(th);
          inst.y = n.y + n.h / 2 - oy + (n.w / 2) * Math.sin(th) - (n.h / 2) * Math.cos(th);
        }
        inst.opacity = n.opacity ?? 1;
        const c = parseColor(n.color);
        if (c) {
          const paint = boundSolid({ ...c, a: 1 }, n.token);
          for (const v of inst.findAll((x) => 'strokes' in x)) {
            if (v.strokes.length) v.strokes = [paint];
            if ('fills' in v && Array.isArray(v.fills) && v.fills.length) v.fills = [paint];
          }
          if (c.a < 1) inst.opacity = (n.opacity ?? 1) * c.a;
        }
        return inst;
      }
      const f = figma.createFrame();
      parent.appendChild(f);
      f.name = n.name + ' (missing)';
      f.x = n.x - ox;
      f.y = n.y - oy;
      f.resize(n.w, n.h);
      f.fills = [];
      return f;
    }
    if (n.type === 'svg') {
      let g;
      try {
        g = figma.createNodeFromSvg(n.svg);
      } catch (e) {
        g = figma.createFrame();
        g.resize(n.w, n.h);
      }
      parent.appendChild(g);
      g.name = n.name;
      g.x = n.x - ox;
      g.y = n.y - oy;
      if (Math.abs(g.width - n.w) > 0.5 || Math.abs(g.height - n.h) > 0.5) g.resize(n.w, n.h);
      g.opacity = n.opacity ?? 1;
      return g;
    }
    // frame
    const f = figma.createFrame();
    parent.appendChild(f);
    f.name = n.name;
    f.x = n.x - ox;
    f.y = n.y - oy;
    return fillFrame(f, n, n.x, n.y);
  }

  // ---- component sets (page "HMI / 02 Components") --------------------------------------------------
  // One set per `data-cmp` name, one variant per props string. An existing variant is refilled in place
  // (same node id → instances on the screen frames follow); new variants join the existing set.
  async function buildComponentSets(SETS, page) {
    const bySet = new Map();
    for (const s of SETS) {
      if (!bySet.has(s.set)) bySet.set(s.set, []);
      bySet.get(s.set).push(s);
    }
    const results = [];
    let y = page.children.reduce((m, c) => Math.max(m, c.y + c.height + 80), 0);
    for (const [name, variants] of bySet) {
      let set = page.findOne((x) => x.type === 'COMPONENT_SET' && x.name === name);
      const fresh = [];
      for (const v of variants) {
        const vname = variantName(v.props);
        const root = { ...v.root, name: vname, x: 0, y: 0 };
        let comp = set?.children.find((c) => c.name === vname);
        if (comp) {
          for (const ch of [...comp.children]) ch.remove();
          await fillFrame(comp, root, 0, 0);
        } else {
          const f = await build(root, page, 0, 0);
          comp = figma.createComponentFromNode(f);
          comp.name = vname;
          fresh.push(comp);
        }
        comp.setPluginData('hmi.generated', new Date().toISOString());
      }
      if (!set) {
        set = figma.combineAsVariants(fresh, page);
        set.name = name;
        set.layoutMode = 'VERTICAL';
        set.primaryAxisSizingMode = 'AUTO';
        set.counterAxisSizingMode = 'AUTO';
        set.itemSpacing = 24;
        set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24;
        set.x = 0;
        set.y = y;
        y += set.height + 80;
      } else for (const c of fresh) set.appendChild(c);
      set.setPluginData('hmi.generated', new Date().toISOString());
      results.push({ set: name, id: set.id, variants: set.children.map((c) => c.name) });
    }
    return results;
  }

  // ---- page + placement -------------------------------------------------------------------------
  await figma.loadAllPagesAsync();
  const iconComponents = new Map();
  // the app sprite is built from the 24 px / 1.5 px set (docs/FIGMA.md, DT-01)
  const iconsPage = figma.root.children.find((p) => p.name === 'Icons v1 – 24 px');
  if (iconsPage)
    for (const c of iconsPage.findAll(
      (x) => x.type === 'COMPONENT' && x.name.startsWith('icon/24/'),
    ))
      iconComponents.set(c.name, c);
  // tokens (page "HMI / 01 Tokens"): collections HMI Colour (modes Dark/Light), HMI Radius, HMI Type; text styles HMI/*
  const variables = new Map();
  for (const v of await figma.variables.getLocalVariablesAsync()) variables.set(v.name, v);
  const colourCollection = (await figma.variables.getLocalVariableCollectionsAsync()).find(
    (c) => c.name === 'HMI Colour',
  );
  const textStyles = await figma.getLocalTextStylesAsync();
  let page = figma.root.children.find((p) => p.name === PAGE);
  if (!page) {
    page = figma.createPage();
    page.name = PAGE;
  }
  await figma.setCurrentPageAsync(page);
  // component sets for instance placement (and the target of a components build)
  const componentSets = new Map();
  const cmpPage = components
    ? page
    : figma.root.children.find((p) => p.name === 'HMI / 02 Components');
  if (cmpPage)
    for (const s of cmpPage.findAll((x) => x.type === 'COMPONENT_SET'))
      componentSets.set(s.name, s);
  if (components) return buildComponentSets(CAPTURES, page);
  const results = [];
  let cursorX = page.children.reduce((m, c) => Math.max(m, c.x + c.width + gap), 0);
  for (const cap of CAPTURES) {
    const existing = page.children.find((c) => c.name === cap.name);
    let x = cursorX,
      y = 0;
    if (existing) {
      if (existing.getPluginData('hmi.handEdited') === 'true') {
        results.push({ name: cap.name, skipped: 'hand-edited' });
        continue;
      }
      x = existing.x;
      y = existing.y;
      existing.remove();
    } else cursorX += cap.w + gap;
    const root = cap.root;
    root.name = cap.name;
    const frame = await build(root, page, -x, -y); // capture coords are absolute → page position via offset
    // the frame carries its theme as the HMI Colour mode, so a designer can flip Dark ↔ Light on the frame
    const mode = colourCollection?.modes.find(
      (m) => m.name.toLowerCase() === (root.theme || 'dark'),
    );
    if (mode) frame.setExplicitVariableModeForCollection(colourCollection, mode.modeId);
    frame.setPluginData('hmi.generated', new Date().toISOString());
    results.push({ name: cap.name, id: frame.id, x, y });
  }
  return results;
}
