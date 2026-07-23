import { describe, it, expect } from 'vitest';
import type { Palace } from '../engine/board.ts';
import {
  PALACE_DIRECTION, directionOf, baseFilter, wonderNullified,
  hasEffectiveSanQi, effectiveSanQi,
} from './direction.ts';
import type { MatchedFormation } from './evaluator.ts';

function pal(over: Partial<Palace> & { palace: number }): Palace {
  return {
    spirit: null, gate: null, stars: [], tianPanStems: [], diPanStem: '戊',
    isZhiFu: false, isZhiShi: false, isHourKong: false, isMaXing: false, ...over,
  };
}
const jiGe: MatchedFormation = {
  id: 'x', name: '吉格', nameEn: 'x', tier: 'auspicious', scope: 'palace',
  favours: [], avoid: [], confidence: 'consensus',
};

describe('§2 PALACE_DIRECTION', () => {
  it('maps the eight outer palaces and leaves 中5 null', () => {
    expect(PALACE_DIRECTION[1]).toBe('N');
    expect(PALACE_DIRECTION[9]).toBe('S');
    expect(directionOf(5)).toBeNull();
  });
});

describe('§4.7 三奇 nullification', () => {
  it('乙 in 乾6 with 开门 is nullified (入墓 + 门/宫剋)', () => {
    const p = pal({ palace: 6, gate: '开门', tianPanStems: ['乙'], diPanStem: '戊' });
    expect(wonderNullified('乙', p)).toBe(true);
    expect(hasEffectiveSanQi(p)).toBe(false);
  });
  it('丁 in 离9 (clean) survives as 得奇', () => {
    const p = pal({ palace: 9, gate: '休门', tianPanStems: ['丁'], diPanStem: '戊' });
    expect(wonderNullified('丁', p)).toBe(false);
    expect(effectiveSanQi(p)).toEqual(['丁']);
  });
});

describe('§4.3 baseFilter ladder (strict reading)', () => {
  const at9 = (o: Partial<Palace>) => pal({ palace: 9, diPanStem: '戊', ...o });
  it('三奇 + 三吉门 → 吉方', () => {
    expect(baseFilter(at9({ gate: '开门', tianPanStems: ['丁'] }), [])).toBe('吉方');
  });
  it('得门不得奇 → usable', () => {
    expect(baseFilter(at9({ gate: '休门' }), [])).toBe('usable');
  });
  it('得奇不得门 → not-auspicious (NOT usable) — the R1 strict rule', () => {
    expect(baseFilter(at9({ gate: '死门', tianPanStems: ['丁'] }), [])).toBe('not-auspicious');
  });
  it('无奇无门但逢吉格 → usable (the new fourth rung)', () => {
    expect(baseFilter(at9({ gate: '死门' }), [jiGe])).toBe('usable');
  });
  it('无奇无门无吉格 → 凶方', () => {
    expect(baseFilter(at9({ gate: '死门' }), [])).toBe('凶方');
  });
});
