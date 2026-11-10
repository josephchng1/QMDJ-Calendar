import { describe, it, expect } from 'vitest';
import { lunarDate } from './lunar.ts';
import { dayGanZhi, dayNumber } from '../engine/ganzhi.ts';

describe('lunarDate', () => {
  it.each([
    [2026, 7, 8, '五月', '廿四', false],
    [2026, 2, 5, '腊月', '十八', false],
    [2025, 12, 25, '冬月', '初六', false],
    [2025, 8, 22, '闰六月', '廿九', false],
    [2026, 2, 17, '正月', '初一', true],
    [2025, 7, 25, '闰六月', '初一', true],
  ])('%i-%i-%i → %s %s', (y, m, d, month, day, first) => {
    expect(lunarDate(y, m, d)).toEqual({ month, day, first });
  });
});

describe('day pillar', () => {
  it.each([
    [2026, 7, 8, '癸未'], [2025, 12, 25, '戊辰'], [2025, 8, 22, '癸亥'], [2026, 2, 5, '庚戌'],
  ])('%i-%i-%i → %s', (y, m, d, gz) => {
    expect(dayGanZhi(dayNumber(y, m, d)).name).toBe(gz);
  });
});
