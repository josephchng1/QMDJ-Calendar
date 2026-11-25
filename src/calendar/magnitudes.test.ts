// §2 magnitudes — asserted as ORDERINGS, never fixed values (model §8.2).
import { describe, it, expect } from 'vitest';
import type { Palace } from '../engine/board.ts';
import { orderingScore, type PalaceEval, type ScoreProfile } from './palace.ts';
import type { MatchedFormation } from './evaluator.ts';

const gen: ScoreProfile = { kind: 'general' };
const pal = (over: Partial<Palace> = {}): Palace => ({
  palace: 6, spirit: null, gate: '开门', stars: [], tianPanStems: [], diPanStem: '戊',
  isZhiFu: false, isZhiShi: false, isHourKong: false, isMaXing: false, ...over,
});
const ev = (over: Partial<PalaceEval> = {}): PalaceEval => ({
  palace: 6, door: '开门', hasQi: false, matched: [], menGong: '比和', kongWang: false,
  ruMu: false, jiXing: false, shiGanRuMu: false, hourTomb: false, xing: false,
  controlled: false, hardGe: [], primaryStar: null, spirit: null,
  strength: { gate: '相', star: '相', spirit: null, stems: { 丙: '相' } }, ...over,
});

describe('门迫 on the gate (S0 p131 direction; practitioner magnitudes)', () => {
  it('吉门 under 迫: lower than 比和 but still positive', () => {
    const po = orderingScore(pal(), ev({ menGong: '迫' }), gen);
    const he = orderingScore(pal(), ev(), gen);
    expect(po).toBeLessThan(he);
    expect(po).toBeGreaterThan(0);
  });
  it('凶门 under 迫: lower (more negative) than 比和', () => {
    const p = pal({ gate: '死门' });
    expect(orderingScore(p, ev({ door: '死门', menGong: '迫' }), gen))
      .toBeLessThan(orderingScore(p, ev({ door: '死门' }), gen));
  });
  it('neutral gate (杜门, general mode) is unchanged by 迫', () => {
    const p = pal({ gate: '杜门' });
    expect(orderingScore(p, ev({ door: '杜门', menGong: '迫' }), gen))
      .toBe(orderingScore(p, ev({ door: '杜门' }), gen));
  });
});

describe('空亡 scales the whole palace subtotal by 0.2', () => {
  const jige: MatchedFormation = { id: 'x', name: '吉格', nameEn: 'x', tier: 'auspicious', scope: 'palace', favours: [], avoid: [], confidence: 'consensus' };
  const xiong: MatchedFormation = { ...jige, id: 'y', name: '凶格', tier: 'inauspicious' };
  // gate + star + 三奇 + spirit + formations (good and bad) + 用神 boosts
  const busy = pal({ stars: ['天心'], tianPanStems: ['丙'], spirit: '值符' });
  const profiles: ScoreProfile[] = [gen, { kind: 'purpose', activity: 'launch' }];
  for (const prof of profiles) {
    it(`score(空亡) == 0.2 × score(not 空亡) — ${prof.kind}`, () => {
      const base = { matched: [jige, xiong] };
      const off = orderingScore(busy, ev(base), prof);
      const on = orderingScore(busy, ev({ ...base, kongWang: true }), prof);
      expect(off).not.toBe(0);
      expect(Math.abs(on - 0.2 * off)).toBeLessThanOrEqual(0.1);   // both rounded to 0.1
    });
  }
  it('the hour-wide 时干入墓 term is applied after the multiplier, unscaled', () => {
    const off = orderingScore(busy, ev(), gen);
    const both = orderingScore(busy, ev({ kongWang: true, hourTomb: true }), gen);
    const tombOnly = orderingScore(busy, ev({ hourTomb: true }), gen);
    expect(Math.abs(both - (0.2 * off - (off - tombOnly)))).toBeLessThanOrEqual(0.1);
  });
});
