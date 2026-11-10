// Predicate logic — tested with hand-built minimal Palace/Chart inputs. These
// assert the RULE, not any real chart (real-chart golden fixtures stay Joe's to
// bless). Synthetic inputs are explicit, so the logic is verified deterministically.
import { describe, it, expect } from 'vitest';
import { STEMS } from '../../engine/ganzhi.ts';
import type { Palace, Board } from '../../engine/board.ts';
import { buildChart, type Chart } from '../../engine/index.ts';
import { HOUR_SAMPLE } from '../summary.ts';
import {
  controls, generates, chong,
  isWuBuYuShi, WU_BU_YU_TABLE,
  isLiuYiJiXing, sanQiRuMu, isSanQiRuMu,
  isHourStemTomb, sanQiControlled,
  menGongRelation, isMenPo, isGongPo,
  repetition, isTianXianShi, stemMarks,
} from './structural.ts';

function palace(over: Partial<Palace> & { palace: number }): Palace {
  return {
    spirit: null, gate: null, stars: [], tianPanStems: [], diPanStem: '戊',
    isZhiFu: false, isZhiShi: false, isHourKong: false, isMaXing: false,
    ...over,
  };
}
function board(palaces: Palace[]): Board {
  return { palaces } as unknown as Board;
}
function chartWith(hourStem: string, palaces: Palace[]): Chart {
  return { pillars: { hour: { stem: STEMS.indexOf(hourStem) } }, board: board(palaces) } as unknown as Chart;
}

describe('element relations', () => {
  it('克 cycle', () => {
    expect(controls('木', '土')).toBe(true);
    expect(controls('金', '木')).toBe(true);
    expect(controls('木', '金')).toBe(false);
  });
  it('生 cycle', () => {
    expect(generates('木', '火')).toBe(true);
    expect(generates('金', '水')).toBe(true);
    expect(generates('火', '木')).toBe(false);
  });
  it('沖 palace', () => {
    expect(chong(1)).toBe(9);
    expect(chong(4)).toBe(6);
    expect(chong(5)).toBeNull();
  });
});

describe('五不遇时', () => {
  it('matches the whole canonical table', () => {
    for (const [day, cell] of Object.entries(WU_BU_YU_TABLE)) {
      const hourStem = cell[0]; // first char of e.g. 庚午时
      expect(isWuBuYuShi(day, hourStem), `${day}日 ${cell}`).toBe(true);
    }
  });
  it('is false when polarity differs (甲日 辛时: 辛克甲 but yin vs yang)', () => {
    expect(isWuBuYuShi('甲', '辛')).toBe(false);
  });
  it('is false when the hour does not 克 the day', () => {
    expect(isWuBuYuShi('甲', '丙')).toBe(false); // 丙火 does not 克 甲木
  });
});

describe('六仪击刑', () => {
  it('fires when 仪 sits in its punishment palace', () => {
    expect(isLiuYiJiXing(palace({ palace: 3, diPanStem: '戊' }))).toBe(true); // 戊→3震
    expect(isLiuYiJiXing(palace({ palace: 4, diPanStem: '癸' }))).toBe(true); // 癸→4巽
  });
  it('does not fire elsewhere', () => {
    expect(isLiuYiJiXing(palace({ palace: 4, diPanStem: '戊' }))).toBe(false);
  });
  it('天盘 option reads the 天盘 stems instead (either of two)', () => {
    const p = palace({ palace: 4, diPanStem: '戊', tianPanStems: ['丙', '壬'] });
    expect(isLiuYiJiXing(p)).toBe(false);
    expect(isLiuYiJiXing(p, 'tian')).toBe(true);
    expect(isLiuYiJiXing(palace({ palace: 3, diPanStem: '戊', tianPanStems: ['丁'] }), 'tian')).toBe(false);
  });
});

describe('三奇入墓', () => {
  it('乙 tombs in BOTH 坤2 and 乾6', () => {
    expect(sanQiRuMu(palace({ palace: 2, tianPanStems: ['乙'] }))).toEqual(['乙']);
    expect(sanQiRuMu(palace({ palace: 6, tianPanStems: ['乙'] }))).toEqual(['乙']);
  });
  it('丙→乾6, 丁→艮8', () => {
    expect(isSanQiRuMu(palace({ palace: 6, tianPanStems: ['丙'] }))).toBe(true);
    expect(isSanQiRuMu(palace({ palace: 8, tianPanStems: ['丁'] }))).toBe(true);
  });
  it('no tomb outside the mapped palaces', () => {
    expect(isSanQiRuMu(palace({ palace: 3, tianPanStems: ['乙'] }))).toBe(false);
    expect(isSanQiRuMu(palace({ palace: 8, tianPanStems: ['丙'] }))).toBe(false);
  });
});

describe('时干入墓', () => {
  it('fires when the hour stem sits in its own tomb palace', () => {
    const ch = chartWith('丙', [palace({ palace: 6, tianPanStems: ['丙'] })]); // 丙 tomb = 乾6
    expect(isHourStemTomb(ch)).toBe(true);
  });
  it('does not fire elsewhere', () => {
    const ch = chartWith('丙', [palace({ palace: 1, tianPanStems: ['丙'] })]);
    expect(isHourStemTomb(ch)).toBe(false);
  });
  it('never fires on a 甲-hour (天显时 takes over)', () => {
    const ch = chartWith('甲', [palace({ palace: 2, tianPanStems: ['戊'] })]);
    expect(isHourStemTomb(ch)).toBe(false);
  });
});

describe('三奇受制', () => {
  it('火入水乡: 丙/丁 in 坎1 or over 壬/癸', () => {
    expect(sanQiControlled(palace({ palace: 1, tianPanStems: ['丙'] }))).toEqual(['丙']);
    expect(sanQiControlled(palace({ palace: 9, tianPanStems: ['丁'], diPanStem: '癸' }))).toEqual(['丁']);
  });
  it('木入金乡: 乙 in 乾6/兑7 or over 庚/辛', () => {
    expect(sanQiControlled(palace({ palace: 3, tianPanStems: ['乙'], diPanStem: '庚' }))).toEqual(['乙']);
    expect(sanQiControlled(palace({ palace: 7, tianPanStems: ['乙'] }))).toEqual(['乙']);
  });
  it('unshackled wonder is clear', () => {
    expect(sanQiControlled(palace({ palace: 3, tianPanStems: ['乙'], diPanStem: '丁' }))).toEqual([]);
  });
});

describe('门迫 / 宫迫 / 和义', () => {
  it('门迫 = 门克宫 (开门金 in 震3木)', () => {
    expect(menGongRelation('开门', 3)).toBe('迫');
    expect(isMenPo('开门', 3)).toBe(true);
  });
  it('宫制 = 宫克门 (开门金 in 离9火: 火克金) — 凶不起', () => {
    expect(menGongRelation('开门', 9)).toBe('制');
    expect(isGongPo('开门', 9)).toBe(true);
  });
  it('和 = 门生宫 (开门金 in 坎1水: 金生水)', () => {
    expect(menGongRelation('开门', 1)).toBe('和');
  });
  it('义 = 宫生门 (生门土 in 离9火: 火生土)', () => {
    expect(menGongRelation('生门', 9)).toBe('义');
  });
  it('比和 = same element; 中5 = null', () => {
    expect(menGongRelation('开门', 6)).toBe('比和'); // 金/金
    expect(menGongRelation('开门', 5)).toBeNull();
  });
});

describe('伏吟 / 反吟 (2026-07-29, validated by Joe)', () => {
  const opts = { method: 'zhirun', spiritVariant: false, lateZiNextDay: true } as const;
  const rep = (branchIndex: number) =>
    repetition(buildChart({ y: 2026, m: 7, d: 29, hh: HOUR_SAMPLE[branchIndex], mm: 0, ...opts }).board);

  // 值符 mechanism only — the 值使 gate ring must NOT count (it over-fired 未/酉).
  it('子时 甲子 = 伏吟 (值符归本位; 甲-hour/天显时 still reported)', () => {
    expect(rep(0).fuYin).toBe(true);
    expect(rep(0).fanYin).toBe(false);
  });
  it('寅时 丙寅 = 反吟', () => {
    expect(rep(2).fanYin).toBe(true);
    expect(rep(2).fuYin).toBe(false);
  });
  it('辰时 戊辰 = 伏吟', () => {
    expect(rep(4).fuYin).toBe(true);
  });
  it('未时 辛未 = neither (gate-ring alignment must not count)', () => {
    expect(rep(7).fuYin).toBe(false);
    expect(rep(7).fanYin).toBe(false);
  });
  it('酉时 癸酉 = neither', () => {
    expect(rep(9).fuYin).toBe(false);
    expect(rep(9).fanYin).toBe(false);
  });
});

describe('天显时', () => {
  it('true only for a 甲-hour', () => {
    expect(isTianXianShi(chartWith('甲', []))).toBe(true);
    expect(isTianXianShi(chartWith('乙', []))).toBe(false);
  });
});

describe('stemMarks (display only)', () => {
  it.each([
    ['壬', 4, '刑墓'], ['庚', 8, '刑墓'], ['己', 2, '刑'], ['戊', 3, '刑'], ['辛', 9, '刑'],
    ['乙', 6, '墓'], ['癸', 2, '墓'], ['己', 8, '墓'], ['乙', 2, '墓'], ['丁', 6, ''], ['丙', 4, ''],
  ])('%s@%i → %s', (s, p, want) => expect(stemMarks(s, p)).toBe(want));

  it('isMenPo for the marker', () => {
    for (const [g, p] of [['伤门', 2], ['开门', 3], ['死门', 1], ['景门', 6], ['惊门', 4]] as const) expect(isMenPo(g, p)).toBe(true);
    for (const [g, p] of [['杜门', 7], ['休门', 2], ['死门', 3], ['开门', 9]] as const) expect(isMenPo(g, p)).toBe(false);
  });
});
