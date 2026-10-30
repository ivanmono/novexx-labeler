#!/usr/bin/env node
/**
 * Mirror the plan in Redmine as ONE issue per phase (no per-ticket issues, by request).
 *
 *   node scripts/redmine-sync.mjs --dry-run      print the six phase issues as they would be written
 *   node scripts/redmine-sync.mjs                create missing phase issues, update existing ones
 *
 * Each phase issue carries the phase's ticket table (id, title, size, status) from docs/tickets, a status derived
 * from the tickets (all done → Closed, any started → In Progress, else New), done ratio = done tickets / all,
 * estimated hours = sum of ticket sizes (S 4, M 8, L 20), and is assigned to the API key's owner.
 *
 * Auth: env REDMINE_API_KEY or the file .redmine-key in the repo root (git-ignored).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.REDMINE_URL ?? 'https://projects.mono-software.com';
const PROJECT = process.env.REDMINE_PROJECT ?? 'pid-labeler';
const DRY = process.argv.includes('--dry-run');
const key =
  process.env.REDMINE_API_KEY ??
  (fs.existsSync(path.join(ROOT, '.redmine-key'))
    ? fs.readFileSync(path.join(ROOT, '.redmine-key'), 'utf8').trim()
    : null);
if (!key && !DRY) {
  console.error('No API key: set REDMINE_API_KEY or create .redmine-key');
  process.exit(1);
}

const api = async (method, p, body) => {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'X-Redmine-API-Key': key ?? '', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null; // PUT/DELETE answer with an empty body
};

// ---- read the plan ---------------------------------------------------------------------------
const PHASES = {
  0: 'Phase 0 – Foundation and data pipeline',
  1: 'Phase 1 – Core engine and shell',
  2: 'Phase 2 – Menu and standard parameter screens',
  3: 'Phase 3 – Special screens',
  4: 'Phase 4 – Themes, layouts, languages, audits',
  5: 'Phase 5 – Spec, prototype, handover',
};
const HOURS = { S: 4, M: 8, L: 20 };
const dir = path.join(ROOT, 'docs/tickets');
const tickets = fs
  .readdirSync(dir)
  .filter((f) => /^(P\d-\d+[a-c]?|G\d-\d)\.md$/.test(f))
  .map((f) => {
    const md = fs.readFileSync(path.join(dir, f), 'utf8');
    const id = f.replace(/\.md$/, '');
    const meta = (k) => md.match(new RegExp(`^- ${k}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
    return {
      id,
      phase: Number(meta('Phase') || id[1]),
      gate: id.startsWith('G'),
      title: md.match(/^# \S+\s*[-–]\s*(.+)$/m)?.[1]?.trim() ?? id,
      size: meta('Size').replace(/\s.*$/, ''),
      status: meta('Status').toLowerCase().split('(')[0].trim() || 'todo', // "done (notes…)" → done
    };
  })
  .sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id, 'en', { numeric: true }));

const MARK = { done: '✓', 'in progress': '▶', blocked: '✕', todo: '·' };
const phaseIssue = (n) => {
  const list = tickets.filter((t) => t.phase === Number(n));
  const done = list.filter((t) => t.status === 'done').length;
  const started = list.some((t) => t.status !== 'todo');
  const hours = list.reduce((s, t) => s + (HOURS[t.size] ?? 0), 0);
  const rows = list.map(
    (t) =>
      `| ${MARK[t.status] ?? '·'} | ${t.id} | ${t.gate ? '*' + t.title + '*' : t.title} | ${t.size || '–'} | ${t.status} |`,
  );
  const description = [
    `Tickets of this phase as tracked in the repo (docs/tickets/*.md, docs/PLAN.md). ${done} of ${list.length} done.`,
    '',
    '| | ID | Ticket | Size | Status |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    'Sizes: S ≤ ½ day, M ≈ 1 day, L 2–3 days. Gates are review checkpoints with the client/designer.',
    'Figma: https://www.figma.com/design/kNEZtQrnGyteWqDZIi0JAf/Novexx-Presentations',
  ].join('\n');
  return {
    subject: PHASES[n],
    description,
    statusKey: done === list.length ? 'done' : started ? 'in progress' : 'todo',
    done_ratio: Math.round((done / list.length) * 100),
    estimated_hours: hours,
    count: list.length,
  };
};

if (DRY) {
  for (const n of Object.keys(PHASES)) {
    const p = phaseIssue(n);
    console.log(
      `\n${p.subject}  [${p.statusKey}, ${p.done_ratio} %, ${p.estimated_hours} h, ${p.count} tickets]\n${p.description}`,
    );
  }
  process.exit(0);
}

// ---- Redmine ------------------------------------------------------------------------------------
const me = (await api('GET', '/users/current.json')).user;
const project = (await api('GET', `/projects/${PROJECT}.json?include=trackers`)).project;
const trackers = project.trackers ?? (await api('GET', '/trackers.json')).trackers;
const tracker =
  trackers.find((t) => /^task$/i.test(t.name)) ??
  trackers.find((t) => /feature|aufgabe/i.test(t.name)) ??
  trackers[0];
const statuses = (await api('GET', '/issue_statuses.json')).issue_statuses;
const statusFor = (s) => {
  const want =
    s === 'done'
      ? [/^closed$/i, /^resolved$/i, /^done$/i]
      : s === 'in progress'
        ? [/^in progress$/i, /^doing$/i]
        : [/^new$/i, /^to do$/i, /^open$/i];
  for (const re of want) {
    const hit = statuses.find((x) => re.test(x.name));
    if (hit) return hit;
  }
  return statuses.find((x) => !x.is_closed) ?? statuses[0];
};
console.log(
  `Redmine ${BASE} · project "${project.name}" (#${project.id}) · tracker "${tracker.name}" · assignee ${me.firstname} ${me.lastname} (#${me.id})`,
);

// all issues of the project (paginated; newest first, 100 per page)
const existing = [];
for (let offset = 0; ; offset += 100) {
  const page = await api(
    'GET',
    `/projects/${PROJECT}/issues.json?status_id=*&limit=100&offset=${offset}`,
  );
  existing.push(...page.issues);
  if (existing.length >= page.total_count || page.issues.length === 0) break;
}

for (const n of Object.keys(PHASES)) {
  const p = phaseIssue(n);
  const issue = {
    subject: p.subject,
    description: p.description,
    status_id: statusFor(p.statusKey).id,
    done_ratio: p.done_ratio,
    estimated_hours: p.estimated_hours,
    assigned_to_id: me.id,
  };
  const have = existing.find((i) => i.subject === p.subject);
  if (have) {
    await api('PUT', `/issues/${have.id}.json`, { issue });
    console.log(`updated #${have.id}  ${p.subject}  (${p.statusKey}, ${p.done_ratio} %)`);
  } else {
    const res = await api('POST', '/issues.json', {
      issue: { ...issue, project_id: project.id, tracker_id: tracker.id },
    });
    console.log(`created #${res.issue.id}  ${p.subject}`);
  }
}
