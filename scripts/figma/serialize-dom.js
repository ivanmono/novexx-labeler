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

  function nameOf(el) {
    const d = el.dataset || {};
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

  function paintOf(cs) {
    const fills = [];
    if (!isTransparent(cs.backgroundColor))
      fills.push({ kind: 'solid', color: cs.backgroundColor });
    if (cs.backgroundImage && cs.backgroundImage !== 'none')
      fills.push({ kind: 'image', css: cs.backgroundImage });
    const bw = ['Top', 'Right', 'Bottom', 'Left'].map((s) => px(cs[`border${s}Width`]));
    const bc = ['Top', 'Right', 'Bottom', 'Left'].map((s) => cs[`border${s}Color`]);
    const border = bw.some((w) => w > 0) ? { widths: bw, colors: bc } : null;
    const radius = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((c) =>
      px(cs[`border${c}Radius`]),
    );
    const shadow = cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : null;
    return { fills, border, radius, shadow };
  }

  function pseudo(el, which, base) {
    const cs = getComputedStyle(el, which);
    if (!cs || cs.content === 'none' || cs.display === 'none') return null;
    const paint = paintOf(cs);
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

  function walk(el, base, out) {
    if (el.id === 'dev-panel' || el.hasAttribute('data-sprite')) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const opacity = px(cs.opacity);
    if (opacity === 0) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const rel = {
      x: px(r.left - base.left),
      y: px(r.top - base.top),
      w: px(r.width),
      h: px(r.height),
    };

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
          ...box,
          rot: rot || undefined,
          opacity,
        });
      else {
        const svg = spriteSvg(el, cs.color);
        if (svg) out.push({ type: 'svg', name: nameOf(el), ...rel, opacity, svg });
      }
      return;
    }

    const paint = paintOf(cs);
    const clip =
      /hidden|auto|scroll|clip/.test(cs.overflow) || /hidden|auto|scroll/.test(cs.overflowY);
    const emit =
      paint.fills.length ||
      paint.border ||
      paint.shadow ||
      clip ||
      opacity < 1 ||
      el.classList.contains('hmi');
    const painted = paint.fills.length || paint.border || paint.shadow;
    const name = nameOf(el);
    const node = emit
      ? {
          type: 'frame',
          name: !painted && /^(div|span|p|h\d)$/.test(name) ? 'clip' : name,
          ...rel,
          opacity,
          clip,
          ...paint,
          children: [],
        }
      : null;
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
            italic: cs.fontStyle === 'italic',
          },
          truncate: cs.textOverflow === 'ellipsis',
          boxX: rel.x,
          boxW: rel.w,
        });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child, base, target);
      }
    }
    const after = pseudo(el, '::after', base);
    if (after) target.push(after);
    if (node) out.push(node);
  }

  window.__hmiSerialize = function (selector = '.hmi') {
    const root = document.querySelector(selector);
    const base = root.getBoundingClientRect();
    const out = [];
    walk(root, base, out);
    const tree = out[0];
    tree.theme = document.documentElement.dataset.theme;
    tree.orientation = document.documentElement.dataset.orientation;
    return { w: px(base.width), h: px(base.height), root: tree };
  };
})();
