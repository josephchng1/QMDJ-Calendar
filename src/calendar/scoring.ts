// ─────────────────────────────────────────────────────────────────────────────
// PROVISIONAL scoring — v1 heuristic, NOT authoritative 格局 evaluation.
//
// The architecture blueprint (§5) calls for a declarative, domain-expert-reviewed
// pattern + scoring registry. Until that lands, the calendar needs *some* quality
// signal to drive the month bars and hour ratings, so this file derives a coarse
// score from the conventional 八门 / 九星 / 八神 auspiciousness already encoded in
// qmdata.ts, plus the widely-used 五不遇时 and 时空亡 penalties.
//
// Everything here is intentionally simple and swappable. When the §5 registry is
// built, replace scoreHour() with the real evaluator — the DaySummary/MonthSummary
// shapes and the UI depend only on `band` + `score`, so nothing downstream breaks.
// ─────────────────────────────────────────────────────────────────────────────
import type { Chart } from '../engine/index.ts';
import type { Palace } from '../engine/board.ts';
import { STEMS } from '../engine/ganzhi.ts';
import {
  GATE_META, STAR_META, SPIRIT_QUALITY, STEM_ELEMENT,
  type Quality, type Element,
} from '../qmdata.ts';

export type Band = Quality; // 'excellent' | 'good' | 'neutral' | 'caution' | 'bad'

const QUALITY_WEIGHT: Record<Quality, number> = {
  excellent: 2, good: 1, neutral: 0, caution: -1, bad: -2,
};

/** 五行相克 cycle: wood→earth→water→fire→metal→wood. `a` 克 `b`? */
const KE: Record<Element, Element> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
};
function keCheck(a: Element, b: Element): boolean {
  return KE[a] === b;
}

/** Coarse quality of a single palace from its gate/star/spirit, minus void. */
export function scorePalace(p: Palace): number {
  let s = 0;
  if (p.gate && GATE_META[p.gate]) s += QUALITY_WEIGHT[GATE_META[p.gate].quality];
  for (const star of p.stars) if (STAR_META[star]) s += QUALITY_WEIGHT[STAR_META[star].quality];
  if (p.spirit && SPIRIT_QUALITY[p.spirit]) s += QUALITY_WEIGHT[SPIRIT_QUALITY[p.spirit]];
  if (p.isHourKong) s -= 1; // 空亡 weakens the palace
  return s;
}

function palaceByNumber(chart: Chart, n: number): Palace {
  return chart.board.palaces[n - 1];
}

export interface HourScore {
  score: number;
  band: Band;
  warnings: string[]; // e.g. 五不遇时, 值使门临空
}

function bandOf(score: number): Band {
  if (score >= 3) return 'excellent';
  if (score >= 1) return 'good';
  if (score > -1) return 'neutral';
  if (score > -3) return 'caution';
  return 'bad';
}

/**
 * Overall hour quality. Weighted blend of the 值使门 palace (the "acting" gate,
 * most relevant to timing) and the average of the eight outer palaces, with
 * classic hard-penalty flags folded in.
 */
export function scoreHour(chart: Chart): HourScore {
  const b = chart.board;
  const warnings: string[] = [];

  // 值使门 palace (fall back to display palace when it lands in 中5)
  const shiN = b.zhiShiPalace === 5 ? b.zhiShiDisplayPalace : b.zhiShiPalace;
  const shi = palaceByNumber(chart, shiN);
  const shiScore = scorePalace(shi);
  if (shi.isHourKong) warnings.push('值使门临空');

  // mean of the eight outer palaces (skip 中5)
  const outer = b.palaces.filter((p) => p.palace !== 5);
  const avg = outer.reduce((a, p) => a + scorePalace(p), 0) / outer.length;

  let score = shiScore * 0.6 + avg * 0.4;

  // 五不遇时: 时干 克 日干 — a conventional "inauspicious hour" flag.
  const hourStem = STEMS[chart.pillars.hour.stem];
  const dayStem = STEMS[chart.pillars.day.stem];
  const he = STEM_ELEMENT[hourStem];
  const de = STEM_ELEMENT[dayStem];
  if (he && de && keCheck(he, de)) {
    warnings.push('五不遇时');
    score -= 2;
  }

  return { score, band: bandOf(score), warnings };
}

/** Aggregate a day's 12 hour-scores into a single band (mean-based). */
export function dayBand(hourScores: number[]): Band {
  if (!hourScores.length) return 'neutral';
  const mean = hourScores.reduce((a, s) => a + s, 0) / hourScores.length;
  return bandOf(mean);
}

/** Mean of a set of hour-scores — the day-level aggregate used for the calendar. */
export function meanScore(scores: number[]): number {
  if (!scores.length) return 0;
  return scores.reduce((a, s) => a + s, 0) / scores.length;
}
