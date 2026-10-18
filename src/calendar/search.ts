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
import { scoreBand, SCORE_GOOD } from './bandsV2.ts';
import type { Band, ScoreProfile } from './palace.ts';
import type { Direction } from './direction.ts';
import { HOUR_SAMPLE, type CalendarOptions } from './summary.ts';
import { ACTIVITY_PRESETS, type ActivityPreset } from './data/presets.ts';
import type { ApplicationTag, Tier } from './data/patterns.ts';

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
  /** best direction's score + display band — what the board shows for this 时辰 */
  score: number; band: Band; direction: Direction | null; blocked: boolean;
  formations: { id: string; name: string; tier: Tier }[];
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

/** Best usable direction of an hour (中5 and blocked cells skipped), by score. */
function bestDirection(hs: HourSummary): { score: number; direction: Direction | null } | null {
  if (hs.chartBlocked) return null;
  let best: { score: number; direction: Direction | null } | null = null;
  for (const ps of hs.palaces) {
    if (ps.palace === 5 || ps.blocked) continue;
    if (!best || ps.score > best.score) best = { score: ps.score, direction: ps.direction };
  }
  return best;
}

export function searchRange(q: SearchQuery): SearchResult {
  const opts = q.options ?? {};
  const hours = q.hours ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const preset = q.mode === 'recommended' && q.activity ? ACTIVITY_PRESETS[q.activity] : null;
  const profile: ScoreProfile = preset ? { kind: 'purpose', activity: q.activity! } : { kind: 'general' };

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
      const byId = new Map<string, { id: string; name: string; tier: Tier }>();
      for (const ps of hs.palaces) for (const f of ps.matched) byId.set(f.id, { id: f.id, name: f.name, tier: f.tier });
      for (const f of evaluateChart(chart)) if (f.scope === 'chart') byId.set(f.id, { id: f.id, name: f.name, tier: f.tier });
      const matchedIds = new Set(byId.keys());

      const best = bestDirection(hs);
      const blocked = best == null;
      const score = best?.score ?? 0;
      const warnings = hs.chartWarnings;

      let excluded = blocked;
      if (preset) {
        if (preset.excludeFormations.some((id) => matchedIds.has(id))) excluded = true;
        if (preset.excludeWarnings.some((w) => warnings.includes(w))) excluded = true;
      }

      if (!passesMode(q, warnings, matchedIds, blocked, excluded, score)) continue;

      ranked.push({
        rank: blocked ? -Infinity : score + roleBonus(warnings, q.role, preset),
        slot: {
          y, m, d, hh, branchIndex: bi,
          dayGanzhi: chart.pillars.day.name, hourGanzhi: chart.pillars.hour.name,
          score, band: scoreBand(score, blocked), direction: best?.direction ?? null, blocked,
          formations: [...byId.values()],
          warnings,
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
  blocked: boolean,
  excluded: boolean,
  score: number,
): boolean {
  // 时干入墓 is a strong default-exclude: hide unless the slot still reaches 吉 —
  // the registry's "不一定都凶" allowance. (五不遇时 blocks the whole hour in v2.)
  const tomb = warnings.includes('时干入墓');

  switch (q.mode) {
    case 'recommended':
      return !excluded && !(tomb && score < SCORE_GOOD);

    case 'by-formation':
      // every occurrence of the chosen 格局 (blocked ones still shown, ranked last)
      return q.formationId != null && matchedIds.has(q.formationId);

    case 'filter': {
      if (blocked) return false;
      const f = q.filters ?? {};
      if (f.require && !f.require.every((id) => matchedIds.has(id))) return false;
      if (f.avoid && f.avoid.some((x) => matchedIds.has(x) || warnings.includes(x))) return false;
      if (f.minScore != null && score < f.minScore) return false;
      if (!f.allowWuBuYu && tomb) return false;
      return true;
    }
    default:
      return false;
  }
}
