import { describe, it, expect } from 'vitest';
import { STEMS } from '../engine/ganzhi.ts';
import type { Palace, Board } from '../engine/board.ts';
import type { Chart } from '../engine/index.ts';
import { scoreHour } from './scoring.ts';

function palace(over: Partial<Palace> & { palace: number }): Palace {
  return {
    spirit: null, gate: null, stars: [], tianPanStems: [], diPanStem: '丁', // inert defaults
    isZhiFu: false, isZhiShi: false, isHourKong: false, isMaXing: false,
    ...over,
  };
}
// Build a full 9-palace board; `over` maps palace-number → partial overrides.
function makeChart(opts: {
  dayStem: string; hourStem: string; zhiShi: number; zhiFu: number;
  over?: Record<number, Partial<Palace>>;
}): Chart {
  const palaces: Palace[] = [];
  for (let p = 1; p <= 9; p++) palaces.push(palace({ palace: p, ...(opts.over?.[p] ?? {}) }));
  const board = {
    palaces, zhiShiDisplayPalace: opts.zhiShi, zhiFuDisplayPalace: opts.zhiFu,
  } as unknown as Board;
  return {
    pillars: {
      day: { stem: STEMS.indexOf(opts.dayStem) },
      hour: { stem: STEMS.indexOf(opts.hourStem), name: '' },
    },
    board,
  } as unknown as Chart;
}
const names = (r: ReturnType<typeof scoreHour>) => r.formations.map((f) => f.name);

describe('scoreHour — auspicious structure', () => {
  it('天遁 in the 值使 palace scores excellent, not blocked', () => {
    const r = scoreHour(makeChart({
      dayStem: '乙', hourStem: '乙', zhiShi: 2, zhiFu: 1,
      over: { 2: { gate: '生门', tianPanStems: ['丙'], diPanStem: '丁' } }, // 天遁 (生门+丙+丁)
    }));
    expect(r.blocked).toBe(false);
    expect(r.band).toBe('excellent');
    expect(r.score).toBeGreaterThan(40);
    expect(names(r)).toContain('天遁');
  });
});

describe('scoreHour — vetoes', () => {
  it('六仪击刑 anywhere blocks the slot (band bad)', () => {
    const r = scoreHour(makeChart({
      dayStem: '乙', hourStem: '乙', zhiShi: 1, zhiFu: 6,
      over: { 3: { diPanStem: '戊' } }, // 戊 in 震3 = 六仪击刑
    }));
    expect(r.blocked).toBe(true);
    expect(r.band).toBe('bad');
    expect(r.warnings).toContain('六仪击刑');
  });
  it('三奇入墓 blocks the slot', () => {
    const r = scoreHour(makeChart({
      dayStem: '乙', hourStem: '乙', zhiShi: 1, zhiFu: 2,
      over: { 6: { tianPanStems: ['丙'] } }, // 丙 in 乾6 = 三奇入墓
    }));
    expect(r.blocked).toBe(true);
    expect(r.warnings).toContain('三奇入墓');
  });
});

describe('scoreHour — chart penalties', () => {
  it('五不遇时 (甲日庚时) warns and penalises without blocking', () => {
    const r = scoreHour(makeChart({ dayStem: '甲', hourStem: '庚', zhiShi: 1, zhiFu: 2 }));
    expect(r.blocked).toBe(false);
    expect(r.warnings).toContain('五不遇时');
  });
  it('天显时 (甲-hour) suppresses the 伏吟 penalty', () => {
    const withGateFuYin = { 1: { gate: '休门' } }; // 休门 home = 坎1 → 门伏吟
    const suppressed = scoreHour(makeChart({ dayStem: '甲', hourStem: '甲', zhiShi: 2, zhiFu: 1, over: withGateFuYin }));
    const notSuppressed = scoreHour(makeChart({ dayStem: '乙', hourStem: '乙', zhiShi: 2, zhiFu: 1, over: withGateFuYin }));
    expect(suppressed.warnings).not.toContain('伏吟');
    expect(notSuppressed.warnings).toContain('伏吟');
  });
});

describe('scoreHour — interaction reconciliation', () => {
  it('奇仪相合 (+吉门) rescues 乙庚被刑 — 和解 read, not 被刑', () => {
    const r = scoreHour(makeChart({
      dayStem: '乙', hourStem: '乙', zhiShi: 4, zhiFu: 1,
      over: { 4: { gate: '休门', tianPanStems: ['乙'], diPanStem: '庚' } }, // 乙庚合 + 吉门
    }));
    expect(names(r)).toContain('奇仪相合');
    expect(names(r)).not.toContain('日奇被刑');
  });
});
