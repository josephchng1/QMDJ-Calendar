// ─────────────────────────────────────────────────────────────────────────────
// L2 (partial) — solar-term accuracy + the month-pillar boundary rule.
//
// Everything downstream hangs off the term solve: 局数 (§4.3 Bug 2) and the
// month pillar (§4.3 Bug 1) are both decided by comparing an instant against an
// exact term crossing. If the solve drifts, those go wrong silently and no
// golden fixture necessarily catches it — a fixture asserts one instant, not the
// boundary either side of it.
//
// PROVENANCE, PLAINLY: the 12 timestamps below are the term times displayed by
// the SAME reference app the golden fixtures were transcribed from (they were
// carried in qimen-engine/tests/references.ts alongside the charts). They are a
// second AXIS of agreement with that source — not a second independent source.
// The two-independent-reference criterion (§4.4) is still open; see
// tooling/README-ci.md.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { solarTermsOfYear, jdFromGregorian, buildChart } from '@engine';

interface TermTime { name: string; y: number; m: number; d: number; hh: number; mm: number }

/** Term times as displayed by the reference app (transcribed with the charts). */
const TERM_TIMES: TermTime[] = [
  { name: '大雪', y: 2025, m: 12, d: 7, hh: 5, mm: 4 },
  { name: '冬至', y: 2025, m: 12, d: 21, hh: 23, mm: 2 },
  { name: '小寒', y: 2026, m: 1, d: 5, hh: 16, mm: 22 },
  { name: '大寒', y: 2026, m: 1, d: 20, hh: 9, mm: 44 },
  { name: '立春', y: 2026, m: 2, d: 4, hh: 4, mm: 1 },
  { name: '雨水', y: 2026, m: 2, d: 18, hh: 23, mm: 51 },
  { name: '惊蛰', y: 2026, m: 3, d: 5, hh: 21, mm: 58 },
  { name: '春分', y: 2026, m: 3, d: 20, hh: 22, mm: 45 },
  { name: '小暑', y: 2026, m: 7, d: 7, hh: 9, mm: 56 },
  { name: '大暑', y: 2026, m: 7, d: 23, hh: 3, mm: 12 },
  { name: '大雪', y: 2019, m: 12, d: 7, hh: 18, mm: 18 },
  { name: '冬至', y: 2019, m: 12, d: 22, hh: 12, mm: 19 },
];

const TOLERANCE_MIN = 2;

describe('solar-term solve matches the reference times (±2 min)', () => {
  for (const t of TERM_TIMES) {
    it(`${t.y} ${t.name} → ${t.m}/${t.d} ${String(t.hh).padStart(2, '0')}:${String(t.mm).padStart(2, '0')}`, () => {
      const expected = jdFromGregorian(t.y, t.m, t.d) + (t.hh * 60 + t.mm) / 1440;
      const found = solarTermsOfYear(t.y)
        .filter((x) => x.name === t.name)
        .find((x) => Math.abs(x.jdLocal - jdFromGregorian(t.y, t.m, t.d)) < 20);
      expect(found, `${t.name} ${t.y} not found in that year's terms`).toBeDefined();
      const diffMin = (found!.jdLocal - expected) * 1440;
      expect(Math.abs(diffMin)).toBeLessThanOrEqual(TOLERANCE_MIN);
    });
  }
});

// ─── the month pillar turns at the exact 节, not at midnight (§4.3 Bug 1) ─────
//
// Both cases below are on a 节 day, before the crossing, so the month must still
// be the PREVIOUS one. 2025-02-03 is additionally a 立春 case, so the YEAR pillar
// must not turn either. The app agrees with the engine on the 立春 case and
// disagrees on the 白露 one — which is why the 白露 golden fixture carries a
// documented divergence rather than the app's displayed value.
describe('月柱 turns at the exact 节, not at civil-day granularity', () => {
  it('2025-02-03 12:32 — before 立春 (22:10): year AND month unchanged', () => {
    const c = buildChart({ y: 2025, m: 2, d: 3, hh: 12, mm: 32 });
    expect(c.pillars.year.name).toBe('甲辰');
    expect(c.pillars.month.name).toBe('丁丑');
  });

  it('2025-02-04 12:32 — after 立春: year AND month have turned', () => {
    const c = buildChart({ y: 2025, m: 2, d: 4, hh: 12, mm: 32 });
    expect(c.pillars.year.name).toBe('乙巳');
    expect(c.pillars.month.name).toBe('戊寅');
  });

  it('2025-09-07 16:00 — before 白露 (16:51): month still 甲申', () => {
    expect(buildChart({ y: 2025, m: 9, d: 7, hh: 16, mm: 0 }).pillars.month.name).toBe('甲申');
  });

  it('2025-09-07 17:00 — after 白露: month has turned to 乙酉', () => {
    expect(buildChart({ y: 2025, m: 9, d: 7, hh: 17, mm: 0 }).pillars.month.name).toBe('乙酉');
  });

  it('the two 节 cases are the same shape — one rule, applied consistently', () => {
    const beforeLiChun = buildChart({ y: 2025, m: 2, d: 3, hh: 12, mm: 32 }).pillars.month.name;
    const beforeBaiLu = buildChart({ y: 2025, m: 9, d: 7, hh: 16, mm: 0 }).pillars.month.name;
    // Neither has advanced past its same-day 节 — the property that matters.
    expect([beforeLiChun, beforeBaiLu]).toEqual(['丁丑', '甲申']);
  });
});
