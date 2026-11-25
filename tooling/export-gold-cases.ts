// Gold-set export (build spec §5.3).
//   node --experimental-strip-types tooling/export-gold-cases.ts [--base=https://…/] [--out=dir]
// Writes <out>/cases.csv (default ../validation-plan/gold-set): ~100 (hour × palace) cases,
// stratified as in the validation plan's Phase 5 — each ladder rung, each block reason,
// each demotion, 伏吟/反吟 hours, and the top and bottom search results for four 用事.
// The app's own verdict is NOT written here (raters must not see it); score-gold.ts
// recomputes it from instant + settings + palace. Deterministic (seeded).
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { buildChart } from '../src/engine/index.ts';
import { computeHourSummary } from '../src/calendar/hour.ts';
import { searchRange } from '../src/calendar/search.ts';
import { HOUR_SAMPLE } from '../src/calendar/summary.ts';
import type { PalaceScore } from '../src/calendar/palace.ts';
import type { ApplicationTag } from '../src/calendar/data/patterns.ts';

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const BASE = arg('base', 'http://localhost:5173/');
const OUT = arg('out', join(fileURLToPath(new URL('.', import.meta.url)), '../../validation-plan/gold-set'));
const TZ = 8;
const pad = (n: number) => String(n).padStart(2, '0');

let seed = 20261125;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const shuffle = <T,>(xs: T[]) => { for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } return xs; };

interface Case { y: number; m: number; d: number; bi: number; method: 'zhirun' | 'chaibu'; act: ApplicationTag | null; palace: number }
const pools = new Map<string, Case[]>();
const add = (stratum: string, c: Case) => (pools.get(stratum) ?? pools.set(stratum, []).get(stratum)!).push(c);

function blockLabels(p: PalaceScore): string[] {
  const r = p.reasons[0] ?? '';
  return r.startsWith('五不遇时') ? ['五不遇时'] : r.replace(/^不可用 — /, '').split('、');
}
const DEMOTIONS = ['门迫', '空亡', '吉门逢休囚', '伏吟 —', '反吟 —', '门反吟', '见凶格'];

// 1 in 3 days of 2026, both methods, general mode
for (const method of ['zhirun', 'chaibu'] as const) {
  for (let dt = new Date(2026, 0, 1); dt.getFullYear() === 2026; dt.setDate(dt.getDate() + 3)) {
    const [y, m, d] = [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];
    for (let bi = 0; bi < 12; bi++) {
      const chart = buildChart({ y, m, d, hh: HOUR_SAMPLE[bi], mm: 0, method, lateZiNextDay: true, tzHours: TZ });
      const hs = computeHourSummary(chart);
      for (const p of hs.palaces) {
        if (p.palace === 5) continue;
        const c: Case = { y, m, d, bi, method, act: null, palace: p.palace };
        if (p.blocked) { for (const b of blockLabels(p)) add(`block:${b}`, c); continue; }
        add(`rung:${p.rung}/${p.band}`, c);
        for (const dm of DEMOTIONS) if (p.reasons.some((r) => r.startsWith(dm))) add(`demote:${dm}`, c);
        if (hs.chartWarnings.includes('伏吟') && chart.pillars.hour.name[0] === '甲') add('伏吟:天显时', c);
      }
    }
  }
}

const picked: { c: Case; stratum: string }[] = [];
const seen = new Set<string>();
const keyOf = (c: Case) => `${c.method}|${c.act}|${c.y}-${c.m}-${c.d}|${c.bi}|${c.palace}`;
const take = (stratum: string, n: number) => {
  for (const c of shuffle([...(pools.get(stratum) ?? [])])) {
    if (n <= 0) break;
    if (seen.has(keyOf(c))) continue;
    seen.add(keyOf(c)); picked.push({ c, stratum }); n--;
  }
};
const strata = [...pools.keys()].sort();
for (const s of strata.filter((s) => s.startsWith('rung:'))) take(s, 3);
for (const s of strata.filter((s) => s.startsWith('block:'))) take(s, 2);
for (const s of strata.filter((s) => s.startsWith('demote:'))) take(s, 2);
take('伏吟:天显时', 2);

// top 2 and bottom 1 usable search results, 90 days from 2026-12-01, four 用事
for (const act of ['launch', 'contract', 'wealth', 'travel'] as ApplicationTag[]) {
  const slots = searchRange({ start: { y: 2026, m: 12, d: 1 }, days: 90, mode: 'recommended', activity: act,
    options: { method: 'zhirun', lateZiNextDay: true, tzHours: TZ }, limit: 9999 }).slots.filter((s) => !s.blocked && s.direction);
  const PAL: Record<string, number> = { N: 1, SW: 2, E: 3, SE: 4, NW: 6, W: 7, NE: 8, S: 9 };
  for (const [s, tag] of [[slots[0], 'top'], [slots[1], 'top'], [slots[slots.length - 1], 'bottom']] as const) {
    const c: Case = { y: s.y, m: s.m, d: s.d, bi: s.branchIndex, method: 'zhirun', act, palace: PAL[s.direction!] };
    if (!seen.has(keyOf(c))) { seen.add(keyOf(c)); picked.push({ c, stratum: `search:${act}:${tag}` }); }
  }
}

// rows in random order (case ids must not hint at the stratum); 25% holdout
shuffle(picked);
const order = shuffle(picked.map((_, i) => i));
const holdout = new Set(order.slice(0, Math.round(picked.length / 4)));
const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const rows = picked.map(({ c }, i) => {
  const date = `${c.y}-${pad(c.m)}-${pad(c.d)}`;
  const settings = [`act=${c.act ?? 'general'}`, 'lz=1', 'sv=0', 'jx=di', `tz=${TZ}`].join(';');
  const link = `${BASE}?ym=${c.y}-${pad(c.m)}&d=${date}&h=${c.bi}${c.method === 'chaibu' ? '&mtd=chaibu' : ''}${c.act ? `&act=${c.act}` : ''}&tz=${TZ}&blind=1`;
  return [`G${String(i + 1).padStart(3, '0')}`, `${date}T${pad(HOUR_SAMPLE[c.bi])}:00+${pad(TZ)}:00`, c.method, settings,
    String(c.palace), link, holdout.has(i) ? 'holdout' : ''].map(q).join(',');
});
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'cases.csv'), ['case_id,instant,method,settings,palace,blind_link,holdout', ...rows].join('\n') + '\n');
writeFileSync(join(OUT, 'ratings_TEMPLATE.csv'),
  'case_id,rater_code,band(大吉|吉|不吉|不用),direction,confidence(1-3),reasons,rules_cited\n');
console.log(`wrote ${rows.length} cases (${holdout.size} holdout) from ${strata.length} strata to ${OUT}`);
const missing = strata.filter((s) => !picked.some((p) => p.stratum === s));
if (missing.length) console.warn('WARN strata with no case:', missing.join(', '));
