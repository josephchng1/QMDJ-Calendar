/**
 * 局数 determination: 置闰法 (traditional intercalation) and 拆补法 (modern split).
 *
 * 置闰法 (Zhi Run) rules implemented here, per the classical canon
 * (《遁甲符应经》/《奇门法窍》; "超不过九, 接不过五"):
 *  - 符头: every 甲 or 己 day opens a 5-day 元 (chunk).
 *    Branch of the 符头 day: 子午卯酉 = 上元, 寅申巳亥 = 中元, 辰戌丑未 = 下元.
 *  - The chunk sequence steps continuously through 上->中->下 and term-by-term.
 *  - Anchoring: for each solstice (冬至/夏至), the 上元符头 (甲子/己卯/甲午/己酉 day)
 *    on or before the solstice day leads it by 0..14 days.
 *      lead <= 9  : that 符头 opens 冬至/夏至上元 (正授 lead 0, else 超神).
 *      lead >= 10 : 置闰 — the 大雪/芒种 三元 are repeated once, so the solstice
 *                   上元 opens at the NEXT 上元符头 (接气, lag = 15 - lead <= 5).
 *  - Between two consecutive solstice anchors there are exactly 36 chunks
 *    (12 terms x 3), or 39 when the closing half received the intercalated
 *    大雪/芒种 repetition. This invariant is asserted.
 */
import { solsticeJdLocal, gregorianFromJd, jdFromGregorian } from './astro.ts';
import { dayGanZhi, dayNumber, type GanZhi, ganZhi } from './ganzhi.ts';
import type { SolarTerm } from './astro.ts';

/** 三元 ju numbers per term. Index: term order within the half-year, 0 = 冬至/夏至. */
// 阳遁 (冬至 -> 芒种): 冬至1,7,4 小寒2,8,5 大寒3,9,6 立春8,5,2 雨水9,6,3 惊蛰1,7,4
//                     春分3,9,6 清明4,1,7 谷雨5,2,8 立夏4,1,7 小满5,2,8 芒种6,3,9
export const YANG_JU: number[][] = [
  [1, 7, 4], [2, 8, 5], [3, 9, 6], [8, 5, 2], [9, 6, 3], [1, 7, 4],
  [3, 9, 6], [4, 1, 7], [5, 2, 8], [4, 1, 7], [5, 2, 8], [6, 3, 9]
];
// 阴遁 (夏至 -> 大雪): 夏至9,3,6 小暑8,2,5 大暑7,1,4 立秋2,5,8 处暑1,4,7 白露9,3,6
//                     秋分7,1,4 寒露6,9,3 霜降5,8,2 立冬6,9,3 小雪5,8,2 大雪4,7,1
export const YIN_JU: number[][] = [
  [9, 3, 6], [8, 2, 5], [7, 1, 4], [2, 5, 8], [1, 4, 7], [9, 3, 6],
  [7, 1, 4], [6, 9, 3], [5, 8, 2], [6, 9, 3], [5, 8, 2], [4, 7, 1]
];

export const YANG_TERMS = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种'];
export const YIN_TERMS = ['夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'];

export interface JuResult {
  /** 'yang' 阳遁 | 'yin' 阴遁 */
  dun: 'yang' | 'yin';
  /** 1..9 */
  ju: number;
  /** 0 上元, 1 中元, 2 下元 */
  yuan: number;
  /** name of the solar term this chunk SERVES under the method used */
  servingTerm: string;
  /** 符头 day pillar of the governing 5-day chunk */
  fuTou: GanZhi;
  /** true if this chunk lies in an intercalated (闰) repetition of 芒种/大雪 */
  isRun: boolean;
  method: 'zhirun' | 'chaibu';
}

/** 上元符头 day-numbers recur every 15 days; find latest one <= dayNum. */
function latestShangYuanFuTou(dayNum: number): number {
  // dayGanZhi(54 + n); 上元符头 requires index60 in {0(甲子), 15(己卯), 30(甲午), 45(己酉)}
  // i.e. (54 + dayNum) ≡ 0 (mod 15)  =>  dayNum ≡ -54 ≡ 6 (mod 15)
  const offset = (((dayNum - 6) % 15) + 15) % 15;
  return dayNum - offset;
}

/** Solstice anchor: the day-number on which that solstice's 上元 begins under 置闰法. */
export function solsticeAnchor(year: number, kind: 'winter' | 'summer', tzHours = 8): {
  anchorDayNum: number; lead: number; hasRunBefore: boolean; solsticeDayNum: number;
} {
  const jd = solsticeJdLocal(year, kind, tzHours);
  const p = gregorianFromJd(jd);
  const sDayNum = dayNumber(p.y, p.m, p.d);
  const u0 = latestShangYuanFuTou(sDayNum);
  const lead = sDayNum - u0;
  if (lead <= 9) return { anchorDayNum: u0, lead, hasRunBefore: false, solsticeDayNum: sDayNum };
  return { anchorDayNum: u0 + 15, lead, hasRunBefore: true, solsticeDayNum: sDayNum };
}

/**
 * 置闰法 ju for a qimen day (day-number of the — possibly 晚子时-advanced — day pillar).
 */
export function getJuZhiRun(qimenDayNum: number, tzHours = 8): JuResult {
  // 符头 of this day's chunk
  const dGz = dayGanZhi(qimenDayNum);
  const fuTouDayNum = qimenDayNum - (dGz.stem % 5);
  const fuTou = dayGanZhi(fuTouDayNum);

  // губerning solstice anchor: the latest anchor <= fuTouDayNum
  const approxYear = gregorianFromJd(jdFromGregorian(2000, 1, 1) + qimenDayNum).y;
  const candidates: { anchor: number; kind: 'winter' | 'summer'; year: number }[] = [];
  for (let yy = approxYear - 1; yy <= approxYear + 1; yy++) {
    for (const kind of ['winter', 'summer'] as const) {
      const a = solsticeAnchor(yy, kind, tzHours);
      candidates.push({ anchor: a.anchorDayNum, kind, year: yy });
    }
  }
  candidates.sort((a, b) => a.anchor - b.anchor);
  let gov = candidates[0];
  let next: typeof gov | null = null;
  for (const c of candidates) {
    if (c.anchor <= fuTouDayNum) gov = c;
    else { next = c; break; }
  }

  const chunkIndex = Math.floor((fuTouDayNum - gov.anchor) / 5);
  if ((fuTouDayNum - gov.anchor) % 5 !== 0) {
    throw new Error(`置闰 internal error: 符头 not on 5-day grid (day ${fuTouDayNum}, anchor ${gov.anchor})`);
  }
  // sanity: half-year must contain 36 or 39 chunks
  if (next) {
    const span = (next.anchor - gov.anchor) / 5;
    if (span !== 36 && span !== 39) {
      throw new Error(`置闰 invariant violated: ${span} chunks between anchors ${gov.anchor}..${next.anchor}`);
    }
  }

  let termIdx = Math.floor(chunkIndex / 3);
  const isRun = termIdx >= 12;
  if (isRun) termIdx = 11; // intercalated repetition of 芒种/大雪
  const yuan = chunkIndex % 3;
  // consistency: yuan derived from chunk position must match the 符头 branch class
  const branchClass = fuTou.branch % 3 === 0 ? 0 : (fuTou.branch % 3 === 2 ? 1 : 2);
  if (branchClass !== yuan) {
    throw new Error(`置闰 internal error: 元 mismatch (branch ${fuTou.name} vs chunk ${chunkIndex})`);
  }

  const dun = gov.kind === 'winter' ? 'yang' : 'yin';
  const ju = (dun === 'yang' ? YANG_JU : YIN_JU)[termIdx][yuan];
  const servingTerm = (dun === 'yang' ? YANG_TERMS : YIN_TERMS)[termIdx];
  return { dun, ju, yuan, servingTerm, fuTou, isRun, method: 'zhirun' };
}

/**
 * 拆补法 ju: the solar term in effect at the exact moment (intra-day switching),
 * with the 元 taken from the day's 符头 branch.
 * `currentTerm` must be the term in effect at the qimen moment.
 */
export function getJuChaiBu(qimenDayNum: number, currentTerm: SolarTerm): JuResult {
  const dGz = dayGanZhi(qimenDayNum);
  const fuTouDayNum = qimenDayNum - (dGz.stem % 5);
  const fuTou = dayGanZhi(fuTouDayNum);
  const yuan = fuTou.branch % 3 === 0 ? 0 : (fuTou.branch % 3 === 2 ? 1 : 2);

  // map the 24-term index (0 = 春分) to half-year term order (0 = 冬至/夏至)
  const k = currentTerm.index;
  let dun: 'yang' | 'yin';
  let termIdx: number;
  if (k >= 18 || k < 6) { // 冬至(18)..芒种(5): yang half
    dun = 'yang';
    termIdx = (k - 18 + 24) % 24;
  } else {               // 夏至(6)..大雪(17): yin half
    dun = 'yin';
    termIdx = k - 6;
  }
  const ju = (dun === 'yang' ? YANG_JU : YIN_JU)[termIdx][yuan];
  const servingTerm = (dun === 'yang' ? YANG_TERMS : YIN_TERMS)[termIdx];
  return { dun, ju, yuan, servingTerm, fuTou, isRun: false, method: 'chaibu' };
}
