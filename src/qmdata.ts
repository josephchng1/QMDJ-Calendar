// Lightweight metadata used ONLY for colour-coding the chart. This is the seed of
// the spec's §5 data registry — it is intentionally minimal and NOT authoritative
// scoring. Quality tags follow the conventional 八门/九星/八神 auspiciousness; a
// domain expert should replace these when the full registry + 格局 layer is built.
export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type Quality = 'excellent' | 'good' | 'neutral' | 'caution' | 'bad';

export const STEM_ELEMENT: Record<string, Element> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth',
  己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
};

export const GATE_META: Record<string, { element: Element; quality: Quality }> = {
  开门: { element: 'metal', quality: 'excellent' },
  休门: { element: 'water', quality: 'good' },
  生门: { element: 'earth', quality: 'excellent' },
  伤门: { element: 'wood', quality: 'bad' },
  杜门: { element: 'wood', quality: 'neutral' },
  景门: { element: 'fire', quality: 'neutral' },
  死门: { element: 'earth', quality: 'bad' },
  惊门: { element: 'metal', quality: 'caution' },
};

export const STAR_META: Record<string, { element: Element; quality: Quality }> = {
  天蓬: { element: 'water', quality: 'bad' },
  天任: { element: 'earth', quality: 'good' },
  天冲: { element: 'wood', quality: 'good' },
  天辅: { element: 'wood', quality: 'excellent' },
  天英: { element: 'fire', quality: 'neutral' },
  天芮: { element: 'earth', quality: 'bad' },
  天柱: { element: 'metal', quality: 'caution' },
  天心: { element: 'metal', quality: 'excellent' },
  天禽: { element: 'earth', quality: 'good' },
};

export const SPIRIT_QUALITY: Record<string, Quality> = {
  值符: 'excellent', 腾蛇: 'caution', 太阴: 'good', 六合: 'good',
  白虎: 'bad', 玄武: 'bad', 九地: 'neutral', 九天: 'good',
  勾陈: 'caution', 朱雀: 'caution',
};

export const ELEMENT_VAR: Record<Element, string> = {
  wood: 'var(--wood)', fire: 'var(--fire)', earth: 'var(--earth)',
  metal: 'var(--metal)', water: 'var(--water)',
};
export const QUALITY_VAR: Record<Quality, string> = {
  excellent: 'var(--q-excellent)', good: 'var(--q-good)', neutral: 'var(--q-neutral)',
  caution: 'var(--q-caution)', bad: 'var(--q-bad)',
};

export const stemColor = (s: string) =>
  s && STEM_ELEMENT[s] ? ELEMENT_VAR[STEM_ELEMENT[s]] : 'var(--text)';
export const gateColor = (g: string | null) =>
  g && GATE_META[g] ? QUALITY_VAR[GATE_META[g].quality] : 'var(--text-dim)';
export const starColor = (s: string) =>
  s && STAR_META[s] ? QUALITY_VAR[STAR_META[s].quality] : 'var(--text-dim)';
export const spiritColor = (s: string | null) =>
  s && SPIRIT_QUALITY[s] ? QUALITY_VAR[SPIRIT_QUALITY[s]] : 'var(--text-dim)';
