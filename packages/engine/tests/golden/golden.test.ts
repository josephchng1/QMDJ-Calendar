// ─────────────────────────────────────────────────────────────────────────────
// L1 — Golden fixtures (verified truth)
//
// Each *.fixture.json here is a chart whose expected values were confirmed by a
// domain expert against external references (see fixture.schema.json → sources /
// verified). This runner does NOT invent truth: it loads whatever verified
// fixtures exist and checks the engine reproduces them. With zero fixtures it
// registers a single todo so the gap is visible but CI stays green.
//
// Coverage: the summary-level facts you read straight off a reference chart —
// pillars, 遁/局, 旬首, 值符, 值使, 时空, 马星 — plus a palace-by-palace comparison
// of 神/门/星/天盘/地盘 for every palace the fixture actually carries. A fixture may
// carry a SUBSET of palaces: the transcribed reference set covers the 8 outer
// palaces, and 中五宫 was never transcribed, so it is omitted rather than guessed.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildChart, type Chart, type ChartInput } from '@engine';

const HERE = dirname(fileURLToPath(import.meta.url));

interface PalaceFixture {
  diPanStems: string[];
  tianPanStems: string[];
  stars: string[];
  gate: string | null;
  spirit: string | null;
}

interface Fixture {
  id: string;
  description: string;
  input: {
    instant: string;
    options: {
      method: 'chaibu' | 'zhirun' | 'yinpan';
      boardType: 'zhuanpan' | 'feipan';
      lateZiShi: 'nextDay' | 'sameDay';
      centrePalace: 'kun' | 'gen';
      spiritVariant?: boolean;
    };
  };
  expected: {
    pillars: { year: string; month: string; day: string; hour: string };
    dun: 'yin' | 'yang';
    ju: number;
    xunShou: string;
    xunShouYi?: string;
    zhiFu: { star: string; palace: number };
    zhiShi: { gate: string; palace: number };
    kongWang: { hourVoid: string[]; dayVoid?: string[] };
    maXing?: string;
    palaces?: Record<string, PalaceFixture>;
  };
}

function toInput(f: Fixture): ChartInput {
  const m = f.input.instant.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?([+-]\d{2}):(\d{2})$/,
  );
  if (!m) throw new Error(`fixture ${f.id}: bad instant "${f.input.instant}"`);
  const [, y, mo, d, hh, mm, offH, offM] = m;
  const tzHours = (offH.startsWith('-') ? -1 : 1) * (Math.abs(Number(offH)) + Number(offM) / 60);

  const opt = f.input.options;
  if (opt.boardType !== 'zhuanpan')
    throw new Error(`fixture ${f.id}: engine only supports 转盘, got "${opt.boardType}"`);
  if (opt.method === 'yinpan')
    throw new Error(`fixture ${f.id}: engine has no 'yinpan' method`);

  return {
    y: Number(y), m: Number(mo), d: Number(d), hh: Number(hh), mm: Number(mm),
    tzHours,
    method: opt.method,
    lateZiNextDay: opt.lateZiShi === 'nextDay',
    spiritVariant: opt.spiritVariant,
  };
}

function project(chart: Chart) {
  const b = chart.board;
  return {
    pillars: {
      year: chart.pillars.year.name,
      month: chart.pillars.month.name,
      day: chart.pillars.day.name,
      hour: chart.pillars.hour.name,
    },
    dun: chart.juResult.dun,
    ju: chart.juResult.ju,
    xunShou: b.xunShou,
    xunShouYi: b.xunShouYi,
    zhiFu: { star: b.zhiFuStar, palace: b.zhiFuPalace },
    zhiShi: { gate: b.zhiShiGate, palace: b.zhiShiPalace },
    hourVoid: b.hourKongWang.split(''),
    dayVoid: b.dayKongWang.split(''),
    maXing: b.maXing,
  };
}

const sorted = (a: readonly string[]) => [...a].sort();

const files = readdirSync(HERE).filter((f) => f.endsWith('.fixture.json')).sort();

describe('L1 — golden fixtures (verified truth)', () => {
  if (files.length === 0) {
    // No verified fixture yet. Values must come from a verified chart — never
    // from the engine or from memory (see *.fixture.json.template).
    it.todo('bless the first golden fixture from a verified reference chart');
    return;
  }

  for (const file of files) {
    const fx = JSON.parse(readFileSync(join(HERE, file), 'utf8')) as Fixture;
    describe(`${fx.id} — ${fx.description}`, () => {
      const chart = buildChart(toInput(fx));
      const actual = project(chart);
      const exp = fx.expected;

      it('four pillars', () => expect(actual.pillars).toEqual(exp.pillars));
      it('遁 / 局', () => {
        expect(actual.dun).toBe(exp.dun);
        expect(actual.ju).toBe(exp.ju);
      });
      it('旬首', () => {
        expect(actual.xunShou).toBe(exp.xunShou);
        if (exp.xunShouYi) expect(actual.xunShouYi).toBe(exp.xunShouYi);
      });
      it('值符 (star + palace)', () => expect(actual.zhiFu).toEqual(exp.zhiFu));
      it('值使 (gate + palace)', () => expect(actual.zhiShi).toEqual(exp.zhiShi));
      it('时空 (hour void)', () =>
        expect(sorted(actual.hourVoid)).toEqual(sorted(exp.kongWang.hourVoid)));
      if (exp.kongWang.dayVoid) {
        it('日空 (day void)', () =>
          expect(sorted(actual.dayVoid)).toEqual(sorted(exp.kongWang.dayVoid!)));
      }
      if (exp.maXing) it('马星', () => expect(actual.maXing).toBe(exp.maXing));

      // 神 / 门 / 星 / 天盘 / 地盘, for whichever palaces the fixture carries.
      // Stars and 天盘 stems are order-insensitive (天芮 rides with 天禽).
      for (const [num, pf] of Object.entries(exp.palaces ?? {})) {
        it(`宫 ${num} — 神/门/星/天盘/地盘`, () => {
          const p = chart.board.palaces[Number(num) - 1];
          expect(p.palace).toBe(Number(num));
          expect(p.spirit).toBe(pf.spirit);
          expect(p.gate).toBe(pf.gate);
          expect(sorted(p.stars)).toEqual(sorted(pf.stars));
          expect(sorted(p.tianPanStems)).toEqual(sorted(pf.tianPanStems));
          expect([p.diPanStem]).toEqual(pf.diPanStems);
        });
      }
    });
  }
});
