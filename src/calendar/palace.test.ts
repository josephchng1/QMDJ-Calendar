import { describe, it, expect } from 'vitest';
import { STEMS } from '../engine/ganzhi.ts';
import type { Palace, Board } from '../engine/board.ts';
import type { Chart } from '../engine/index.ts';
import { evaluatePalace, type ScoreProfile } from './palace.ts';
import { emergencyDirections } from './direction.ts';
import type { MatchedFormation } from './evaluator.ts';

function pal(over: Partial<Palace> & { palace: number }): Palace {
  return {
    spirit: null, gate: null, stars: [], tianPanStems: [], diPanStem: '丁',
    isZhiFu: false, isZhiShi: false, isHourKong: false, isMaXing: false, ...over,
  };
}
// month.branch drives 月令; day/hour stems drive 五不遇时 & 时干入墓.
function chartOf(monthBranch: number, dayStem: string, hourStem: string, palaces: Palace[]): Chart {
  const board = { palaces, zhiFuDisplayPalace: 1, zhiShiDisplayPalace: 1, xunShouYi: '己' } as unknown as Board;
  return {
    pillars: {
      month: { branch: monthBranch },
      day: { stem: STEMS.indexOf(dayStem) },
      hour: { stem: STEMS.indexOf(hourStem), name: '' },
    },
    board,
  } as unknown as Chart;
}
const gen: ScoreProfile = { kind: 'general' };
const fmt = (over: Partial<MatchedFormation>): MatchedFormation => ({
  id: 'x', name: '吉格', nameEn: 'x', tier: 'auspicious', scope: 'palace',
  favours: [], avoid: [], confidence: 'consensus', ...over,
});
const evalOne = (mb: number, day: string, hour: string, p: Palace, m: MatchedFormation[] = []) =>
  evaluatePalace(chartOf(mb, day, hour, [p]), p, m, gen);

// ── THE inversion test (highest priority — §8.2) ─────────────────────────────
describe('vitality inversion — strength scales magnitude, never flips sign', () => {
  it('死门@旺 scores MORE negative than 死门@囚', () => {
    const s = (mb: number) => evalOne(mb, '甲', '乙', pal({ palace: 8, gate: '死门' })).score;
    expect(s(5)).toBeLessThan(s(3)); // 巳月(旺 ×1.30) vs 卯月(囚 ×0.60)
  });
});

// ── the rule ladder, one rung each (§3.4 / §4.3) ─────────────────────────────
describe('assignBand — the classical ladder, not a threshold', () => {
  it('奇门相会 → prime, with a reason trace', () => {
    const r = evalOne(8, '甲', '乙', pal({ palace: 6, gate: '开门', tianPanStems: ['丁'], diPanStem: '戊' }));
    expect(r.band).toBe('prime');
    expect(r.rung).toBe('奇门相会');
    expect(r.reasons.length).toBeGreaterThan(0);
  });
  it('得门不得奇 → good', () => {
    const r = evalOne(8, '甲', '乙', pal({ palace: 6, gate: '开门', tianPanStems: ['戊'], diPanStem: '己' }));
    expect(r.band).toBe('good');
    expect(r.rung).toBe('得门不得奇');
  });
  it('得奇不得门 → plain (does NOT reach good/prime) — the R1 strict rule', () => {
    const r = evalOne(8, '甲', '乙', pal({ palace: 6, gate: '死门', tianPanStems: ['丁'], diPanStem: '戊' }));
    expect(r.rung).toBe('得奇不得门');
    expect(r.band).toBe('plain');
  });
  it('逢吉格 (no 奇, no 吉门, but a 吉格) → good', () => {
    const r = evalOne(8, '甲', '乙', pal({ palace: 6, gate: '死门', tianPanStems: ['戊'], diPanStem: '己' }), [fmt({})]);
    expect(r.rung).toBe('逢吉格');
    expect(r.band).toBe('good');
  });
});

// ── promotions (§3.4 step 3) ──────────────────────────────────────────────────
describe('top-tier promotion — 若逢迫墓击刑，吉事成凶', () => {
  const qlfs = fmt({ id: 'qinglong-fanshou', name: '青龙返首', tier: 'supreme-auspicious' });
  it('青龙返首 clean of 迫墓击刑 → prime', () => {
    const r = evalOne(8, '甲', '乙', pal({ palace: 8, gate: '死门', diPanStem: '丁' }), [qlfs]);
    expect(r.band).toBe('prime');
  });
  it('青龙返首 with 门迫 → stays good', () => {
    const r = evalOne(8, '甲', '乙', pal({ palace: 1, gate: '死门', diPanStem: '丁' }), [qlfs]); // 死门土 in 坎1水 = 迫
    expect(r.band).toBe('good');
  });
});

// ── vetoes & chart-scope exclusion (§3.4 step 0) ─────────────────────────────
describe('hard exclusions block a cell regardless of stacked 吉格', () => {
  const supreme = fmt({ id: 'qinglong-fanshou', name: '青龙返首', tier: 'supreme-auspicious' });
  it('六仪击刑 → blocked + plain', () => {
    const r = evalOne(8, '甲', '乙', pal({ palace: 3, gate: '伤门', diPanStem: '戊' }), [supreme]); // 戊 in 震3
    expect(r.blocked).toBe(true);
    expect(r.band).toBe('plain');
  });
  it('五不遇时 → blocked + plain even on a would-be prime cell', () => {
    const p = pal({ palace: 6, gate: '开门', tianPanStems: ['丁'], diPanStem: '戊' });
    const r = evalOne(8, '甲', '庚', p); // 甲日庚时 = 五不遇时
    expect(r.blocked).toBe(true);
    expect(r.band).toBe('plain');
    expect(r.reasons.join('')).toContain('五不遇时');
  });
});

// ── 急则从神 (§4.6) ────────────────────────────────────────────────────────────
describe('emergencyDirections', () => {
  it('returns 天盘值符宫 and 地盘值符宫, deduped, 中5 dropped', () => {
    const palaces = [pal({ palace: 3, diPanStem: '己' }), pal({ palace: 7, diPanStem: '戊' })];
    const board = { palaces, zhiFuDisplayPalace: 7, xunShouYi: '己' } as unknown as Board;
    const chart = { board } as unknown as Chart;
    expect(emergencyDirections(chart).sort()).toEqual([3, 7]); // 地盘值符=己@3, 天盘值符=7
  });
});
