import { describe, it, expect } from 'vitest';
import { topFormations, formationWeight, formationColor } from './importance.ts';
import type { Tier } from './data/patterns.ts';

const f = (id: string, tier: Tier) => ({ id, name: id, tier });

describe('formation importance', () => {
  it('ranks by tier magnitude, 吉 and 凶 alike', () => {
    expect(formationWeight('supreme-auspicious')).toBe(100);
    expect(formationWeight('supreme-inauspicious')).toBe(100);
    expect(formationWeight('minor-auspicious')).toBe(30);
    expect(formationWeight('conditional')).toBe(25);
    expect(formationWeight('neutral')).toBe(0);
  });

  it('surfaces a 大凶 over a merely 吉 — not the first by palace order', () => {
    const list = [f('sanqi-zhiling', 'auspicious'), f('tianwang-sizhang', 'supreme-inauspicious')];
    expect(topFormations(list, 1).map((x) => x.id)).toEqual(['tianwang-sizhang']);
  });

  it('keeps source order on a tie, so the reconciled label wins its slot', () => {
    const list = [f('san-zha-zhen', 'auspicious'), f('huanyi', 'auspicious')];
    expect(topFormations(list, 1).map((x) => x.id)).toEqual(['san-zha-zhen']);
  });

  it('does not mutate its input', () => {
    const list = [f('a', 'minor-auspicious'), f('b', 'supreme-auspicious')];
    topFormations(list, 2);
    expect(list.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('caps the list', () => {
    const list = [f('a', 'auspicious'), f('b', 'auspicious'), f('c', 'auspicious')];
    expect(topFormations(list, 2)).toHaveLength(2);
  });

  it('de-dupes by id — the same 格局 in two palaces spends one chip, not two', () => {
    const list = [f('tian-dun', 'supreme-auspicious'), f('tian-dun', 'supreme-auspicious'),
                  f('huanyi', 'auspicious')];
    expect(topFormations(list, 2).map((x) => x.id)).toEqual(['tian-dun', 'huanyi']);
  });

  it('never paints a 凶格 gold', () => {
    expect(formationColor('supreme-inauspicious')).toBe('var(--q-bad)');
    expect(formationColor('inauspicious')).toBe('var(--q-bad)');
    expect(formationColor('supreme-auspicious')).toBe('var(--gold)');
    expect(formationColor('conditional')).toBe('var(--q-caution)');
  });
});
