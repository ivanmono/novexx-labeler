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
async function buildFrames(CAPTURES, PAGE, { gap = 80 } = {}) {
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
  const parseStops = (parts) =>
    parts.map((p, i) => {
      const m = p.match(/^(.*?)(?:\s+([\d.]+)%)?$/);
      const c = parseColor(m[1].trim()) || { r: 0, g: 0, b: 0, a: 1 };
      const pos = m[2] != null ? +m[2] / 100 : i / Math.max(1, parts.length - 1);
      return { position: pos, color: { r: c.r, g: c.g, b: c.b, a: c.a } };
    });
  const gradientPaint = (css, w, h) => {
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
        gradientStops: parseStops(parts),
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
        gradientStops: parseStops(parts),
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

  // ---- node creation ------------------------------------------------------------------------
  async function build(n, parent, ox = 0, oy = 0) {
    if (n.type === 'text') {
      const t = figma.createText();
      parent.appendChild(t);
      t.fontName = await font(n.font.family, n.font.weight, n.font.italic);
      t.characters = n.text;
      t.fontSize = n.font.size;
      if (n.font.lineHeight) t.lineHeight = { value: n.font.lineHeight, unit: 'PIXELS' };
      if (n.font.letterSpacing) t.letterSpacing = { value: n.font.letterSpacing, unit: 'PIXELS' };
      const c = parseColor(n.font.color);
      if (c) t.fills = [solid(c)];
      t.name = n.name;
      const align =
        { left: 'LEFT', start: 'LEFT', center: 'CENTER', right: 'RIGHT', end: 'RIGHT' }[
          n.font.align
        ] || 'LEFT';
      t.textAlignHorizontal = align;
      const truncated = n.truncate && n.w > n.boxW + 0.5; // only where the browser itself cut the text
      if (n.lines > 1 || truncated) {
        t.textAutoResize = 'HEIGHT';
        t.x = (n.lines > 1 ? n.x : n.boxX) - ox;
        t.resize(n.lines > 1 ? n.w : n.boxW, n.h);
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
      const comp = iconComponents.get(`icon/${n.icon}`) || iconComponents.get('icon/tbd');
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
          const paint = solid({ ...c, a: 1 });
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
    f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
    f.clipsContent = !!n.clip;
    f.opacity = n.opacity ?? 1;
    const fills = [];
    for (const p of n.fills || []) {
      if (p.kind === 'solid') {
        const s = solid(parseColor(p.color));
        if (s) fills.push(s);
      } else if (p.kind === 'image') {
        for (const layer of splitTop(p.css)) {
          const g = gradientPaint(layer, n.w, n.h);
          if (g) fills.unshift(g); // CSS lists top layer first; Figma paints last on top
        }
      }
    }
    f.fills = fills;
    const [tl, tr, br, bl] = n.radius || [0, 0, 0, 0];
    f.topLeftRadius = tl;
    f.topRightRadius = tr;
    f.bottomRightRadius = br;
    f.bottomLeftRadius = bl;
    if (n.border) {
      const [t, r, b, l] = n.border.widths;
      const uniform = t === r && r === b && b === l;
      if (uniform) {
        const c = parseColor(n.border.colors[0]);
        if (c) {
          f.strokes = [solid(c)];
          f.strokeWeight = t;
          f.strokeAlign = 'INSIDE';
        }
      } else {
        // per-side borders → thin rectangles (Figma has per-side weights only on frames with
        // uniform colour, and CSS mixes colours), keep it simple and visible
        const sides = [
          [t, 0, 0, n.w, t, n.border.colors[0]],
          [r, n.w - r, 0, r, n.h, n.border.colors[1]],
          [b, 0, n.h - b, n.w, b, n.border.colors[2]],
          [l, 0, 0, l, n.h, n.border.colors[3]],
        ];
        for (const [wgt, x, y, w, h, col] of sides) {
          if (!wgt) continue;
          const c = parseColor(col);
          if (!c || c.a === 0) continue;
          const rct = figma.createRectangle();
          f.appendChild(rct);
          rct.name = 'border';
          rct.x = x;
          rct.y = y;
          rct.resize(Math.max(0.01, w), Math.max(0.01, h));
          rct.fills = [solid(c)];
        }
      }
    }
    if (n.shadow) f.effects = shadowEffects(n.shadow);
    for (const ch of n.children || []) await build(ch, f, n.x, n.y);
    return f;
  }

  // ---- page + placement -------------------------------------------------------------------------
  await figma.loadAllPagesAsync();
  const iconComponents = new Map();
  const iconsPage = figma.root.children.find((p) => p.name === 'Icons v1');
  if (iconsPage)
    for (const c of iconsPage.findAll((x) => x.type === 'COMPONENT' && x.name.startsWith('icon/')))
      iconComponents.set(c.name, c);
  let page = figma.root.children.find((p) => p.name === PAGE);
  if (!page) {
    page = figma.createPage();
    page.name = PAGE;
  }
  await figma.setCurrentPageAsync(page);
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
    frame.setPluginData('hmi.generated', new Date().toISOString());
    results.push({ name: cap.name, id: frame.id, x, y });
  }
  return results;
}
