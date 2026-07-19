// ─────────────────────────────────────────────────────────────────────────────
// L1 — Golden fixtures (verified truth)
//
// Each *.fixture.json here is a chart whose expected values were confirmed by a
// domain expert against external references (see fixture.schema.json → sources /
// verified). This runner does NOT invent truth: it loads whatever verified
// fixtures exist and checks the engine reproduces them. With zero fixtures it
// registers a single todo so the gap is visible but CI stays green.
//
// Coverage note: this asserts the summary-level facts you read straight off a
// reference chart — pillars, 遁/局, 旬首, 值符, 值使, 时空, 马星. Palace-by-palace
// 地盘/天盘/门/神 comparison is deliberately deferred until the first fixture is
// blessed and can be run against the engine (the fixture ↔ engine palace shapes
// need reconciling on a real case, not guessed here).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildChart, type Chart, type ChartInput } from '@engine';

const HERE = dirname(fileURLToPath(import.meta.url));

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
    };
  };
  expected: {
    pillars: { year: string; month: string; day: string; hour: string };
    dun: 'yin' | 'yang';
    ju: number;
    xunShou: string;
    zhiFu: { star: string; palace: number };
    zhiShi: { gate: string; palace: number };
    kongWang: { hourVoid: string[]; dayVoid?: string[] };
    maXing?: string;
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
    zhiFu: { star: b.zhiFuStar, palace: b.zhiFuPalace },
    zhiShi: { gate: b.zhiShiGate, palace: b.zhiShiPalace },
    hourVoid: b.hourKongWang.split(''),
    maXing: b.maXing,
  };
}

const files = readdirSync(HERE).filter((f) => f.endsWith('.fixture.json'));

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
      const actual = project(buildChart(toInput(fx)));
      const exp = fx.expected;

      it('four pillars', () => expect(actual.pillars).toEqual(exp.pillars));
      it('遁 / 局', () => {
        expect(actual.dun).toBe(exp.dun);
        expect(actual.ju).toBe(exp.ju);
      });
      it('旬首', () => expect(actual.xunShou).toBe(exp.xunShou));
      it('值符 (star + palace)', () => expect(actual.zhiFu).toEqual(exp.zhiFu));
      it('值使 (gate + palace)', () => expect(actual.zhiShi).toEqual(exp.zhiShi));
      it('时空 (hour void)', () =>
        expect([...actual.hourVoid].sort()).toEqual([...exp.kongWang.hourVoid].sort()));
      if (exp.maXing) it('马星', () => expect(actual.maXing).toBe(exp.maXing));
    });
  }
});
