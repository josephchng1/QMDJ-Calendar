/**
 * 转盘时家奇门 board construction: 地盘 (three nobles & six ceremonies),
 * 值符/值使, 天盘 stems, 九星, 八门, 八神.
 * Every rule here was verified palace-by-palace against ten reference charts.
 */
import { STEMS, BRANCHES, type GanZhi, type FourPillars } from './ganzhi.ts';
import type { JuResult } from './ju.ts';

/** clockwise ring of the eight outer palaces: 坎1 艮8 震3 巽4 离9 坤2 兑7 乾6 */
export const RING = [1, 8, 3, 4, 9, 2, 7, 6];

export const STAR_NAMES: Record<number, string> = {
  1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英'
};
export const GATE_NAMES: Record<number, string> = {
  1: '休门', 2: '死门', 3: '伤门', 4: '杜门', 6: '开门', 7: '惊门', 8: '生门', 9: '景门'
};
/** ring-ordered stars/gates aligned with RING (home palaces) */
const STAR_RING = [1, 8, 3, 4, 9, 2, 7, 6].map(p => STAR_NAMES[p]); // 蓬任冲辅英芮柱心
const GATE_RING = [1, 8, 3, 4, 9, 2, 7, 6].map(p => GATE_NAMES[p]); // 休生伤杜景死惊开

export const SPIRITS = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
/** variant naming used by some schools/apps: 白虎->勾陈, 玄武->朱雀 */
export const SPIRITS_VARIANT = ['值符', '腾蛇', '太阴', '六合', '勾陈', '朱雀', '九地', '九天'];

/** 三奇六仪 placement order */
const YI_ORDER = [4, 5, 6, 7, 8, 9, 3, 2, 1]; // stem indices: 戊己庚辛壬癸丁丙乙

/** 旬首 branch -> hidden 仪 stem index: 甲子戊 甲戌己 甲申庚 甲午辛 甲辰壬 甲寅癸 */
const XUNSHOU_YI: Record<number, number> = { 0: 4, 10: 5, 8: 6, 6: 7, 4: 8, 2: 9 };

export interface Palace {
  /** Luoshu palace number 1..9 */
  palace: number;
  /** 八神 spirit (null for centre) */
  spirit: string | null;
  /** 八门 gate (null for centre) */
  gate: string | null;
  /** stars in this palace ("天禽" rides with "天芮") */
  stars: string[];
  /** heaven-plate stems; for the 芮/禽 palace: [芮's stem, 禽's stem] */
  tianPanStems: string[];
  /** earth-plate stem */
  diPanStem: string;
  isZhiFu: boolean;
  isZhiShi: boolean;
  isHourKong: boolean;
  isMaXing: boolean;
}

export interface Board {
  dun: 'yang' | 'yin';
  ju: number;
  palaces: Palace[]; // index 0..8 = palace 1..9
  zhiFuStar: string;
  /** palace the 值符星 actually falls in (5 possible) and its display palace (5 -> 2) */
  zhiFuPalace: number;
  zhiFuDisplayPalace: number;
  zhiShiGate: string;
  zhiShiPalace: number;
  zhiShiDisplayPalace: number;
  xunShou: string;      // e.g. 甲戌
  xunShouYi: string;    // e.g. 己
  hourKongWang: string; // e.g. 申酉
  dayKongWang: string;
  maXing: string;       // branch name
}

/** palace containing the branch (for 空亡/马星 markers). 中5 holds none. */
const BRANCH_PALACE: Record<number, number> = {
  0: 1,            // 子 -> 坎1
  1: 8, 2: 8,      // 丑寅 -> 艮8
  3: 3,            // 卯 -> 震3
  4: 4, 5: 4,      // 辰巳 -> 巽4
  6: 9,            // 午 -> 离9
  7: 2, 8: 2,      // 未申 -> 坤2
  9: 7,            // 酉 -> 兑7
  10: 6, 11: 6     // 戌亥 -> 乾6
};

export interface BoardOptions {
  /** use 勾陈/朱雀 instead of 白虎/玄武 */
  spiritVariant?: boolean;
}

export function buildBoard(pillars: FourPillars, juRes: JuResult, opt: BoardOptions = {}): Board {
  const { dun, ju } = juRes;
  const spirits = opt.spiritVariant ? SPIRITS_VARIANT : SPIRITS;

  // ---- 地盘 ----
  const diPan: number[] = new Array(10).fill(-1); // palace -> stem index
  for (let i = 0; i < 9; i++) {
    const palace = dun === 'yang'
      ? ((ju - 1 + i) % 9) + 1
      : ((ju - 1 - i) % 9 + 9) % 9 + 1;
    diPan[palace] = YI_ORDER[i];
  }
  const stemPalace: number[] = new Array(10).fill(-1); // stem index -> palace
  for (let p = 1; p <= 9; p++) stemPalace[diPan[p]] = p;

  // ---- 旬首 / 值符 ----
  const xs = pillars.hourXunShou;
  const yiStem = XUNSHOU_YI[xs.branch];
  const zhiFuOrigin = stemPalace[yiStem];              // palace where the 仪 sits
  const zhiFuStarNum = zhiFuOrigin;                    // star of that palace (5 = 禽)
  const hourStem = pillars.hour.stem;
  // 时干 palace on 地盘; for 甲-hours use the 旬首仪 stem
  const targetStem = hourStem === 0 ? yiStem : hourStem;
  const zhiFuPalace = stemPalace[targetStem];
  const zhiFuDisplay = zhiFuPalace === 5 ? 2 : zhiFuPalace;

  // ---- star rotation (fixed ring order, 值符星 anchored at 时干宫) ----
  const anchorStarNum = zhiFuStarNum === 5 ? 2 : zhiFuStarNum; // 禽 rides with 芮
  const i0 = RING.indexOf([1, 8, 3, 4, 9, 2, 7, 6].find(p => p === (anchorStarNum))!); // ring pos of anchor star's home
  const j0 = RING.indexOf(zhiFuDisplay);
  const starAt: Record<number, string[]> = {};
  const starHomeOf: Record<number, number[]> = {}; // display palace -> home palaces of stars there
  for (let k = 0; k < 8; k++) {
    const homePalace = RING[(i0 + k) % 8];
    const destPalace = RING[(j0 + k) % 8];
    const names = [STAR_NAMES[homePalace]];
    const homes = [homePalace];
    if (homePalace === 2) { names.push(STAR_NAMES[5]); homes.push(5); } // 禽随芮
    starAt[destPalace] = names;
    starHomeOf[destPalace] = homes;
  }

  // ---- 值使 ----
  const zhiShiGateName = zhiFuOrigin === 5 ? GATE_NAMES[2] : GATE_NAMES[zhiFuOrigin]; // 中宫寄坤 -> 死门
  const gateAnchorHome = zhiFuOrigin === 5 ? 2 : zhiFuOrigin;
  const hOffset = ((pillars.hour.index - xs.index) % 60 + 60) % 60; // 0..9
  const zhiShiPalace = dun === 'yang'
    ? ((zhiFuOrigin - 1 + hOffset) % 9) + 1
    : ((zhiFuOrigin - 1 - hOffset) % 9 + 9) % 9 + 1;
  const zhiShiDisplay = zhiShiPalace === 5 ? 2 : zhiShiPalace;

  const gi0 = RING.indexOf(gateAnchorHome);
  const gj0 = RING.indexOf(zhiShiDisplay);
  const gateAt: Record<number, string> = {};
  for (let k = 0; k < 8; k++) {
    const homePalace = RING[(gi0 + k) % 8];
    const destPalace = RING[(gj0 + k) % 8];
    gateAt[destPalace] = GATE_NAMES[homePalace];
  }

  // ---- 八神 ----
  const spiritAt: Record<number, string> = {};
  const sj0 = RING.indexOf(zhiFuDisplay);
  for (let k = 0; k < 8; k++) {
    const destPalace = dun === 'yang' ? RING[(sj0 + k) % 8] : RING[(sj0 - k + 8) % 8];
    spiritAt[destPalace] = spirits[k];
  }

  // ---- markers ----
  const [hk1, hk2] = pillars.hourKongWang;
  const kongPalaces = new Set([BRANCH_PALACE[hk1], BRANCH_PALACE[hk2]]);
  const maPalace = BRANCH_PALACE[pillars.maXing];

  // ---- assemble ----
  const palaces: Palace[] = [];
  for (let p = 1; p <= 9; p++) {
    if (p === 5) {
      palaces.push({
        palace: 5, spirit: null, gate: null, stars: [],
        tianPanStems: [], diPanStem: STEMS[diPan[5]],
        isZhiFu: zhiFuPalace === 5, isZhiShi: zhiShiPalace === 5,
        isHourKong: false, isMaXing: false
      });
      continue;
    }
    const homes = starHomeOf[p];
    const tianStems = homes.map(h => STEMS[diPan[h]]);
    palaces.push({
      palace: p,
      spirit: spiritAt[p] ?? null,
      gate: gateAt[p] ?? null,
      stars: starAt[p] ?? [],
      tianPanStems: tianStems,
      diPanStem: STEMS[diPan[p]],
      isZhiFu: p === zhiFuDisplay,
      isZhiShi: p === zhiShiDisplay,
      isHourKong: kongPalaces.has(p),
      isMaXing: p === maPalace
    });
  }

  return {
    dun, ju, palaces,
    zhiFuStar: STAR_NAMES[zhiFuStarNum],
    zhiFuPalace, zhiFuDisplayPalace: zhiFuDisplay,
    zhiShiGate: zhiShiGateName,
    zhiShiPalace, zhiShiDisplayPalace: zhiShiDisplay,
    xunShou: xs.name,
    xunShouYi: STEMS[yiStem],
    hourKongWang: BRANCHES[hk1] + BRANCHES[hk2],
    dayKongWang: BRANCHES[pillars.dayKongWang[0]] + BRANCHES[pillars.dayKongWang[1]],
    maXing: BRANCHES[pillars.maXing]
  };
}
