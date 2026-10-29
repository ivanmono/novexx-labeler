/**
 * Show-condition parser and evaluator for the parameter list.
 *
 * Grammar (Excel column "Show Condition", cell comment: "& = AND, ; = OR"):
 *
 *   expr   := term (';' term)*          -- OR, lowest precedence
 *   term   := group ('&' group)*        -- AND
 *   group  := '{' atom (';' atom)* '}'  -- OR inside one brace group
 *   atom   := id                        -- boolean parameter is true
 *           | id '=' value
 *           | id '!=' value
 *           | id '>' number
 *           | id '<' number
 *
 * Examples from the data:
 *   {118=119}                               SpeedFixed
 *   {118=120};{118=121}                     encoder rows
 *   {148=149;148=150}&{146}                 OR inside a group, AND between groups
 *   {303=305}&{307=309};{255=257}&{307=309} (A AND B) OR (C AND B)
 *   {303=305}&{313!=314}                    not-equal
 *   {173>1}                                 greater-than
 *
 * The clickdummy's parser ignored `!=` and got the `&`/`;` precedence wrong; this one is
 * covered by tests/unit/conditions.test.js.
 */

const ATOM_RE = /^\s*(\d+)\s*(?:(!=|=|>|<)\s*(-?[\w.]+))?\s*$/;

/** @typedef {{ id: string, op: '' | '=' | '!=' | '>' | '<', value: string | null }} Atom */

/**
 * Parse a condition string into an OR-of-AND-of-OR structure.
 * @param {string | null | undefined} cond
 * @returns {Atom[][][] | null}  null means "no condition" (always shown)
 */
export function parseCondition(cond) {
  if (cond == null) return null;
  const src = String(cond).trim();
  if (!src) return null;

  const orTerms = splitTopLevel(src, ';').map((term) =>
    splitTopLevel(term, '&').map((group) => {
      const m = group.trim().match(/^\{(.*)\}$/s);
      if (!m) throw new SyntaxError(`Condition group must be wrapped in braces: "${group}" in "${src}"`);
      return m[1].split(';').map(parseAtom);
    }),
  );
  return orTerms;
}

/** Split on a separator that appears outside of braces. */
function splitTopLevel(src, sep) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of src) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (ch === sep && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.filter((p) => p.trim() !== '');
}

/** @returns {Atom} */
function parseAtom(text) {
  const m = text.match(ATOM_RE);
  if (!m) throw new SyntaxError(`Cannot parse condition atom "${text}"`);
  return { id: m[1], op: /** @type {Atom['op']} */ (m[2] ?? ''), value: m[3] ?? null };
}

/**
 * Evaluate a parsed condition.
 * @param {Atom[][][] | null} parsed
 * @param {(id: string) => unknown} getValue  returns the current value of a parameter
 */
export function evalCondition(parsed, getValue) {
  if (parsed == null) return true;
  return parsed.some((andGroups) =>
    andGroups.every((orAtoms) => orAtoms.some((atom) => evalAtom(atom, getValue))),
  );
}

function evalAtom(atom, getValue) {
  const v = getValue(atom.id);
  switch (atom.op) {
    case '':
      return v === true || v === 1 || v === '1' || v === 'true';
    case '=':
      return String(v) === String(atom.value);
    case '!=':
      return String(v) !== String(atom.value);
    case '>':
      return Number(v) > Number(atom.value);
    case '<':
      return Number(v) < Number(atom.value);
    default:
      return false;
  }
}

/** Every parameter id a condition refers to (for dependency tracking and validation). */
export function conditionRefs(parsed) {
  if (parsed == null) return [];
  const ids = new Set();
  for (const and of parsed) for (const or of and) for (const atom of or) ids.add(atom.id);
  return [...ids];
}

/** Convenience: parse + evaluate in one call (parsing is cheap; callers may cache). */
export function isShown(cond, getValue) {
  return evalCondition(parseCondition(cond), getValue);
}
