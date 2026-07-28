// ─────────────────────────────────────────────────────────────────────────────
// searchRange — the 择日择时 search (§4.1, §10.1). Sweeps a date range × 时辰 and
// ranks slots by quality, in three modes:
//   • recommended       — best slots for a chosen 用事 (activity preset)
//   • by-formation      — every occurrence of a chosen 格局
//   • filter            — require / avoid formations + score threshold
//
// Cost-ordered per slot: build chart → base 格局 score (scoring.ts) → activity
// boost/exclude → mode gate → rank. Charts are deterministic, so results are a
// pure function of the query. (Board memoisation across slots is a later perf
// pass — see qmdj-date-search-plan.md; correctness first.)
// ─────────────────────────────────────────────────────────────────────────────
import { buildChart } from '../engine/index.ts';
import { scoreHour, bandOf, type Band } from './scoring.ts';
import { HOUR_SAMPLE, type CalendarOptions } from './summary.ts';
import { ACTIVITY_PRESETS, type ActivityPreset } from './data/presets.ts';
import type { ApplicationTag, Door, Spirit, Tier } from './data/patterns.ts';

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
    minScore?: number;
    allowWuBuYu?: boolean;      // surface 五不遇时 slots (default: hide)
  };
  role?: 'host' | 'mover';      // 主/客 for competition/travel
  options?: CalendarOptions;
  limit?: number;               // max results (default 80)
}

export interface SlotResult {
  y: number; m: number; d: number; hh: number; branchIndex: number;
  dayGanzhi: string; hourGanzhi: string;
  score: number; band: Band; blocked: boolean;
  formations: { id: string; name: string; tier: Tier }[];
  warnings: string[];
}

export interface SearchResult {
  slots: SlotResult[];
  dayScores: Record<string, { score: number; band: Band }>; // 'YYYY-MM-DD' → calendar overlay
  scanned: number;
}

const BOOST = 15;
const ACTING_GATE = 10;
const ACTING_SPIRIT = 8;
const ROLE_BONUS = 15;

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
function addDays(s: { y: number; m: number; d: number }, off: number) {
  const dt = new Date(s.y, s.m - 1, s.d + off);
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

function actingBonus(zhiShiGate: string | null, zhiShiSpirit: string | null, preset: ActivityPreset): number {
  let b = 0;
  if (zhiShiGate && preset.goodGates.includes(zhiShiGate as Door)) b += ACTING_GATE;
  if (zhiShiSpirit && preset.goodSpirits.includes(zhiShiSpirit as Spirit)) b += ACTING_SPIRIT;
  return b;
}
function roleBonus(warnings: string[], role: SearchQuery['role'], preset: ActivityPreset): number {
  if (!preset.roleAware || !role) return 0;
  if (role === 'host' && warnings.includes('伏吟')) return ROLE_BONUS;   // 伏吟利主
  if (role === 'mover' && warnings.includes('反吟')) return ROLE_BONUS;  // 反吟利客
  return 0;
}

export function searchRange(q: SearchQuery): SearchResult {
  const opts = q.options ?? {};
  const hours = q.hours ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const preset = q.activity ? ACTIVITY_PRESETS[q.activity] : null;
  const goodThreshold = 12; // mirrors scoring THRESH.good — "strongly-formed" cutoff

  const slots: SlotResult[] = [];
  const dayBest = new Map<string, number>();
  let scanned = 0;

  for (let off = 0; off < q.days; off++) {
    const { y, m, d } = addDays(q.start, off);
    for (const bi of hours) {
      const hh = HOUR_SAMPLE[bi];
      const chart = buildChart({ y, m, d, hh, mm: 0, ...opts });
      const base = scoreHour(chart);
      scanned++;

      const matchedIds = new Set(base.formations.map((f) => f.id));
      let score = base.score;
      let excluded = base.blocked;

      if (preset) {
        for (const id of preset.boost) if (matchedIds.has(id)) score += BOOST;
        const shi = chart.board.palaces[chart.board.zhiShiDisplayPalace - 1];
        score += actingBonus(shi?.gate ?? null, shi?.spirit ?? null, preset);
        score += roleBonus(base.warnings, q.role, preset);
        if (preset.excludeFormations.some((id) => matchedIds.has(id))) excluded = true;
        if (preset.excludeWarnings.some((w) => base.warnings.includes(w))) excluded = true;
      }

      const k = dayKey(y, m, d);
      const effective = excluded ? score - 1000 : score;
      if (effective > (dayBest.get(k) ?? -Infinity)) dayBest.set(k, effective);

      if (!passesMode(q, base, matchedIds, excluded, score, goodThreshold)) continue;

      slots.push({
        y, m, d, hh, branchIndex: bi,
        dayGanzhi: chart.pillars.day.name, hourGanzhi: chart.pillars.hour.name,
        score, band: bandOf(score, base.blocked), blocked: base.blocked,
        formations: base.formations.map((f) => ({ id: f.id, name: f.name, tier: f.tier })),
        warnings: base.warnings,
      });
    }
  }

  slots.sort((a, b) => b.score - a.score);

  const dayScores: Record<string, { score: number; band: Band }> = {};
  for (const [k, best] of dayBest) {
    const blocked = best <= -900; // was pushed down by the -1000 exclusion offset
    const shown = blocked ? best + 1000 : best;
    dayScores[k] = { score: shown, band: bandOf(shown, blocked) };
  }

  return { slots: slots.slice(0, q.limit ?? 80), dayScores, scanned };
}

function passesMode(
  q: SearchQuery,
  base: ReturnType<typeof scoreHour>,
  matchedIds: Set<string>,
  excluded: boolean,
  score: number,
  goodThreshold: number,
): boolean {
  const hasWarn = (w: string) => base.warnings.includes(w);
  // 五不遇时 / 时干入墓 are strong default-excludes: hide unless the slot is still
  // strongly formed (score above the "good" cutoff) — matches the registry's
  // "不一定都凶" allowance.
  const defaultExcluded =
    (hasWarn('五不遇时') || hasWarn('时干入墓')) && score < goodThreshold;

  switch (q.mode) {
    case 'recommended':
      return !excluded && !defaultExcluded;

    case 'by-formation':
      // every occurrence of the chosen 格局 (blocked ones still shown, ranked low)
      return q.formationId != null && matchedIds.has(q.formationId);

    case 'filter': {
      if (base.blocked) return false;
      const f = q.filters ?? {};
      if (f.require && !f.require.every((id) => matchedIds.has(id))) return false;
      if (f.avoid && f.avoid.some((x) => matchedIds.has(x) || base.warnings.includes(x))) return false;
      if (f.minScore != null && score < f.minScore) return false;
      if (!f.allowWuBuYu && (hasWarn('五不遇时') || hasWarn('时干入墓'))) return false;
      return true;
    }
    default:
      return false;
  }
}
