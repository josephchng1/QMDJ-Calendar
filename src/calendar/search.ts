// ─────────────────────────────────────────────────────────────────────────────
// searchRange — the 择日择时 search (§4.1, §10.1). Sweeps a date range × 时辰 and
// ranks slots by quality, in three modes:
//   • recommended       — best slots for a chosen 用事 (activity preset)
//   • by-formation      — every occurrence of a chosen 格局
//   • filter            — require / avoid formations + score threshold
//
// Scored with the SAME v2 model the day panel draws (hour.ts → palace.ts): a
// slot's score and band are its best direction's, so the grade a search row shows
// is the grade the board shows when that slot is opened. 用事 is applied through
// the purpose profile (用神 + preset boosts), exactly as the panel's 用事 picker.
// ─────────────────────────────────────────────────────────────────────────────
import { buildChart } from '../engine/index.ts';
import { computeHourSummary, type HourSummary } from './hour.ts';
import { evaluateChart } from './evaluator.ts';
import { scoreBand } from './bandsV2.ts';
import type { Band, ScoreProfile, GradedFormation, PalaceScore } from './palace.ts';
import type { Direction } from './direction.ts';
import { HOUR_SAMPLE, type CalendarOptions } from './summary.ts';
import { ACTIVITY_PRESETS, type ActivityPreset } from './data/presets.ts';
import { PATTERNS_BY_ID, type ApplicationTag } from './data/patterns.ts';

export type SearchMode = 'recommended' | 'by-formation' | 'filter';

export interface SearchQuery {
  start: { y: number; m: number; d: number };
  days: number;                 // range length (e.g. 30 / 60 / 90 / 180)
  hours?: number[];             // 时辰 branch indices 0..11; default all 12
  mode: SearchMode;
  activity?: ApplicationTag;    // recommended
  formationId?: string;         // by-formation
  filters?: {
    require?: string[];         // formation ids that must be present
    avoid?: string[];           // formation ids OR warning labels that must be absent
    minScore?: number;          // on the v2 direction score (吉 ≥ SCORE_GOOD, 大吉 ≥ SCORE_PRIME)
    allowWuBuYu?: boolean;      // surface 时干入墓 slots (default: hide); 五不遇时 is always blocked
  };
  role?: 'host' | 'mover';      // 主/客 for competition/travel
  options?: CalendarOptions;
  limit?: number;               // max results (default 80)
}

export interface SlotResult {
  y: number; m: number; d: number; hh: number; branchIndex: number;
  dayGanzhi: string; hourGanzhi: string;
  /** best usable direction's score + display band — what the board shows for this 时辰.
   *  blocked ⇒ 不用 (ranked last); direction is null only when the whole 时辰 is 不用. */
  score: number; band: Band; direction: Direction | null; blocked: boolean;
  /** 上格/下格 labels exactly as the board shows them: chart-scope + this direction's palace */
  grades: GradedFormation[];
  /** what affects this hour at this direction: chart-wide (伏吟/反吟 …) + this palace's (空亡/门迫 …) */
  warnings: string[];
}

export interface SearchResult {
  slots: SlotResult[];
  scanned: number;
}

const ROLE_BONUS = 15;   // ranking tie-break only — never added to the shown score

function addDays(s: { y: number; m: number; d: number }, off: number) {
  const dt = new Date(s.y, s.m - 1, s.d + off);
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

function roleBonus(warnings: string[], role: SearchQuery['role'], preset: ActivityPreset | null): number {
  if (!preset?.roleAware || !role) return 0;
  if (role === 'host' && warnings.includes('伏吟')) return ROLE_BONUS;   // 伏吟利主
  if (role === 'mover' && warnings.includes('反吟')) return ROLE_BONUS;  // 反吟利客
  return 0;
}

/** The palace a row shows: when the query names palace-scope 格局, the palaces holding
 *  them all (so the row's direction is where the searched 格局 sits), else every outer
 *  palace; the best usable one by score (not blocked, holding none of `avoid` — the
 *  用事's 忌格). If none is usable, the 格局's palace (shown as 不用), or null when the
 *  whole 时辰 is 不用 with no particular direction. */
function bestPalace(hs: HourSummary, want: string[], avoid: string[]): PalaceScore | null {
  const outer = hs.palaces.filter((ps) => ps.palace !== 5);
  const holding = want.length ? outer.filter((ps) => want.every((id) => ps.matched.some((m) => m.id === id))) : [];
  const usable = (holding.length ? holding : outer)
    .filter((ps) => !ps.blocked && !ps.matched.some((m) => avoid.includes(m.id)));
  if (!usable.length) return holding[0] ?? null;
  return usable.reduce((a, b) => (b.score > a.score ? b : a));
}

export function searchRange(q: SearchQuery): SearchResult {
  const opts = q.options ?? {};
  const hours = q.hours ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const preset = q.mode === 'recommended' && q.activity ? ACTIVITY_PRESETS[q.activity] : null;
  const profile: ScoreProfile = preset ? { kind: 'purpose', activity: q.activity! } : { kind: 'general' };
  const want = (q.mode === 'by-formation' ? [q.formationId ?? ''] : q.mode === 'filter' ? q.filters?.require ?? [] : [])
    .filter((id) => PATTERNS_BY_ID[id]?.scope === 'palace');

  const ranked: { slot: SlotResult; rank: number }[] = [];
  let scanned = 0;

  for (let off = 0; off < q.days; off++) {
    const { y, m, d } = addDays(q.start, off);
    for (const bi of hours) {
      const hh = HOUR_SAMPLE[bi];
      const chart = buildChart({ y, m, d, hh, mm: 0, ...opts });
      const hs = computeHourSummary(chart, profile);
      scanned++;

      // Palace formations as the scorer reconciled them, plus chart-scope ones (天显时格 …).
      const matchedIds = new Set<string>();
      for (const ps of hs.palaces) for (const f of ps.matched) matchedIds.add(f.id);
      for (const f of evaluateChart(chart)) if (f.scope === 'chart') matchedIds.add(f.id);

      // 不用 slots are still listed, ranked after everything else: 五不遇时, every candidate
      // palace blocked or holding a 忌格 of this 用事, or a 用事-excluded 伏吟/反吟 (hour-wide).
      const warnings = hs.chartWarnings;
      const best = bestPalace(hs, want, preset?.excludeFormations ?? []);
      const blocked = !best || best.blocked || best.matched.some((m) => preset?.excludeFormations.includes(m.id))
        || !!preset?.excludeWarnings.some((w) => warnings.includes(w));
      const score = blocked ? 0 : best.score;

      if (!passesMode(q, warnings, matchedIds, score)) continue;

      ranked.push({
        rank: blocked ? -Infinity : score + roleBonus(warnings, q.role, preset),
        slot: {
          y, m, d, hh, branchIndex: bi,
          dayGanzhi: chart.pillars.day.name, hourGanzhi: chart.pillars.hour.name,
          score, band: scoreBand(score, blocked), direction: best?.direction ?? null, blocked,
          grades: [...hs.chartGrades, ...(best?.grades ?? [])],
          warnings: [...new Set([...warnings, ...(best?.warnings ?? [])])],
        },
      });
    }
  }

  ranked.sort((a, b) => b.rank - a.rank);
  return { slots: ranked.slice(0, q.limit ?? 80).map((r) => r.slot), scanned };
}

function passesMode(
  q: SearchQuery,
  warnings: string[],
  matchedIds: Set<string>,
  score: number,
): boolean {
  // 不吉 / 不用 slots are not hidden — they simply rank low (by score; 不用 last).
  const tomb = warnings.includes('时干入墓');

  switch (q.mode) {
    case 'recommended':
      return true;

    case 'by-formation':
      // every occurrence of the chosen 格局
      return q.formationId != null && matchedIds.has(q.formationId);

    case 'filter': {
      const f = q.filters ?? {};
      if (f.require && !f.require.every((id) => matchedIds.has(id))) return false;
      if (f.avoid && f.avoid.some((x) => matchedIds.has(x) || warnings.includes(x))) return false;
      if (f.minScore && score < f.minScore) return false;   // 0 = no threshold
      if (!f.allowWuBuYu && tomb) return false;
      return true;
    }
    default:
      return false;
  }
}
