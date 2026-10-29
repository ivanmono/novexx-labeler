/**
 * Access levels (docx §4.1):
 *   0 not logged in · 1 user · 2 supervisor · 3 admin · 4 secure access (time-limited)
 * A parameter the user may not read is not shown at all; readable but not writable shows a lock.
 */
export const LEVELS = {
  0: { key: 'L0', nameKey: 'level.0' },
  1: { key: 'L1', nameKey: 'level.1' },
  2: { key: 'L2', nameKey: 'level.2' },
  3: { key: 'L3', nameKey: 'level.3' },
  4: { key: 'L4', nameKey: 'level.4' },
};

const num = (v) => (typeof v === 'number' ? v : null);

/** Can this level see the parameter row at all? Runtime params (read 'X') are never listed. */
export function canReadParam(param, level) {
  if (param.accessRead === 'X') return false;
  const need = num(param.accessRead);
  if (need == null) return level >= 1; // unspecified: any logged-in level
  return level >= need;
}

/** Can this level change the parameter? */
export function canWriteParam(param, level) {
  if (!param.editable) return false;
  if (param.accessWrite === 'X' || param.accessWrite == null) return false;
  return level >= param.accessWrite;
}

/** Level required to write (for the "needs level n" toast), or null if never writable. */
export function writeLevel(param) {
  if (!param.editable || param.accessWrite === 'X' || param.accessWrite == null) return null;
  return param.accessWrite;
}

/**
 * Can this level open a tree node? Rules:
 *  - explicit `accessRead` on the node wins (masks from overrides.json; securecode = 0)
 *  - everything else needs level ≥ 1 (docx §4.1: level 0 has no access to the menu)
 *  - a list screen whose rows are all unreadable is treated as closed
 */
export function canOpenNode(node, level, paramsById) {
  if (node.accessRead != null) return level >= node.accessRead;
  if (level < 1) return false;
  if (node.kind === 'list' && paramsById && node.items?.length) {
    const readable = node.items.some((it) => it.pid != null && paramsById.get(it.pid) && canReadParam(paramsById.get(it.pid), level));
    return readable;
  }
  return true;
}

/** Can this level perform the node's primary action (load format, force IO, …)? */
export function canActNode(node, level) {
  if (node.accessAction != null) return level >= node.accessAction;
  return level >= 1;
}

/** Levels a creator may grant to a new user (docx §8.13): up to their own, never 4. */
export function grantableLevels(level) {
  return [1, 2, 3].filter((l) => l <= level);
}
