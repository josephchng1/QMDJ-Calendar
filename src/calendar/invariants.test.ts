// §5.1 invariants and metamorphic tests. Sweeps 2024–2028, both methods, general mode
// plus all 12 用事 (one test file, ~1.4M cells — slow by design).
import { describe, it, expect } from 'vitest';
import type { Palace } from '../engine/board.ts';
import { buildChart, type Chart } from '../engine/index.ts';
import { STEMS } from '../engine/ganzhi.ts';
import {
  evaluatePalaces, evaluatePalace, assignBand, orderingScore, TUNING,
  type ScoreProfile, type Band, type PalaceEval, type HourCtx,
} from './palace.ts';
import { computeHourSummary } from './hour.ts';
import { searchRange } from './search.ts';
import { displayScore, DISPLAY_RANGE } from './bandsV2.ts';
import { isWuBuYuShi } from './data/structural.ts';
import { ACTIVITY_ORDER } from './data/presets.ts';
import { TIER_WEIGHTS } from './data/patterns.ts';
import { AMPLITUDE } from './strength.ts';
import { YONGSHEN } from './profiles.ts';
import { HOUR_SAMPLE } from './summary.ts';
import { evaluateChart, reconcile, type MatchedFormation } from './evaluator.ts';

const METHODS = ['zhirun', 'chaibu'] as const;
const PROFILES: ScoreProfile[] = [{ kind: 'general' },
  ...ACTIVITY_ORDER.map((a): ScoreProfile => ({ kind: 'purpose', activity: a }))];
const bandOfDisplay = (d: number): Band => (d >= DISPLAY_RANGE.prime[0] ? 'prime' : d >= DISPLAY_RANGE.good[0] ? 'good' : 'plain');

function* charts(y0: number, y1: number, method: string, stepDays = 1): Generator<Chart> {
  for (let dt = new Date(y0, 0, 1); dt.getFullYear() <= y1; dt.setDate(dt.getDate() + stepDays)) {
    for (const hh of HOUR_SAMPLE) {
      yield buildChart({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), hh, mm: 0,
        method: method as 'zhirun', lateZiNextDay: true });
    }
  }
}

describe('invariants 2024–2028 × both methods × general + 12 用事', () => {
  it('band/display agree, blocked cells carry no number, reasons exist, 五不遇时 has no usable direction', () => {
    const bad = { disagree: 0, blockedNumber: 0, noReason: 0, wbysUsable: 0 };
    let cells = 0;
    for (const method of METHODS) for (const chart of charts(2024, 2028, method)) {
      const wbys = isWuBuYuShi(STEMS[chart.pillars.day.stem], chart.pillars.hour.name);
      for (const profile of PROFILES) {
        for (const p of evaluatePalaces(chart, profile)) {
          if (p.palace === 5) continue;
          cells++;
          if (p.blocked) { if (p.display !== null) bad.blockedNumber++; continue; }
          if (wbys) bad.wbysUsable++;
          if (p.display == null || bandOfDisplay(p.display) !== p.band) bad.disagree++;
          if (p.band !== 'plain' && !p.reasons.some((r) => r.trim())) bad.noReason++;
        }
      }
    }
    expect(cells).toBeGreaterThan(1_000_000);
    expect(bad).toEqual({ disagree: 0, blockedNumber: 0, noReason: 0, wbysUsable: 0 });
  }, 600_000);

  it('hour counts and board agree (computeHourSummary), sampled', () => {
    for (const method of METHODS) for (const chart of charts(2024, 2028, method, 11)) {
      const hs = computeHourSummary(chart);
      const outer = hs.palaces.filter((p) => p.palace !== 5 && !p.blocked);
      expect(hs.counts).toEqual({
        prime: outer.filter((p) => p.band === 'prime').length,
        good: outer.filter((p) => p.band === 'good').length,
      });
    }
  }, 120_000);

  it('search: no blocked slot above an unblocked one; slot band/display == board cell', () => {
    for (const method of METHODS) for (const activity of ACTIVITY_ORDER) {
      const r = searchRange({ start: { y: 2026, m: 12, d: 1 }, days: 20, mode: 'recommended',
        activity, options: { method, lateZiNextDay: true }, limit: 9999 });
      let seenBlocked = false;
      for (const s of r.slots) {
        if (s.blocked) { seenBlocked = true; expect(s.display).toBeNull(); continue; }
        expect(seenBlocked).toBe(false);
        const chart = buildChart({ y: s.y, m: s.m, d: s.d, hh: s.hh, mm: 0, method, lateZiNextDay: true });
        const cell = computeHourSummary(chart, { kind: 'purpose', activity }).palaces
          .find((p) => p.direction === s.direction)!;
        expect([s.band, s.display]).toEqual([cell.band, cell.display]);
      }
    }
  }, 300_000);
});

// ─── metamorphic ─────────────────────────────────────────────────────────────
/** Multiply every numeric leaf of the tuning tables by k, in place; returns an undo. */
function scaleAll(k: number): () => void {
  const undo: (() => void)[] = [];
  const walk = (o: Record<string, unknown>) => {
    for (const key of Object.keys(o)) {
      const v = o[key];
      if (typeof v === 'number') { o[key] = v * k; undo.push(() => { o[key] = v; }); }
      else if (v && typeof v === 'object') walk(v as Record<string, unknown>);
    }
  };
  for (const t of [TUNING, TIER_WEIGHTS, AMPLITUDE, YONGSHEN]) walk(t as unknown as Record<string, unknown>);
  return () => undo.forEach((f) => f());
}

describe('metamorphic', () => {
  const sample = [...charts(2026, 2026, 'zhirun', 9)];

  it('multiplying every tuning constant by 10 changes no band', () => {
    const before = sample.map((c) => PROFILES.slice(0, 3).map((pr) => evaluatePalaces(c, pr).map((p) => `${p.band}${p.blocked}`)));
    const undo = scaleAll(10);
    try {
      const after = sample.map((c) => PROFILES.slice(0, 3).map((pr) => evaluatePalaces(c, pr).map((p) => `${p.band}${p.blocked}`)));
      expect(after).toEqual(before);
    } finally { undo(); }
  }, 120_000);

  it('adding a 凶格 to a palace never raises its display score', () => {
    const xiong: MatchedFormation = { id: 'x-test', name: '凶格', nameEn: 'x', tier: 'inauspicious',
      scope: 'palace', favours: [], avoid: [], confidence: 'consensus' };
    let checked = 0;
    for (const chart of sample) {
      const byPalace = new Map<number, MatchedFormation[]>();
      for (const f of evaluateChart(chart)) if (f.palace != null) byPalace.set(f.palace, [...(byPalace.get(f.palace) ?? []), f]);
      for (const p of chart.board.palaces) {
        if (p.palace === 5) continue;
        const m = reconcile(byPalace.get(p.palace) ?? []);
        const a = evaluatePalace(chart, p, m, { kind: 'general' }).display ?? -1;
        const b = evaluatePalace(chart, p, [...m, xiong], { kind: 'general' }).display ?? -1;
        expect(b).toBeLessThanOrEqual(a);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  }, 120_000);

  it('strengthening a 吉门\'s vitality never lowers its display score', () => {
    const ladder = ['死', '囚', '休', '相', '旺'] as const;
    const hour: HourCtx = { wuBuYuShi: false, tianXian: false, xunShouYi: '戊', rep: {
      starFuYin: false, starFanYin: false, gateFuYin: false, gateFanYin: false,
      fuYin: false, fanYin: false, anyFuYin: false, anyFanYin: false } };
    const gen: ScoreProfile = { kind: 'general' };
    const disp = (p: Palace, ev: PalaceEval) => {
      const r = assignBand(ev, p, hour, gen);
      return r.blocked ? -1 : displayScore(orderingScore(p, ev, gen), r.band, 'zhirun', 'general');
    };
    const jige: MatchedFormation = { id: 'qinglong-fanshou', name: '青龙返首', nameEn: 'x', tier: 'supreme-auspicious',
      scope: 'palace', favours: [], avoid: [], confidence: 'consensus' };
    let checked = 0;
    for (const gate of ['开门', '休门', '生门']) for (const hasQi of [true, false])
      for (const menGong of ['比和', '迫', '和', '制'] as const) for (const kongWang of [false, true])
        for (const spirit of [null, '九天']) for (const matched of [[], [jige]]) {
          const p: Palace = { palace: 6, spirit, gate, stars: ['天心'], tianPanStems: hasQi ? ['丁'] : ['戊'],
            diPanStem: '己', isZhiFu: false, isZhiShi: false, isHourKong: kongWang, isMaXing: false };
          let last = -Infinity;
          for (const v of ladder) {
            const ev: PalaceEval = { palace: 6, door: gate, hasQi, matched, menGong, kongWang,
              ruMu: false, jiXing: false, shiGanRuMu: false, hourTomb: false, xing: false, controlled: false,
              hardGe: [], primaryStar: '天心', spirit, strength: { gate: v, star: '相', spirit: null, stems: {} } };
            const d = disp(p, ev);
            expect(d).toBeGreaterThanOrEqual(last);
            last = d; checked++;
          }
        }
    expect(checked).toBeGreaterThan(500);
  });
});
