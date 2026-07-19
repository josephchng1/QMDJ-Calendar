/**
 * 时家奇门遁甲 chart engine — public API.
 *
 * const chart = buildChart({ y: 2026, m: 3, d: 17, hh: 10, mm: 6 });          // 置闰法
 * const chart = buildChart({ ... , method: 'chaibu' });                        // 拆补法
 */
import { fourPillars, type FourPillars, type PillarOptions } from './ganzhi.ts';
import { getJuZhiRun, getJuChaiBu, type JuResult } from './ju.ts';
import { buildBoard, type Board, type BoardOptions } from './board.ts';
import { termsBracketing, jdFromGregorian, type SolarTerm } from './astro.ts';

export * from './astro.ts';
export * from './ganzhi.ts';
export * from './ju.ts';
export * from './board.ts';

export interface ChartInput extends PillarOptions, BoardOptions {
  y: number; m: number; d: number; hh: number; mm: number;
  /** 'zhirun' (default) or 'chaibu' */
  method?: 'zhirun' | 'chaibu';
}

export interface Chart {
  input: ChartInput;
  pillars: FourPillars;
  juResult: JuResult;
  board: Board;
  /** convenience strings */
  summary: {
    fourPillars: string;      // 丙午 辛卯 庚寅 辛巳
    dun: string;              // 阳遁四局
    yuan: string;             // 上元/中元/下元
    term: string;             // serving term under the chosen method
    zhiFu: string;            // 甲戌己 天禽落兑七宫
    zhiShi: string;           // 死门落震三宫
  };
}

const YUAN_NAMES = ['上元', '中元', '下元'];
const PALACE_NAMES: Record<number, string> = {
  1: '坎一宫', 2: '坤二宫', 3: '震三宫', 4: '巽四宫', 5: '中五宫', 6: '乾六宫', 7: '兑七宫', 8: '艮八宫', 9: '离九宫'
};

export function buildChart(input: ChartInput): Chart {
  const method = input.method ?? 'zhirun';
  const pillars = fourPillars(input.y, input.m, input.d, input.hh, input.mm, input);

  let juRes: JuResult;
  if (method === 'zhirun') {
    juRes = getJuZhiRun(pillars.qimenDayNum, input.tzHours ?? 8);
  } else {
    // 拆补: term at the exact ORIGINAL moment (晚子时 keeps the original date's term)
    const jdLocal = jdFromGregorian(input.y, input.m, input.d) + (input.hh * 60 + input.mm) / 1440;
    const { current } = termsBracketing(jdLocal, input.tzHours ?? 8);
    juRes = getJuChaiBu(pillars.qimenDayNum, current);
  }

  const board = buildBoard(pillars, juRes, input);

  const dunStr = (juRes.dun === 'yang' ? '阳遁' : '阴遁') + '一二三四五六七八九'[juRes.ju - 1] + '局';
  return {
    input, pillars, juResult: juRes, board,
    summary: {
      fourPillars: `${pillars.year.name} ${pillars.month.name} ${pillars.day.name} ${pillars.hour.name}`,
      dun: dunStr,
      yuan: YUAN_NAMES[juRes.yuan],
      term: juRes.servingTerm + (juRes.isRun ? '(闰)' : ''),
      zhiFu: `${board.xunShou}${board.xunShouYi} ${board.zhiFuStar}落${PALACE_NAMES[board.zhiFuPalace]}`,
      zhiShi: `${board.zhiShiGate}落${PALACE_NAMES[board.zhiShiPalace]}`
    }
  };
}
