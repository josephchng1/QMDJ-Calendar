// ─────────────────────────────────────────────────────────────────────────────
// L3 — Engine invariants (self-consistency, no external "truth" needed)
//
// These assert structural laws every correct QMDJ chart must obey, so they
// give CI real teeth today without any hand-verified fixture. They can only
// fail on a genuine engine bug (crash, NaN, malformed board, non-determinism),
// never on a merely "unverified" value — so they are safe to gate merges on.
// The verified-truth checks live in golden.test.ts (see that file).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  buildChart,
  STEMS, BRANCHES, STAR_NAMES, GATE_NAMES, SPIRITS, SPIRITS_VARIANT,
  type ChartInput,
} from '@engine';

const STEM_SET = new Set(STEMS);
const BRANCH_SET = new Set(BRANCHES);
const STAR_SET = new Set(Object.values(STAR_NAMES));
const GATE_SET = new Set(Object.values(GATE_NAMES));
const SPIRIT_SET = new Set([...SPIRITS, ...SPIRITS_VARIANT]);

// A spread of instants: plain daytime, 晚子时 boundary, near a solstice term
// boundary, and one under 拆补法. Not "truth" cases — just varied inputs.
const SAMPLES: ChartInput[] = [
  { y: 2026, m: 3, d: 17, hh: 10, mm: 6 },
  { y: 2026, m: 7, d: 6, hh: 23, mm: 0 },
  { y: 2024, m: 12, d: 21, hh: 6, mm: 30 },
  { y: 2025, m: 6, d: 1, hh: 14, mm: 45, method: 'chaibu' },
];

describe.each(SAMPLES)('invariants for %o', (input) => {
  const chart = buildChart(input);
  const b = chart.board;

  it('has 9 palaces, numbered 1..9', () => {
    expect(b.palaces).toHaveLength(9);
    expect(b.palaces.map((p) => p.palace)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('遁 / 局 / 元 are in range', () => {
    expect(['yang', 'yin']).toContain(chart.juResult.dun);
    expect(chart.juResult.ju).toBeGreaterThanOrEqual(1);
    expect(chart.juResult.ju).toBeLessThanOrEqual(9);
    expect(chart.juResult.yuan).toBeGreaterThanOrEqual(0);
    expect(chart.juResult.yuan).toBeLessThanOrEqual(2);
  });

  it('is deterministic — same input yields an identical chart', () => {
    expect(buildChart(input)).toEqual(chart);
  });

  it('地盘 stems are the 三奇六仪 — 9 distinct stems, one per palace', () => {
    const diPan = b.palaces.map((p) => p.diPanStem);
    diPan.forEach((s) => expect(STEM_SET.has(s)).toBe(true));
    expect(new Set(diPan).size).toBe(9);
  });

  it('every star / gate / spirit / stem is a canonical name', () => {
    for (const p of b.palaces) {
      p.tianPanStems.forEach((s) => expect(STEM_SET.has(s)).toBe(true));
      p.stars.forEach((s) => expect(STAR_SET.has(s)).toBe(true));
      if (p.gate) expect(GATE_SET.has(p.gate)).toBe(true);
      if (p.spirit) expect(SPIRIT_SET.has(p.spirit)).toBe(true);
    }
  });

  it('时空 (hour void) is exactly two valid branches', () => {
    const voids = b.hourKongWang.split('');
    expect(voids).toHaveLength(2);
    voids.forEach((ch) => expect(BRANCH_SET.has(ch)).toBe(true));
  });

  it('every summary string is populated', () => {
    for (const value of Object.values(chart.summary)) {
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});
