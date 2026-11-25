// §3 of the 2026-11-25 build spec: blocks, demotions and 伏吟/反吟, one positive and
// one negative fixture each. Hand-built facts, so each rule is tested in isolation.
import { describe, it, expect } from 'vitest';
import type { Palace } from '../engine/board.ts';
import { buildChart } from '../engine/index.ts';
import { STEMS } from '../engine/ganzhi.ts';
import { assignBand, type PalaceEval, type HourCtx, type ScoreProfile } from './palace.ts';
import { isWuBuYuShi, type Repetition } from './data/structural.ts';
import { matchPalace } from './evaluator.ts';
import { PATTERNS_BY_ID } from './data/patterns.ts';
import { HOUR_SAMPLE } from './summary.ts';
import type { MatchedFormation } from './evaluator.ts';

const gen: ScoreProfile = { kind: 'general' };
const fmt = (id: string, name: string, tier: MatchedFormation['tier']): MatchedFormation =>
  ({ id, name, nameEn: id, tier, scope: 'palace', favours: [], avoid: [], confidence: 'consensus' });
const QLFS = fmt('qinglong-fanshou', '青龙返首', 'supreme-auspicious');
const TIANDUN = fmt('tian-dun', '天遁', 'supreme-auspicious');
const JIGE = fmt('x', '吉格', 'auspicious');

const pal = (over: Partial<Palace> = {}): Palace => ({
  palace: 6, spirit: null, gate: '开门', stars: [], tianPanStems: ['丁'], diPanStem: '戊',
  isZhiFu: false, isZhiShi: false, isHourKong: false, isMaXing: false, ...over,
});
/** A clean 奇门相会 at full vitality → 大吉 before any rule fires. */
const ev = (over: Partial<PalaceEval> = {}): PalaceEval => ({
  palace: 6, door: '开门', hasQi: true, matched: [], menGong: '比和', kongWang: false,
  ruMu: false, jiXing: false, shiGanRuMu: false, hourTomb: false, xing: false,
  controlled: false, hardGe: [], primaryStar: null, spirit: null,
  strength: { gate: '旺', star: null, spirit: null, stems: {} }, ...over,
});
const NO_REP: Repetition = {
  starFuYin: false, starFanYin: false, gateFuYin: false, gateFanYin: false,
  fuYin: false, fanYin: false, anyFuYin: false, anyFanYin: false,
};
const hour = (rep: Partial<Repetition> = {}, over: Partial<HourCtx> = {}): HourCtx => {
  const r = { ...NO_REP, ...rep };
  r.fuYin = r.anyFuYin = r.starFuYin;     // star ring only (2026-11-26)
  r.fanYin = r.anyFanYin = r.starFanYin;
  return { wuBuYuShi: false, rep: r, tianXian: false, xunShouYi: '戊', ...over };
};
const band = (e: PalaceEval, h = hour(), p = pal()) => assignBand(e, p, h, gen);

describe('§3.1 blocks — nothing rescues them, not even 青龙返首 + 天遁', () => {
  const stacked = [QLFS, TIANDUN];
  const cases: [string, Partial<PalaceEval>, HourCtx?][] = [
    ['五不遇时', {}, hour({}, { wuBuYuShi: true })],
    ['六仪击刑', { jiXing: true }],
    ['三奇入墓', { ruMu: true }],
    ['三奇受制', { controlled: true }],
    ['时干入墓', { shiGanRuMu: true }],
    ...['天网四张', '大格', '刑格', '小格', '岁格', '月格', '日格', '时格', '伏宫格', '飞干格', '飞宫格']
      .map((n): [string, Partial<PalaceEval>] => [n, { hardGe: [n] }]),
  ];
  for (const [name, over, h] of cases) {
    it(`${name} → blocked`, () => {
      const r = band(ev({ matched: stacked, ...over }), h);
      expect(r.blocked).toBe(true);
      expect(r.band).toBe('plain');
      expect(r.reasons.join('')).toContain(name);
    });
  }
  it('negative: the same stacked palace without a block is 大吉', () => {
    const r = band(ev({ matched: stacked }));
    expect(r.blocked).toBe(false);
    expect(r.band).toBe('prime');
  });
});

describe('§3.4 月格 / 日格 / 时格 match 天盘庚 over the pillar stem', () => {
  const p = (di: string) => pal({ tianPanStems: ['庚'], diPanStem: di });
  for (const [id, ref] of [['yue-ge', 'monthStem'], ['ri-ge', 'dayStem'], ['shi-ge', 'hourStem']] as const) {
    it(id, () => {
      const w = PATTERNS_BY_ID[id].when;
      expect(matchPalace(w, p('丁'), { [ref]: '丁' })).toBe(true);
      expect(matchPalace(w, p('丁'), { [ref]: '辛' })).toBe(false);
      expect(matchPalace(w, pal({ tianPanStems: ['乙'], diPanStem: '丁' }), { [ref]: '丁' })).toBe(false);
      // a 甲 pillar stem never sits on the 地盘, so the rule cannot fire (reported, not resolved)
      expect(matchPalace(w, p('戊'), { [ref]: '甲' })).toBe(false);
    });
  }
});

describe('五不遇时 — the ten-entry table, exactly 1 时辰 in 12', () => {
  const count = (y: number, m: number, d0: number, days: number) => {
    let n = 0, hours = 0;
    for (let i = 0; i < days; i++) for (const hh of HOUR_SAMPLE) {
      const c = buildChart({ y, m, d: d0 + i, hh, mm: 0 });
      hours++;
      if (isWuBuYuShi(STEMS[c.pillars.day.stem], c.pillars.hour.name)) n++;
    }
    return { n, hours };
  };
  it('12 of 144 over a 12-day run', () => expect(count(2026, 3, 5, 12)).toEqual({ n: 12, hours: 144 }));
  it('exactly 1 in 12 over 2026', () => {
    const { n, hours } = count(2026, 1, 1, 365);
    expect(n * 12).toBe(hours);
  });
});

describe('§3.2 demotions — one band each, applied once, stacking', () => {
  it('门迫 alone drops 大吉 → 吉', () => expect(band(ev({ menGong: '迫' })).band).toBe('good'));
  it('空亡 alone drops 大吉 → 吉', () => expect(band(ev({ kongWang: true })).band).toBe('good'));
  it('both drop two: 大吉 → 不吉 (门迫 to 吉, then 空亡)', () =>
    expect(band(ev({ menGong: '迫', kongWang: true })).band).toBe('plain'));
  it('门迫 never takes a 吉门 below 吉 (得门不得奇 stays 吉)', () =>
    expect(band(ev({ hasQi: false, menGong: '迫' })).band).toBe('good'));
  it('no cause drops twice — each reason appears once', () => {
    for (const over of [{ menGong: '迫' as const }, { kongWang: true }]) {
      const r = band(ev(over));
      expect(r.band).toBe('good');
      const tag = over.kongWang ? '空亡' : '门迫';
      expect(r.reasons.filter((x) => x.includes(tag))).toHaveLength(1);
    }
  });
  it('凶门被迫 → blocked, even with 青龙返首 (practitioner ruling 2026-11-25)', () => {
    const r = band(ev({ door: '死门', hasQi: true, menGong: '迫', matched: [QLFS] }));
    expect(r.blocked).toBe(true);
    expect(r.reasons.join('')).toContain('凶门被迫');
  });
  it('negative: 迫 on a neutral gate (杜门) neither blocks nor demotes', () =>
    expect(band(ev({ door: '杜门', hasQi: false, menGong: '迫', matched: [JIGE] })).band).toBe('good'));
});

describe('§3.3 伏吟 / 反吟 per palace (S0 p131)', () => {
  const plainPal = ev({ door: '死门', hasQi: false });
  it('伏吟 in 天显时 → no effect, even with no rescuer', () => {
    const r = band(plainPal, hour({ starFuYin: true, gateFuYin: true }, { tianXian: true }));
    expect(r.blocked).toBe(false);
    expect(band(ev(), hour({ starFuYin: true }, { tianXian: true })).band).toBe('prime');
  });
  it('worst 伏吟: 天蓬 over 天蓬 → blocked despite a good gate', () => {
    const r = band(ev({ palace: 1, door: '休门' }), hour({ starFuYin: true }),
      pal({ palace: 1, gate: '休门', stars: ['天蓬'] }));
    expect(r.blocked).toBe(true);
  });
  it('worst 伏吟: 死门 over 死门 (star 伏吟 with gates home) → blocked despite a 吉格', () => {
    const p = pal({ palace: 2, gate: '死门' });
    expect(band(ev({ door: '死门', hasQi: false, matched: [JIGE] }), hour({ starFuYin: true, gateFuYin: true }), p).blocked).toBe(true);
    // negative: star-ring 伏吟 only → 死门 at 2 is not the worst case; the 吉格 rescues
    const r = band(ev({ door: '死门', hasQi: false, matched: [JIGE] }), hour({ starFuYin: true }), p);
    expect(r.blocked).toBe(false);
    expect(r.band).toBe('plain');   // 逢吉格 吉 → demoted one
  });
  it('worst 伏吟: 辛 over 辛 in a 甲午 旬 hour → blocked; other 旬 not', () => {
    const p = pal({ palace: 9, tianPanStems: ['辛'], diPanStem: '辛' });
    expect(band(ev(), hour({ starFuYin: true }, { xunShouYi: '辛' }), p).blocked).toBe(true);
    expect(band(ev(), hour({ starFuYin: true }, { xunShouYi: '戊' }), p).blocked).toBe(false);
  });
  it('伏吟 with a good gate → down one band (有救)', () =>
    expect(band(ev(), hour({ starFuYin: true })).band).toBe('good'));
  it('伏吟 with only a 吉格 → down one band', () =>
    expect(band(ev({ door: '死门', hasQi: false, matched: [JIGE] }), hour({ starFuYin: true })).band).toBe('plain'));
  it('伏吟 with no rescuer → blocked', () => expect(band(plainPal, hour({ starFuYin: true })).blocked).toBe(true));
  it('反吟 (star) rescued by 三奇 alone → not blocked', () => {
    const r = band(ev({ door: '死门' }), hour({ starFanYin: true }));
    expect(r.blocked).toBe(false);
  });
  it('反吟 (star) with a good gate → down one', () =>
    expect(band(ev(), hour({ starFanYin: true })).band).toBe('good'));
  it('反吟 (star) with no rescuer → blocked', () =>
    expect(band(plainPal, hour({ starFanYin: true })).blocked).toBe(true));
  it('门伏吟 / 门反吟 alone have no effect (gate ring ignored, 2026-11-26)', () => {
    expect(band(ev(), hour({ gateFuYin: true })).band).toBe('prime');
    expect(band(ev(), hour({ gateFanYin: true })).band).toBe('prime');
    expect(band(plainPal, hour({ gateFuYin: true, gateFanYin: true })).blocked).toBe(false);
  });
  it('a gate ring on top of a star ring changes nothing', () => {
    expect(band(ev(), hour({ starFanYin: true, gateFanYin: true })).band).toBe('good');
    expect(band(ev(), hour({ starFuYin: true, gateFanYin: true })).band).toBe('good');
  });
  it('negative: no 伏吟/反吟 → untouched 大吉', () => expect(band(ev()).band).toBe('prime'));
});
