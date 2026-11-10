/**
 * Error history (docx §8.7, plan P3-09): every error and warning the machine raises, with the role
 * logged in at that moment, in a fixed-size area that overwrites its oldest entries (FIFO).
 * Shown newest first; searchable over ID and message from the second character.
 *
 *   entry = { code, severity: 'high'|'mid'|'low', at, level, user }
 * Texts come from the catalogue by code, so they follow the language.
 */
import { ERROR_CATALOGUE } from './simulator.js';

export const ERRLOG_CAPACITY = 200;
export const SEARCH_MIN = 2;

export function appendError(list, entry, capacity = ERRLOG_CAPACITY) {
  const next = [...list, entry];
  return next.length > capacity ? next.slice(next.length - capacity) : next;
}

/** Message and help in the current language. */
export function errorText(code, lang = 'en') {
  const c = ERROR_CATALOGUE[code] ?? {};
  const de = lang === 'de';
  return { text: (de && c.textDe) || c.text || code, help: (de && c.helpDe) || c.help || '' };
}

/** Newest first; below SEARCH_MIN characters the query is ignored. */
export function searchErrors(list, query, lang = 'en') {
  const q = String(query ?? '')
    .trim()
    .toLocaleLowerCase();
  const sorted = [...list].sort((a, b) => b.at - a.at);
  if (q.length < SEARCH_MIN) return sorted;
  return sorted.filter((e) => {
    const { text } = errorText(e.code, lang);
    const code = e.code.toLocaleLowerCase();
    // "e207" finds E-207: the ID matches with or without its hyphen
    return (
      code.includes(q) ||
      code.replace(/[^a-z0-9]/g, '').includes(q.replace(/[^a-z0-9]/g, '')) ||
      text.toLocaleLowerCase().includes(q)
    );
  });
}

/** Dummy history for a fresh device: a few weeks of errors and warnings with who was logged in. */
export function seedErrors(now = Date.now()) {
  const day = 86_400_000;
  const rows = [
    ['W-020', 0.2, 1, 's.operator'],
    ['E-207', 1.1, 1, 's.operator'],
    ['E-207', 1.12, 2, 'a.supervisor'],
    ['E-031', 3.4, 0, null],
    ['W-012', 4.8, 1, 's.operator'],
    ['E-114', 4.9, 1, 's.operator'],
    ['E-402', 9.3, 3, 'm.mustermann'],
    ['E-055', 12.6, 2, 'a.supervisor'],
    ['E-114', 16.0, 1, 's.operator'],
  ];
  return rows
    .map(([code, daysAgo, level, user]) => ({
      code,
      severity: ERROR_CATALOGUE[code]?.severity ?? 'mid',
      at: Math.round(now - daysAgo * day),
      level,
      user,
    }))
    .sort((a, b) => a.at - b.at);
}
