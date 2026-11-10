import { describe, it, expect } from 'vitest';
import { gateColor, starColor, spiritColor } from './qmdata.ts';

describe('symbol colour modes', () => {
  it('luck mode is unchanged; element mode uses 五行', () => {
    expect(gateColor('开门')).toBe('var(--gold)');
    expect(gateColor('开门', 'element')).toBe('var(--metal)');
    expect(starColor('天蓬', 'element')).toBe('var(--water)');
    expect(spiritColor('值符', 'element')).toBe('var(--wood)');
  });
});
