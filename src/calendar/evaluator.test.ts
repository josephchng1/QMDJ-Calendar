import { describe, it, expect } from 'vitest';
import { STEMS } from '../engine/ganzhi.ts';
import type { Palace } from '../engine/board.ts';
import type { Chart } from '../engine/index.ts';
import { matchPalace, matchChart, evaluateChart } from './evaluator.ts';
import { PATTERNS_BY_ID } from './data/patterns.ts';

// inert defaults: diPanStem '丁' is not a 仪 (no accidental 六仪击刑), tianPanStems []
// means no wonder-based rule fires unless explicitly set.
function palace(over: Partial<Palace> & { palace: number }): Palace {
  return {
    spirit: null, gate: null, stars: [], tianPanStems: [], diPanStem: '丁',
    isZhiFu: false, isZhiShi: false, isHourKong: false, isMaXing: false,
    ...over,
  };
}
function chart(hourStem: string, palaces: Palace[]): Chart {
  return { pillars: { hour: { stem: STEMS.indexOf(hourStem) } }, board: { palaces } } as unknown as Chart;
}
const whenOf = (id: string) => PATTERNS_BY_ID[id].when;

describe('matchPalace — representative rules', () => {
  it('天遁 = 生门 + 丙(天) + 丁(地)', () => {
    expect(matchPalace(whenOf('tian-dun'), palace({ palace: 8, gate: '生门', tianPanStems: ['丙'], diPanStem: '丁' }))).toBe(true);
    expect(matchPalace(whenOf('tian-dun'), palace({ palace: 8, gate: '开门', tianPanStems: ['丙'], diPanStem: '丁' }))).toBe(false);
  });
  it('青龙返首 = 戊(天) over 丙(地)', () => {
    expect(matchPalace(whenOf('qinglong-fanshou'), palace({ palace: 1, tianPanStems: ['戊'], diPanStem: '丙' }))).toBe(true);
  });
  it('三奇升殿 = 乙 seated in 震3 (sanqiInPalace)', () => {
    expect(matchPalace(whenOf('sanqi-shengdian'), palace({ palace: 3, tianPanStems: ['乙'] }))).toBe(true);
    expect(matchPalace(whenOf('sanqi-shengdian'), palace({ palace: 4, tianPanStems: ['乙'] }))).toBe(false);
  });
  it('三奇得使 = a 奇 sharing the 值使门 palace', () => {
    expect(matchPalace(whenOf('sanqi-deshi'), palace({ palace: 9, tianPanStems: ['丙'], isZhiShi: true }))).toBe(true);
    expect(matchPalace(whenOf('sanqi-deshi'), palace({ palace: 9, tianPanStems: ['丙'], isZhiShi: false }))).toBe(false);
  });
  it('鬼遁 via `any` = (杜门|开门) + 丁 + 九地', () => {
    expect(matchPalace(whenOf('gui-dun'), palace({ palace: 4, gate: '杜门', tianPanStems: ['丁'], spirit: '九地' }))).toBe(true);
    expect(matchPalace(whenOf('gui-dun'), palace({ palace: 4, gate: '休门', tianPanStems: ['丁'], spirit: '九地' }))).toBe(false);
  });
  it('奇仪相合 = a 合 stem-pair + a 吉门', () => {
    expect(matchPalace(whenOf('qiyi-xianghe'), palace({ palace: 4, gate: '休门', tianPanStems: ['乙'], diPanStem: '庚' }))).toBe(true); // 乙庚合
    expect(matchPalace(whenOf('qiyi-xianghe'), palace({ palace: 4, gate: '死门', tianPanStems: ['乙'], diPanStem: '庚' }))).toBe(false);
  });
});

describe('matchChart — 天显时', () => {
  it('fires only on a 甲-hour', () => {
    expect(matchChart(whenOf('tianxian-shige'), chart('甲', []))).toBe(true);
    expect(matchChart(whenOf('tianxian-shige'), chart('乙', []))).toBe(false);
  });
});

describe('evaluateChart', () => {
  it('collects palace matches (with palace no.) and chart matches', () => {
    const c = chart('甲', [
      palace({ palace: 8, gate: '生门', tianPanStems: ['丙'], diPanStem: '丁' }), // 天遁
      palace({ palace: 1, tianPanStems: ['戊'], diPanStem: '丙' }),               // 青龙返首
    ]);
    const ids = evaluateChart(c).map((f) => f.id);
    expect(ids).toContain('tian-dun');
    expect(ids).toContain('qinglong-fanshou');
    expect(ids).toContain('tianxian-shige'); // chart-scope, hour 甲
    const td = evaluateChart(c).find((f) => f.id === 'tian-dun');
    expect(td?.palace).toBe(8);
  });
  it('skips 中5', () => {
    const c = chart('乙', [palace({ palace: 5, tianPanStems: ['戊'], diPanStem: '丙' })]);
    expect(evaluateChart(c)).toHaveLength(0);
  });
});
