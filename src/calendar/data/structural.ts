// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL "harm"/context predicates — 奇门四害 + 五不遇时 + 伏吟/反吟 + 天显时.
//
// These are COMPUTED (not stem-pair lookups). Each is a pure function over the
// engine's Palace/Chart shapes (board.ts), in the engine's simplified vocabulary.
// The scoring layer (Phase 1) consumes these; see qmdj-formations-registry.md §7.
//
// Severity (§7.10) — the scorer, not this file, applies the consequences:
//   ABSOLUTE VETO:            六仪击刑
//   STRONG VETO (nullifying): 三奇入墓
//   STRONG DEFAULT-EXCLUDE:   五不遇时, 时干入墓, 三奇受制
//   HEAVY PENALTY:            反吟, 伏吟(unless 天显时), 空亡, 门迫(凶门)
//   MITIGATOR (on a 凶门):     宫制 (凶不起)
// ─────────────────────────────────────────────────────────────────────────────
import { STEMS } from '../../engine/ganzhi.ts';
import type { Palace, Board } from '../../engine/board.ts';
import type { Chart } from '../../engine/index.ts';

export type Element = '木' | '火' | '土' | '金' | '水';

// ─── element relations ───
export const STEM_ELEM: Record<string, Element> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
export const PALACE_ELEM: Record<number, Element> = {
  1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火',
};
export const GATE_ELEM: Record<string, Element> = {
  休门: '水', 生门: '土', 伤门: '木', 杜门: '木', 景门: '火', 死门: '土', 惊门: '金', 开门: '金',
};

const KE: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const SHENG: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
/** does `a` 克 `b`? (control) */
export const controls = (a: Element, b: Element): boolean => KE[a] === b;
/** does `a` 生 `b`? (generate) */
export const generates = (a: Element, b: Element): boolean => SHENG[a] === b;

const stemIdx = (s: string): number => STEMS.indexOf(s);
const isYangStem = (s: string): boolean => stemIdx(s) % 2 === 0; // 甲丙戊庚壬 = yang
const WONDERS = ['乙', '丙', '丁'] as const;
/** 沖 (opposite) palace: 坎离/坤艮/震兑/巽乾. 中5 has none. */
export const chong = (p: number): number | null =>
  ({ 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 } as Record<number, number>)[p] ?? null;

// ─── §7.1 五不遇时 — strong default-exclude (时干 克 日干, same polarity) ───
export const WU_BU_YU_TABLE: Record<string, string> = {
  甲: '庚午时', 乙: '辛巳时', 丙: '壬辰时', 丁: '癸卯时', 戊: '甲寅时',
  己: '乙丑时', 庚: '丙子时', 辛: '丁酉时', 壬: '戊申时', 癸: '己未时',
};
export function isWuBuYuShi(dayStem: string, hourStem: string): boolean {
  const de = STEM_ELEM[dayStem], he = STEM_ELEM[hourStem];
  if (!de || !he) return false;
  return controls(he, de) && isYangStem(hourStem) === isYangStem(dayStem);
}

// ─── §7.2 六仪击刑 — ABSOLUTE VETO (a 仪 in a palace it 刑s) ───
// keyed by the 地盘 仪 stem → the palace it punishes.
export const LIU_YI_JI_XING: Record<string, number> = {
  戊: 3, // 甲子戊 → 3震 (子刑卯)
  己: 2, // 甲戌己 → 2坤 (戌刑未)
  庚: 8, // 甲申庚 → 8艮 (申刑寅)
  辛: 9, // 甲午辛 → 9离 (午自刑)
  壬: 4, // 甲辰壬 → 4巽 (辰自刑)
  癸: 4, // 甲寅癸 → 4巽 (寅刑巳)
};
export function isLiuYiJiXing(p: Palace): boolean {
  return LIU_YI_JI_XING[p.diPanStem] === p.palace;
}

// ─── §7.3 三奇入墓 — STRONG VETO (a 三奇 in its tomb palace; 乙 tombs in BOTH) ───
export const SANQI_RUMU: Record<string, number[]> = { 乙: [2, 6], 丙: [6], 丁: [8] };
/** which 三奇 (if any) are 入墓 in this palace (evaluated on the 天盘 wonder). */
export function sanQiRuMu(p: Palace): string[] {
  return WONDERS.filter((w) => p.tianPanStems.includes(w) && SANQI_RUMU[w].includes(p.palace));
}
export const isSanQiRuMu = (p: Palace): boolean => sanQiRuMu(p).length > 0;

// ─── §7.7 时干入墓 — strong default-exclude (十干墓库) ───
export const STEM_TOMB: Record<string, number> = {
  甲: 2, 乙: 6, 丙: 6, 丁: 8, 戊: 6, 己: 8, 庚: 8, 辛: 4, 壬: 4, 癸: 2,
};
/** palace where a stem sits on the 天盘 (first match), or null. */
export function palaceOfTianStem(board: Board, stem: string): number | null {
  for (const p of board.palaces) if (p.tianPanStems.includes(stem)) return p.palace;
  return null;
}
/** the hour pillar's stem, placed on the 天盘, is in its own tomb palace. */
export function isHourStemTomb(chart: Chart): boolean {
  const hourStem = STEMS[chart.pillars.hour.stem];
  if (hourStem === '甲') return false; // 甲-hour = 天显时 (auspicious), never read as tomb
  const seat = palaceOfTianStem(chart.board, hourStem);
  return seat != null && STEM_TOMB[hourStem] === seat;
}

// ─── §7.8 三奇受制 — the wonder is 克ed (火入水乡 / 木入金乡) ───
export function sanQiControlled(p: Palace): string[] {
  const out: string[] = [];
  for (const w of WONDERS) {
    if (!p.tianPanStems.includes(w)) continue;
    // 火入水乡: 丙/丁 in 坎1 or over 壬/癸
    if ((w === '丙' || w === '丁') && (p.palace === 1 || p.diPanStem === '壬' || p.diPanStem === '癸')) out.push(w);
    // 木入金乡: 乙 in 乾6/兑7 or over 庚/辛
    if (w === '乙' && ([6, 7].includes(p.palace) || p.diPanStem === '庚' || p.diPanStem === '辛')) out.push(w);
  }
  return out;
}
export const isSanQiControlled = (p: Palace): boolean => sanQiControlled(p).length > 0;

// ─── §7.4 门迫 / 宫迫 / 门宫和义 — gate↔palace 五行 relation ───
export type MenGong = '迫' | '制' | '和' | '义' | '比和' | null;
/** 迫 = 门克宫 (bad) · 制 = 宫克门 (凶不起, protective on 凶门) · 和 = 门生宫 · 义 = 宫生门 · 比和 = same element. */
export function menGongRelation(door: string, p: number): MenGong {
  if (p === 5) return null; // 中5 handled by centre-palace convention
  const g = GATE_ELEM[door], q = PALACE_ELEM[p];
  if (!g || !q) return null;
  if (controls(g, q)) return '迫';
  if (controls(q, g)) return '制';
  if (generates(g, q)) return '和';
  if (generates(q, g)) return '义';
  return '比和';
}
export const isMenPo = (door: string, p: number): boolean => menGongRelation(door, p) === '迫';
export const isGongPo = (door: string, p: number): boolean => menGongRelation(door, p) === '制';

// ─── §7.6 伏吟 / 反吟 — star & gate repetition/reversal ───
// A star's home palace = its Luoshu number; a gate's home is fixed likewise.
// 值符伏吟 (甲加甲) is NOT yet detected here — see note below.
const STAR_HOME: Record<string, number> = {
  天蓬: 1, 天芮: 2, 天冲: 3, 天辅: 4, 天禽: 5, 天心: 6, 天柱: 7, 天任: 8, 天英: 9,
};
const GATE_HOME: Record<string, number> = {
  休门: 1, 死门: 2, 伤门: 3, 杜门: 4, 开门: 6, 惊门: 7, 生门: 8, 景门: 9,
};

export interface Repetition {
  starFuYin: boolean; gateFuYin: boolean;
  starFanYin: boolean; gateFanYin: boolean;
  anyFuYin: boolean; anyFanYin: boolean;
}
export function repetition(board: Board): Repetition {
  let starFuYin = false, gateFuYin = false, starFanYin = false, gateFanYin = false;
  for (const p of board.palaces) {
    if (p.palace === 5) continue;
    const opp = chong(p.palace);
    for (const s of p.stars) {
      if (STAR_HOME[s] === p.palace) starFuYin = true;
      if (opp != null && STAR_HOME[s] === opp) starFanYin = true;
    }
    if (p.gate) {
      if (GATE_HOME[p.gate] === p.palace) gateFuYin = true;
      if (opp != null && GATE_HOME[p.gate] === opp) gateFanYin = true;
    }
  }
  return {
    starFuYin, gateFuYin, starFanYin, gateFanYin,
    anyFuYin: starFuYin || gateFuYin,
    anyFanYin: starFanYin || gateFanYin,
  };
}

// ─── §6 天显时 — hour pillar stem 甲: 伏吟 exception, flips auspicious ───
export function isTianXianShi(chart: Chart): boolean {
  return STEMS[chart.pillars.hour.stem] === '甲';
}

// NOTE (Phase 0 residual): 值符伏吟/反吟 (甲加甲 / 甲子戊+甲午辛) is not detected by
// repetition() — it needs the 值符 origin palace, which the board does not export.
// Star- and gate-level detection covers the impactful cases; wire 值符-level in
// Phase 1 if the scorer needs it (would require a small board.ts export). Tracked
// in qmdj-date-search-plan.md §4 open items.
