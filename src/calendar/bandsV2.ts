// Presentation for the v2 three-band model (§6.1). Kept out of the engine so
// scoring stays free of UI concerns; shared by every v2 component so labels and
// colours never drift.  Only prime/good are tinted — plain is bare, the absence
// of tint IS the signal.
import type { Band } from './palace.ts';

export const V2_BAND_LABEL: Record<Band, string> = { prime: '大吉', good: '吉', plain: '不吉' };
export const V2_BAND_COLOR: Record<Band, string> = {
  prime: 'var(--gold)', good: 'var(--q-excellent)', plain: 'var(--text-dim)',
};
export const V2_BAND_TINT: Record<Band, string> = {
  prime: 'var(--band-prime-bg)', good: 'var(--band-good-bg)', plain: 'var(--band-plain-bg)',
};
