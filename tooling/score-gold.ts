// Gold-set scorer (build spec §5.3).
//   node --experimental-strip-types tooling/score-gold.ts [--dir=../validation-plan/gold-set]
// Reads <dir>/cases.csv and every <dir>/ratings_*.csv (TEMPLATE skipped), recomputes the
// app's verdict for each case, and writes <dir>/gold-report.md:
//   rater-vs-rater weighted kappa first (when ≥2 raters), then app vs each rater —
//   exact and within-one-band agreement, dangerous errors (app 吉/大吉, rater 不用),
//   and the disagreement list — non-holdout and holdout reported separately.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { strict as assert } from 'node:assert';
import { buildChart } from '../src/engine/index.ts';
import { computeHourSummary } from '../src/calendar/hour.ts';
import type { ScoreProfile } from '../src/calendar/palace.ts';
import type { ApplicationTag } from '../src/calendar/data/patterns.ts';

const DIR = process.argv.find((a) => a.startsWith('--dir='))?.slice(6)
  ?? join(fileURLToPath(new URL('.', import.meta.url)), '../../validation-plan/gold-set');
const ORDER = ['不用', '不吉', '吉', '大吉'];   // ordinal scale for within-one and kappa
const LABEL = { prime: '大吉', good: '吉', plain: '不吉' } as const;

/** RFC-4180-ish CSV: quoted fields, doubled quotes, newlines inside quotes. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (ch === '"') q = false; else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift()!.map((h) => h.replace(/^﻿/, '').split('(')[0].trim());
  return rows.filter((r) => r.some((x) => x.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/** Weighted kappa, linear weights, over ORDER. */
function weightedKappa(a: number[], b: number[]): number {
  const k = ORDER.length, n = a.length;
  const w = (i: number, j: number) => Math.abs(i - j) / (k - 1);
  const ra = Array(k).fill(0), rb = Array(k).fill(0);
  let obs = 0;
  for (let t = 0; t < n; t++) { ra[a[t]]++; rb[b[t]]++; obs += w(a[t], b[t]); }
  let exp = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) exp += w(i, j) * ra[i] * rb[j] / n;
  return exp === 0 ? 1 : 1 - obs / exp;
}
// self-check: perfect agreement = 1; total reversal on a balanced set is negative
assert.equal(weightedKappa([0, 1, 2, 3], [0, 1, 2, 3]), 1);
assert.ok(weightedKappa([0, 0, 3, 3], [3, 3, 0, 0]) < 0);
assert.deepEqual(parseCsv('a,b\n"x, ""y""",2\n'), [{ a: 'x, "y"', b: '2' }]);

// ─── cases + app verdict ─────────────────────────────────────────────────────
const cases = parseCsv(readFileSync(join(DIR, 'cases.csv'), 'utf8'));
const app = new Map<string, { band: string; reasons: string; holdout: boolean; at: string; palace: string }>();
for (const c of cases) {
  const [, y, m, d, hh] = c.instant.match(/^(\d+)-(\d+)-(\d+)T(\d+):/)!.map(Number);
  const set = Object.fromEntries(c.settings.split(';').map((kv) => kv.split('=')));
  const chart = buildChart({ y, m, d, hh, mm: 0, method: c.method as 'zhirun' | 'chaibu',
    lateZiNextDay: set.lz !== '0', spiritVariant: set.sv === '1', tzHours: Number(set.tz ?? 8) });
  const profile: ScoreProfile = { ...(set.act && set.act !== 'general'
    ? { kind: 'purpose' as const, activity: set.act as ApplicationTag } : { kind: 'general' as const }),
    jiXingPlate: set.jx === 'tian' ? 'tian' : 'di' };
  const p = computeHourSummary(chart, profile).palaces[Number(c.palace) - 1];
  app.set(c.case_id, { band: p.blocked ? '不用' : LABEL[p.band], reasons: p.reasons.join('；'),
    holdout: c.holdout === 'holdout', at: c.instant, palace: c.palace });
}

// ─── ratings ─────────────────────────────────────────────────────────────────
const files = readdirSync(DIR).filter((f) => /^ratings_.+\.csv$/.test(f) && f !== 'ratings_TEMPLATE.csv').sort();
const raters = new Map<string, Map<string, Record<string, string>>>();
const problems: string[] = [];
for (const f of files) {
  for (const r of parseCsv(readFileSync(join(DIR, f), 'utf8'))) {
    if (!app.has(r.case_id)) { problems.push(`${f}: unknown case_id ${r.case_id}`); continue; }
    if (!ORDER.includes(r.band)) { problems.push(`${f}: ${r.case_id} band "${r.band}" not one of ${ORDER.join('|')}`); continue; }
    const code = r.rater_code || f.slice(8, -4);
    (raters.get(code) ?? raters.set(code, new Map()).get(code)!).set(r.case_id, r);
  }
}

const md: string[] = [`# Gold-set report`, '',
  `${cases.length} cases (${[...app.values()].filter((a) => a.holdout).length} holdout); raters: ${[...raters.keys()].join(', ') || 'none'} (from ${files.join(', ') || 'no ratings_*.csv'}).`,
  `Bands are ordinal ${ORDER.join(' < ')}. Weighted kappa uses linear weights.`, ''];
if (problems.length) md.push(`**Input problems (rows skipped):**`, '', ...problems.map((p) => `- ${p}`), '');

const splits: [string, (id: string) => boolean][] = [['Non-holdout', (id) => !app.get(id)!.holdout], ['Holdout', (id) => app.get(id)!.holdout]];
const codes = [...raters.keys()];

if (codes.length >= 2) {
  md.push(`## Rater vs rater (read first: if raters disagree with each other more than with the app, it is a school difference, not an app bug)`, '',
    `| Pair | split | n | weighted κ | exact % |`, `|---|---|---|---|---|`);
  for (let i = 0; i < codes.length; i++) for (let j = i + 1; j < codes.length; j++) for (const [name, keep] of splits) {
    const ids = [...raters.get(codes[i])!.keys()].filter((id) => raters.get(codes[j])!.has(id) && keep(id));
    const a = ids.map((id) => ORDER.indexOf(raters.get(codes[i])!.get(id)!.band));
    const b = ids.map((id) => ORDER.indexOf(raters.get(codes[j])!.get(id)!.band));
    const exact = a.filter((x, t) => x === b[t]).length;
    md.push(`| ${codes[i]} vs ${codes[j]} | ${name} | ${ids.length} | ${ids.length ? weightedKappa(a, b).toFixed(3) : '—'} | ${ids.length ? (100 * exact / ids.length).toFixed(1) : '—'} |`);
  }
  md.push('');
}

md.push(`## App vs each rater`, '', `| Rater | split | n | exact % | within one % | weighted κ | dangerous errors |`, `|---|---|---|---|---|---|---|`);
const dangerous: string[] = [], disagree: string[] = [];
for (const code of codes) for (const [name, keep] of splits) {
  const ids = [...raters.get(code)!.keys()].filter(keep);
  const a = ids.map((id) => ORDER.indexOf(app.get(id)!.band));
  const r = ids.map((id) => ORDER.indexOf(raters.get(code)!.get(id)!.band));
  const exact = a.filter((x, t) => x === r[t]).length;
  const near = a.filter((x, t) => Math.abs(x - r[t]) <= 1).length;
  const danger = ids.filter((id, t) => a[t] >= 2 && r[t] === 0);
  md.push(`| ${code} | ${name} | ${ids.length} | ${ids.length ? (100 * exact / ids.length).toFixed(1) : '—'} | ${ids.length ? (100 * near / ids.length).toFixed(1) : '—'} | ${ids.length ? weightedKappa(a, r).toFixed(3) : '—'} | ${danger.length} |`);
  for (const id of ids) {
    const x = app.get(id)!, y = raters.get(code)!.get(id)!;
    if (x.band === y.band) continue;
    const line = `| ${id} | ${name} | ${x.at} 宫${x.palace} | ${x.band} | ${code}: ${y.band} (conf ${y.confidence || '—'}) | ${x.reasons} | ${y.reasons} | ${y.rules_cited} |`;
    disagree.push(line);
    if (danger.includes(id)) dangerous.push(line);
  }
}
const head = `| case | split | instant / palace | app | rater | app reasons | rater reasons | rules cited |\n|---|---|---|---|---|---|---|---|`;
md.push('', `## Dangerous errors (app 吉 or 大吉, rater 不用)`, '', dangerous.length ? head + '\n' + dangerous.join('\n') : 'None.', '',
  `## Disagreements`, '', disagree.length ? head + '\n' + disagree.join('\n') : 'None.', '');
writeFileSync(join(DIR, 'gold-report.md'), md.join('\n'));
console.log(`gold-report.md: ${codes.length} rater(s), ${disagree.length} disagreement row(s), ${dangerous.length} dangerous`);
