// UI presentation for quality bands (labels + colours). Kept out of scoring.ts so
// the engine layer stays free of presentation concerns.
import { QUALITY_VAR } from '../qmdata.ts';
import type { Band } from './scoring.ts';

export const BAND_LABEL: Record<Band, string> = {
  excellent: '大吉', good: '吉', neutral: '平', caution: '小凶', bad: '凶',
};

export const bandColor = (b: Band): string => QUALITY_VAR[b];

/** 时辰 → clock window label, e.g. 子 → 23–01. Branch index 0=子 … 11=亥. */
export function shichenWindow(branchIndex: number): string {
  const start = (23 + branchIndex * 2) % 24;
  const end = (start + 2) % 24;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(start)}–${p(end)}`;
}
