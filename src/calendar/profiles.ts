// ─────────────────────────────────────────────────────────────────────────────
// profiles.ts — purpose mode (用神), v2 §4.2.
//
// General mode grades "which directions are strong at all". Purpose mode grades
// "which directions are strong FOR THIS 用事" by rewarding the palaces that carry
// the activity's 用神 (favoured gate / deity / formations) and by emphasising the
// symbol class the 用神綱領 says matters for that kind of matter (S0 p145):
//   测人事 → 以八门为主   ·   测地理/方位 → 以九宫为主   ·   大事 → 看九星
//
// Only the SCORE is touched (orderingScore step 9). The band still follows the
// score (scoreBand), so a 用神-matching direction rises into 吉/大吉 for that
// activity. General-mode scoring is untouched, so the calibration gate holds.
// Every number here is a tuning knob (§8.2) — Joe to validate weights.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApplicationTag, Door, Spirit } from './data/patterns.ts';
import { ACTIVITY_PRESETS } from './data/presets.ts';

// Per-class multiplier applied on top of CLASS_WEIGHT for this activity.
export type ClassEmphasis = Partial<{ gate: number; star: number; stem: number; spirit: number }>;

// Relocation / travel / expansion read as 方位/地理 matters → 九宫 weighs more;
// everything else is 人事 → 八门 dominates (S0 p145).
const DIRECTIONAL: ReadonlySet<ApplicationTag> = new Set(['travel', 'construction', 'expansion']);

export interface PurposeProfile {
  activity: ApplicationTag;
  yongShen: { gates: readonly Door[]; spirits: readonly Spirit[] };
  boostFormations: ReadonlySet<string>;   // preset.boost — reward palaces carrying these
  classEmphasis: ClassEmphasis;
}

// Score bonuses when a palace carries the activity's 用神 (§4.2 step 9). Moderate
// against the formation-dominated scale (±100), so purpose reweights without
// swamping the classical structure.
export const YONGSHEN = { gate: 22, spirit: 12, formation: 14 } as const;

export function purposeProfile(activity: ApplicationTag): PurposeProfile {
  const preset = ACTIVITY_PRESETS[activity];
  const classEmphasis: ClassEmphasis = DIRECTIONAL.has(activity)
    ? { star: 1.3 }        // 方位/地理 — 大事看星 leans on 九星; 宫 fit rides via 门宫 + vitality
    : { gate: 1.4 };       // 人事 — 八门为主
  return {
    activity,
    yongShen: { gates: preset.goodGates, spirits: preset.goodSpirits },
    boostFormations: new Set(preset.boost),
    classEmphasis,
  };
}
