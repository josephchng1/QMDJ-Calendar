// Registry integrity — the §5 "single source of truth" must reference only tokens
// the engine actually emits, carry no duplicate ids, and use valid tiers/tags.
import { describe, it, expect } from 'vitest';
import { STAR_NAMES, GATE_NAMES, SPIRITS as ENGINE_SPIRITS, SPIRITS_VARIANT } from '../../engine/board.ts';
import { STEMS } from '../../engine/ganzhi.ts';
import {
  ALL_PATTERNS, PATTERNS_BY_ID, TIER_WEIGHTS,
  GATES, STARS, SPIRITS, GOOD_GATES,
  type Tier, type ApplicationTag,
} from './patterns.ts';

const VALID_TIERS = new Set<Tier>([
  'supreme-auspicious', 'auspicious', 'minor-auspicious', 'neutral',
  'conditional', 'minor-inauspicious', 'inauspicious', 'supreme-inauspicious',
]);
const VALID_TAGS = new Set<ApplicationTag>([
  'launch', 'contract', 'partnership', 'wealth', 'expansion', 'competition',
  'travel', 'career', 'construction', 'romance', 'secrecy', 'study',
]);

const ENGINE_DOORS = new Set(Object.values(GATE_NAMES));
const ENGINE_STARS = new Set(Object.values(STAR_NAMES));
const ENGINE_GODS = new Set([...ENGINE_SPIRITS, ...SPIRITS_VARIANT]);
const ENGINE_STEMS = new Set(STEMS.filter((s) => s !== '甲')); // 甲 never on the plate

// Recursively collect every token referenced by a when-clause (incl. `any`).
function tokensOf(w: any): { doors: string[]; stars: string[]; gods: string[]; stems: string[]; palaces: number[] } {
  const acc = { doors: [] as string[], stars: [] as string[], gods: [] as string[], stems: [] as string[], palaces: [] as number[] };
  const asArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const walk = (c: any) => {
    if (!c) return;
    acc.doors.push(...asArr(c.door));
    acc.stars.push(...asArr(c.star));
    acc.gods.push(...asArr(c.spirit));
    acc.stems.push(...asArr(c.tianPanStem), ...asArr(c.diPanStem), ...asArr(c.anyStem));
    acc.palaces.push(...asArr(c.palaceIndex));
    if (c.sanqiInPalace) { acc.stems.push(...Object.keys(c.sanqiInPalace)); acc.palaces.push(...Object.values(c.sanqiInPalace) as number[]); }
    if (c.hourStemIs) acc.stems.push(c.hourStemIs);
    (c.any ?? []).forEach(walk);
  };
  walk(w);
  return acc;
}

describe('registry integrity', () => {
  it('every tier has a weight', () => {
    for (const t of VALID_TIERS) expect(TIER_WEIGHTS[t]).toBeTypeOf('number');
  });

  it('ids are unique and indexed', () => {
    const ids = ALL_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(PATTERNS_BY_ID).length).toBe(ids.length);
  });

  it('symbol tables use engine tokens', () => {
    for (const d of Object.keys(GATES)) expect(ENGINE_DOORS.has(d)).toBe(true);
    for (const s of Object.keys(STARS)) expect(ENGINE_STARS.has(s)).toBe(true);
    for (const g of Object.keys(SPIRITS)) expect(ENGINE_GODS.has(g)).toBe(true);
    for (const g of GOOD_GATES) expect(ENGINE_DOORS.has(g)).toBe(true);
  });

  it('every rule is well-formed and references valid tokens', () => {
    for (const p of ALL_PATTERNS) {
      expect(VALID_TIERS.has(p.tier), `${p.id} tier`).toBe(true);
      expect(['palace', 'chart']).toContain(p.scope);
      for (const tag of [...p.guidance.favours, ...p.guidance.avoid]) {
        expect(VALID_TAGS.has(tag), `${p.id} tag ${tag}`).toBe(true);
      }
      const tok = tokensOf(p.when);
      for (const d of tok.doors) expect(ENGINE_DOORS.has(d), `${p.id} door ${d}`).toBe(true);
      for (const s of tok.stars) expect(ENGINE_STARS.has(s), `${p.id} star ${s}`).toBe(true);
      for (const g of tok.gods) expect(ENGINE_GODS.has(g), `${p.id} god ${g}`).toBe(true);
      for (const st of tok.stems) expect(ENGINE_STEMS.has(st) || st === '甲', `${p.id} stem ${st}`).toBe(true);
      for (const pi of tok.palaces) expect(pi >= 1 && pi <= 9, `${p.id} palace ${pi}`).toBe(true);
    }
  });

  it('chart-scope rules are limited to the ones that read pillars', () => {
    const chartScoped = ALL_PATTERNS.filter((p) => p.scope === 'chart').map((p) => p.id);
    expect(chartScoped).toEqual(['tianxian-shige']);
  });
});
