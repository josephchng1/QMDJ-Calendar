import { describe, it } from 'vitest';
import { buildChart } from '../engine/index.ts';
import { repetition, chong } from './data/structural.ts';
import { HOUR_SAMPLE, type CalendarOptions } from './summary.ts';

const STAR_HOME: Record<string, number> = {
  天蓬: 1, 天芮: 2, 天冲: 3, 天辅: 4, 天禽: 5, 天心: 6, 天柱: 7, 天任: 8, 天英: 9,
};

describe('DIAG', () => {
  it('fuyin/fanyin 2026-07-29', () => {
    const opts: CalendarOptions = { method: 'zhirun', spiritVariant: false, lateZiNextDay: true };
    const rows = HOUR_SAMPLE.map((hh) => {
      const c = buildChart({ y: 2026, m: 7, d: 29, hh, mm: 0, ...opts });
      const b = c.board;
      const originRaw = STAR_HOME[b.zhiFuStar];
      const O = originRaw === 5 ? 2 : originRaw;
      const zf = b.zhiFuDisplayPalace, zs = b.zhiShiDisplayPalace;
      const rep = repetition(b);
      return {
        h: c.pillars.hour.name,
        star: b.zhiFuStar, O, zf, zs, chO: chong(O),
        starFu: zf === O, starFan: zf === chong(O),
        gateFu: zs === O, gateFan: zs === chong(O),
        curFu: rep.anyFuYin, curFan: rep.anyFanYin,
      };
    });
    // eslint-disable-next-line no-console
    console.log('DIAG>>>' + JSON.stringify(rows) + '<<<DIAG');
  });
});
