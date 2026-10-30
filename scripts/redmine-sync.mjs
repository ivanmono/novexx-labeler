#!/usr/bin/env node
/**
 * Create the plan's tickets as Redmine issues (one parent issue per phase, one child per ticket / gate).
 *
 *   node scripts/redmine-sync.mjs --dry-run          print what would be created
 *   node scripts/redmine-sync.mjs                    create the issues, write "Redmine: #n" into each ticket file
 *
 * Auth: env REDMINE_API_KEY or the file .redmine-key in the repo root (git-ignored). Issues are assigned to the
 * key's owner. Idempotent: a ticket that already carries a "- Redmine: #n" line is skipped.
 * Status mapping: done → Closed, in progress → In Progress, todo/blocked → New (names looked up, first match wins).
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
const section = (md, name) => {
  const m = md.match(new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return m ? m[1].trim() : '';
};
const tickets = fs
  .readdirSync(dir)
  .filter((f) => /^(P\d-\d+[a-c]?|G\d-\d)\.md$/.test(f))
  .map((f) => {
    const md = fs.readFileSync(path.join(dir, f), 'utf8');
    const id = f.replace(/\.md$/, '');
    const title = md.match(/^# \S+\s*[-–]\s*(.+)$/m)?.[1]?.trim() ?? id;
    const meta = (k) => md.match(new RegExp(`^- ${k}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
    const phase = Number(meta('Phase') || id[1]);
    const redmine = md.match(/^- Redmine:\s*#(\d+)/m)?.[1];
    // tickets have Goal + Scope; gates have Reviewed (checklist) + How
    const goal = section(md, 'Goal') || section(md, 'How');
    const scope = section(md, 'Scope') || section(md, 'Reviewed');
    const refs = meta('Requirement refs');
    const depends = meta('Depends on');
    const gate = id.startsWith('G');
    const description = [
      goal,
      scope ? `\n*Scope*\n\n${scope}` : '',
      refs ? `\n*Requirement refs:* ${refs}` : '',
      depends ? `\n*Depends on:* ${depends}` : '',
      `\n*Ticket file:* docs/tickets/${f} in the NovexxLabelerApp repo`,
    ]
      .filter(Boolean)
      .join('\n');
    return {
      id,
      file: f,
      phase,
      gate,
      title: gate ? `${id} · Gate: ${title.replace(/^Gate:\s*/i, '')}` : `${id} · ${title}`,
      size: meta('Size').replace(/\s.*$/, ''),
      status: meta('Status').toLowerCase(),
      description,
      redmine,
    };
  })
  .sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id, 'en', { numeric: true }));

if (DRY) {
  for (const t of tickets)
    console.log(
      `${t.phase} ${t.id.padEnd(7)} ${t.status.padEnd(12)} ${t.size.padEnd(2)} ${t.title}${t.redmine ? ' (#' + t.redmine + ')' : ''}`,
    );
  console.log(`${tickets.length} tickets`);
  process.exit(0);
}

// ---- Redmine metadata ----------------------------------------------------------------------------
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
        ? [/^in progress$/i, /^in bearbeitung$/i, /^doing$/i]
        : [/^new$/i, /^neu$/i, /^to do$/i, /^open$/i];
  for (const re of want) {
    const hit = statuses.find((x) => re.test(x.name));
    if (hit) return hit;
  }
  return statuses.find((x) => !x.is_closed) ?? statuses[0];
};
console.log(
  `Redmine ${BASE} · project "${project.name}" (#${project.id}) · tracker "${tracker.name}" · assignee ${me.firstname} ${me.lastname} (#${me.id})`,
);

// ---- parents per phase (reuse an existing "Phase n" issue) --------------------------------------
// all issues of the project (paginated; the API returns newest first and caps a page at 100)
const existing = [];
for (let offset = 0; ; offset += 100) {
  const page = await api(
    'GET',
    `/projects/${PROJECT}/issues.json?status_id=*&limit=100&offset=${offset}`,
  );
  existing.push(...page.issues);
  if (existing.length >= page.total_count || page.issues.length === 0) break;
}
const parents = {};
for (const [n, name] of Object.entries(PHASES)) {
  const have = existing.find((i) => i.subject === name);
  if (have) {
    parents[n] = have.id;
    continue;
  }
  const inPhase = tickets.filter((t) => t.phase === Number(n));
  const res = await api('POST', '/issues.json', {
    issue: {
      project_id: project.id,
      tracker_id: tracker.id,
      subject: name,
      description: `Umbrella for the ${inPhase.length} tickets of this phase (see docs/PLAN.md). Children: ${inPhase.map((t) => t.id).join(', ')}.`,
      assigned_to_id: me.id,
      status_id: statusFor(
        inPhase.every((t) => t.status === 'done')
          ? 'done'
          : inPhase.some((t) => t.status !== 'todo')
            ? 'in progress'
            : 'todo',
      ).id,
    },
  });
  parents[n] = res.issue.id;
  console.log(`parent #${res.issue.id}  ${name}`);
}

// ---- children ---------------------------------------------------------------------------------
let created = 0,
  updated = 0;
for (const t of tickets) {
  const issue = {
    subject: t.title,
    description: t.description,
    status_id: statusFor(t.status).id,
    done_ratio: t.status === 'done' ? 100 : t.status === 'in progress' ? 50 : 0,
  };
  if (HOURS[t.size]) issue.estimated_hours = HOURS[t.size];
  if (t.redmine) {
    // keep an existing issue in step with the ticket file (title, description, status, estimate)
    await api('PUT', `/issues/${t.redmine}.json`, {
      issue: { ...issue, parent_issue_id: parents[t.phase] },
    });
    updated++;
    continue;
  }
  Object.assign(issue, {
    project_id: project.id,
    tracker_id: tracker.id,
    parent_issue_id: parents[t.phase],
    assigned_to_id: me.id,
  });
  const res = await api('POST', '/issues.json', { issue });
  created++;
  const file = path.join(dir, t.file);
  const md = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(
    file,
    md.replace(
      /^(- Status:.*)$/m,
      `$1\n- Redmine: #${res.issue.id} (${BASE}/issues/${res.issue.id})`,
    ),
  );
  console.log(`#${res.issue.id}  ${t.title}`);
}
console.log(
  `${created} issues created, ${updated} updated, under ${Object.keys(parents).length} phase parents`,
);
