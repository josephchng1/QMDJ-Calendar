import { describe, it, expect } from 'vitest';
import {
  AMPLITUDE, amplitude, relation, starVitality, gateVitality, stemVitality, seasonElement,
  type StarVitality,
} from './strength.ts';
import { STARS, type Star } from './data/patterns.ts';
import type { Element } from './data/structural.ts';

const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];

describe('relation', () => {
  it('classifies the five 五行 relations', () => {
    expect(relation('木', '木')).toBe('same');
    expect(relation('木', '水')).toBe('generates-me'); // 水生木
    expect(relation('木', '火')).toBe('I-generate');   // 木生火 (洩)
    expect(relation('木', '金')).toBe('controls-me');  // 金克木
    expect(relation('木', '土')).toBe('I-control');    // 木克土
  });
});

describe('AMPLITUDE — monotone, sign-agnostic (§3.1)', () => {
  it('strong amplifies, weak flattens', () => {
    expect(AMPLITUDE['旺']).toBeGreaterThan(AMPLITUDE['相']);
    expect(AMPLITUDE['相']).toBeGreaterThan(AMPLITUDE['休']);
    expect(AMPLITUDE['休']).toBeGreaterThan(AMPLITUDE['囚']);
    expect(AMPLITUDE['囚']).toBeGreaterThan(AMPLITUDE['死']);
    expect(AMPLITUDE['废']).toBe(AMPLITUDE['死']);
  });
  it('amplitude(null) is the identity 1', () => {
    expect(amplitude(null)).toBe(1);
  });
});

describe('九星 vitality — never 死, month-only (§3.1 R7-b)', () => {
  it('no star × month combination ever yields 死', () => {
    const seen = new Set<StarVitality>();
    for (const s of Object.keys(STARS) as Star[]) {
      for (const e of ELEMENTS) seen.add(starVitality(s, e));
    }
    expect(seen.has('死' as StarVitality)).toBe(false);
    // the fifth state must be 废
    expect([...seen]).toContain('废');
  });
  it('我生之月最旺 — 天蓬(水) in a 木 month is 旺', () => {
    expect(starVitality('天蓬', '木')).toBe('旺'); // 水生木 → I-generate → 旺
  });
});

describe('八门 vitality — two axes, fifth state 死', () => {
  it('得时得地 → 旺 ; 剋我 on one axis → 囚 (the inversion pair)', () => {
    // 死门 = 土. palace 8 = 土 (得地, 比和).
    expect(gateVitality('死门', seasonElement(5), 8)).toBe('旺'); // 巳月 火生土 → 得时 → 旺
    expect(gateVitality('死门', seasonElement(3), 8)).toBe('囚'); // 卯月 木克土 → 剋我 → 囚
  });
  it('剋我 on both axes → 死', () => {
    // 生门 = 土; palace 3 = 木 (木克土, 剋我); 卯月 = 木 (剋我)
    expect(gateVitality('生门', seasonElement(3), 3)).toBe('死');
  });
});

describe('三奇六仪 vitality shares the 八门 two-axis rule', () => {
  it('丙(火) in a 火 palace in a 木 month is 旺 (木生火 + 比和)', () => {
    expect(stemVitality('丙', seasonElement(3), 9)).toBe('旺'); // palace9 火, 卯月木生火
  });
});
