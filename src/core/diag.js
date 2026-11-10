/**
 * Diagnosis recording (docx §8.6, plan P3-08). While parameter 900 (Diag_Recording_Enable) is on,
 * every audit entry from ctx.log is also written to the `diag` slice — a fixed-size area that
 * overwrites its oldest entries when full (FIFO, no manual action). Switching recording off keeps
 * the list until it is overwritten or cleared.
 *
 *   diag = { since: ms|null, stoppedAt: ms|null, entries: [{ at, type, detail, level, user, … }] }
 */

/** Size of the recording area in entries (stand-in for the firmware's log file size). */
export const DIAG_CAPACITY = 300;
export const DIAG_PARAM = 900;

export const emptyDiag = () => ({ since: null, stoppedAt: null, entries: [] });

/** Append an entry, dropping the oldest when the area is full. */
export function appendDiag(diag, entry, capacity = DIAG_CAPACITY) {
  const next = [...diag.entries, entry];
  return { ...diag, entries: next.length > capacity ? next.slice(next.length - capacity) : next };
}

/** Recording switched on or off at `now`. A fresh start (after off) restarts the duration. */
export function setRecording(diag, on, now = Date.now()) {
  if (on)
    return diag.since != null && diag.stoppedAt == null
      ? diag
      : { ...diag, since: now, stoppedAt: null };
  return diag.since != null && diag.stoppedAt == null ? { ...diag, stoppedAt: now } : diag;
}

/** Empty the area; a running recording carries on from now. */
export function clearDiag(diag, now = Date.now()) {
  const running = diag.since != null && diag.stoppedAt == null;
  return { since: running ? now : null, stoppedAt: null, entries: [] };
}

/** Recording duration in ms (to now while running, to the stop otherwise). */
export function recordedFor(diag, now = Date.now()) {
  if (diag.since == null) return 0;
  return (diag.stoppedAt ?? now) - diag.since;
}

/** "2 h 14 min", "14 min", "< 1 min". */
export function fmtDuration(ms) {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return '< 1 min';
  const h = Math.floor(min / 60);
  return h ? `${h} h ${min % 60} min` : `${min} min`;
}

/** Entries as CSV (export to USB). */
export function toCsv(entries) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = entries.map((e) =>
    [new Date(e.at).toISOString(), e.type, `L${e.level ?? 0}`, e.user ?? '', e.detail]
      .map(q)
      .join(';'),
  );
  return ['time;type;level;user;detail', ...rows].join('\n');
}
