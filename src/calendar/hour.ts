// ─────────────────────────────────────────────────────────────────────────────
// hour.ts — roll-ups the v2 way (§5).
//
//   HOUR is DESCRIBED, not scored.  An average across directions that disagree is
//   meaningless, so the hour carries counts (how many prime / good directions) +
//   context (role favour, emergency directions, chart warnings) — never one number.
//
//   DAY is a PROJECTION, not a mean.  A day with one superb 时辰 and eleven
//   mediocre ones is excellent for someone who can act at that hour; a mean buries
//   it. So a day is summarised by its PEAK cell (peakCellOf).
// ─────────────────────────────────────────────────────────────────────────────
import { STEMS } from '../engine/ganzhi.ts';
import {
  isWuBuYuShi, repetition, isHourStemTomb,
} from './data/structural.ts';
import { evaluatePalaces, type PalaceScore, type ScoreProfile, type Band, type GradedFormation } from './palace.ts';
import { matchChart } from './evaluator.ts';
import { PATTERNS_BY_ID, gradeOf } from './data/patterns.ts';
import { emergencyDirections, type Direction } from './direction.ts';
import type { Chart } from '../engine/index.ts';

/** 主客 for the hour (S0 p139, §4.4). The chart's 格 outranks the hour stem:
 *  伏吟 → 主 (按兵不动，以逸待勞) · 反吟 → 客 (主動出擊); otherwise
 *  五阳时 (甲乙丙丁戊) 利客 · 五阴时 (己庚辛壬癸) 利主. */
export function hourRoleFavour(
  hourStem: string, rep: { fuYin: boolean; fanYin: boolean } = { fuYin: false, fanYin: false },
): 'mover' | 'host' {
  if (rep.fuYin) return 'host';
  if (rep.fanYin) return 'mover';
  return ['甲', '乙', '丙', '丁', '戊'].includes(hourStem) ? 'mover' : 'host';
}

/** "I must act at this hour" guidance for 伏吟 / 反吟 hours (spec §4). */
export interface MustAct {
  kind: '伏吟' | '反吟';
  role: 'host' | 'mover';
  text: string;    // 简体
  gloss: string;   // short English
  emergencyDirections: number[];   // 急则从神 (S0 p135)
}
// S0(p131, p139): 伏吟利主不利客，宜收敛财货、讨债催款，不宜主动.
// S0(p131): 反吟利客不利主，主快…长久大事可能有始无终.
// An hour that is both (different rings) takes 伏吟, as hourRoleFavour does.
export function mustActFor(rep: { fuYin: boolean; fanYin: boolean }, emergency: number[]): MustAct | null {
  if (rep.fuYin) return { kind: '伏吟', role: 'host', emergencyDirections: emergency,
    text: '伏吟：宜守，收敛财货、讨债催款；不宜主动发起',
    gloss: 'Hold and consolidate; collect what is owed; do not initiate.' };
  if (rep.fanYin) return { kind: '反吟', role: 'mover', emergencyDirections: emergency,
    text: '反吟：宜速办短事；忌长久之事（有始无终）',
    gloss: 'Move fast on short tasks; avoid long undertakings.' };
  return null;
}

export interface HourSummary {
  palaces: PalaceScore[];        // length 9, index-ordered
  counts: { prime: number; good: number };
  chartWarnings: string[];
  /** chart-scope 上格/下格 labels (天显时格 · 值符伏吟) — palace ones live on PalaceScore */
  chartGrades: GradedFormation[];
  chartBlocked: boolean;         // 五不遇时 → every palace blocked; excluded from search
  /** null on a very poor hour (五不遇时, or no 吉/大吉 direction) — nothing worth advising. */
  hourRoleFavour: 'mover' | 'host' | null;
  emergencyDirections: number[];
  /** set on 伏吟 / 反吟 hours — what to do if you must act now */
  mustAct: MustAct | null;
}

export function computeHourSummary(chart: Chart, profile: ScoreProfile = { kind: 'general' }): HourSummary {
  const palaces = evaluatePalaces(chart, profile);
  const dayStem = STEMS[chart.pillars.day.stem];
  const hourStem = STEMS[chart.pillars.hour.stem];

  const chartBlocked = isWuBuYuShi(dayStem, chart.pillars.hour.name);

  const chartWarnings: string[] = [];
  if (chartBlocked) chartWarnings.push('五不遇时');
  const rep = repetition(chart.board);
  if (rep.anyFuYin) chartWarnings.push('伏吟');
  if (rep.anyFanYin) chartWarnings.push('反吟');
  if (isHourStemTomb(chart)) chartWarnings.push('时干入墓');

  // chart-scope grades (§2b). Checked rule-by-rule rather than via a second
  // evaluateChart sweep — search calls this for every 时辰 in its range.
  const chartGrades: GradedFormation[] = [];
  const tianXian = PATTERNS_BY_ID['tianxian-shige'];
  const isTianXian = !!tianXian && matchChart(tianXian.when, chart);
  if (isTianXian) {
    const grade = gradeOf(tianXian!.id);
    if (grade) chartGrades.push({ text: tianXian!.name, grade });
  }
  // 天显时 turns the 伏吟 auspicious (S0 p125/p131), so no 值符伏吟 下格 label then.
  if (rep.starFuYin && !isTianXian) chartGrades.push({ text: '值符伏吟', grade: '下格' });

  // 中5 excluded from direction counts (§9-R2). Blocked cells never count.
  let prime = 0, good = 0;
  for (const ps of palaces) {
    if (ps.palace === 5 || ps.blocked) continue;
    if (ps.band === 'prime') prime++;
    else if (ps.band === 'good') good++;
  }

  // 无可用方位 ⇒ no 主客 advice
  const veryPoor = chartBlocked || (!prime && !good);

  return {
    palaces,
    counts: { prime, good },
    chartWarnings,
    chartGrades,
    chartBlocked,
    hourRoleFavour: veryPoor ? null : hourRoleFavour(hourStem, rep),
    emergencyDirections: emergencyDirections(chart),
    mustAct: mustActFor(rep, emergencyDirections(chart)),
  };
}

// ─── day peak ───────────────────────────────────────────────────────────
export interface PeakCell {
  branchIndex: number;
  branch: string;
  palace: number;
  direction: Direction | null;
  score: number;
  band: Band;
}
const BRANCHES_CN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const rankBand = (b: Band): number => (b === 'prime' ? 2 : b === 'good' ? 1 : 0);

/**
 * The day's peak cell — the single best (band, then score) palace across the 12
 * 时辰, skipping 五不遇时 hours, 中5, and blocked cells. Ties keep the earliest
 * hour/palace seen.
 *
 * The day panel uses it to open a freshly picked day on its best 时辰, from the
 * 12 时辰 it already loaded.
 */
export function peakCellOf(
  summaries: Pick<HourSummary, 'chartBlocked' | 'palaces'>[],
): PeakCell | null {
  let peak: PeakCell | null = null;
  summaries.forEach((hs, branchIndex) => {
    if (hs.chartBlocked) return;
    for (const ps of hs.palaces) {
      if (ps.palace === 5 || ps.blocked) continue;
      if (peak == null
        || rankBand(ps.band) > rankBand(peak.band)
        || (rankBand(ps.band) === rankBand(peak.band) && ps.score > peak.score)) {
        peak = {
          branchIndex, branch: BRANCHES_CN[branchIndex],
          palace: ps.palace, direction: ps.direction, score: ps.score, band: ps.band,
        };
      }
    }
  });
  return peak;
}
