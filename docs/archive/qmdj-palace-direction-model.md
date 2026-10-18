# 奇門遁甲 — Per-Palace Scoring & Direction Model
**Amendment to `qmdj-date-search-plan.md`. Supersedes its per-hour scoring model.**

**What changes:** the atomic scored unit moves from *the hour* to *(hour × palace)*. An hour no longer carries a score — it carries a **count of auspicious directions**. Every palace carries a score, a band, and a faint background tint so the eye finds the good directions without reading numbers.

**What does not change:** the engine's purity (`f(instant, method, settings)`), the formations registry (`qmdj-formations-registry.md`) as single source of truth, the dark + gold visual language, the `scoreHour()` swap-point discipline, and the test-fixture guardrail.

**Status:** design spec. Nine rulings in §9 are **unresolved and block implementation of the sections that reference them**. Do not guess them; ask Joe.

---

## 1. Why the unit changes

A 時辰 is not uniformly good or bad. The same hour is simultaneously excellent toward one direction and unusable toward another — this is the normal condition of every chart, not an edge case. Collapsing nine palaces into one number per hour discards most of the signal before the user sees it.

Consequences of the inversion, stated so they can be checked against later:

1. **Usable inventory expands.** 180 days × 12 時辰 = 2,160 slots becomes ~2,160 × 8 = ~17,280 rated directional cells (中5宮 excluded from direction counts per §9-R2). Hours that score mediocre overall very often contain one genuinely good direction; those were previously invisible.
2. **The hour-level roll-up question dissolves.** The provisional `值使門×0.6 + outer-avg×0.4` is abandoned. An average across directions that disagree is meaningless. The hour is described, not scored.
3. **The day-level number is a projection, not a mean.** See §5.

---

## 2. Data model

```ts
// ─── Bands ────────────────────────────────────────────────────────────────
// Three user-visible bands + one structural state. 'blocked' is NOT a fourth
// colour band; it is an overlay (see §9-R3 — RULING NEEDED).
type Band = 'prime' | 'good' | 'plain';   // 大吉 / 吉 / 不吉

// ─── The atomic unit ──────────────────────────────────────────────────────
interface PalaceScore {
  palace: PalaceIndex;              // 1..9
  direction: Direction | null;      // null for palace 5 (中宮 has no direction)

  score: number;                    // signed integer, see §3
  band: Band;
  blocked: boolean;                 // veto fired (§3 step 6); band is forced 'plain'

  // Explanation payload — drives the popup, the badges, and user trust.
  matched: MatchedFormation[];      // from the registry evaluator
  warnings: string[];               // 空亡, 門迫, 入墓, 擊刑, 受制 …
  strength: {                       // §3 step 3 — Layer 3
    star: Vitality;                 // 旺|相|休|囚|死 (judged 宮位-first)
    gate: Vitality;                 // judged 月令-first
  };
  baseFilter: BaseFilterResult;     // §4 — why this direction is/isn't usable at all
}

type Direction = 'N'|'NE'|'E'|'SE'|'S'|'SW'|'W'|'NW';
type Vitality  = '旺'|'相'|'休'|'囚'|'死';

// Luoshu palace → direction. Fixed, no configuration.
const PALACE_DIRECTION: Record<PalaceIndex, Direction | null> = {
  1:'N', 2:'SW', 3:'E', 4:'SE', 5:null, 6:'NW', 7:'W', 8:'NE', 9:'S',
};

// ─── The hour: described, not scored ──────────────────────────────────────
interface HourSummary {
  instant: { y:number; m:number; d:number; branch: Branch };  // 時辰
  ganzhi:  { day: string; hour: string };

  palaces: PalaceScore[];           // length 9, index-ordered

  counts: {                         // ← the at-a-glance signal (§6.2)
    prime: number;                  // how many directions are 大吉
    good:  number;                  // how many are 吉
  };                                // 'plain' count is implied; never displayed

  chartWarnings: string[];          // scope:'chart' conditions: 五不遇時, 伏吟, 反吟 …
  chartBlocked: boolean;            // a chart-scope veto voids the whole 時辰
}

// ─── Profiles: the two ways to look (§4) ─────────────────────────────────
type ScoreProfile =
  | { kind: 'general' }                       // formation quality, purpose-agnostic
  | { kind: 'purpose'; activity: ActivityTag };  // 用神-weighted

// Every scoring call takes a profile. Same substrate, different weighting.
computeHourSummary(instant, opts: EngineOptions, profile: ScoreProfile): HourSummary
```

**Contract preserved:** `scoreHour()` may be retained as a thin wrapper returning `HourSummary`, so `DaySummary` / `MonthSummary` shapes and existing UI keep compiling during migration.

---

## 3. The scoring pipeline (per palace)

Runs in this order. Order is load-bearing — strength must modulate *before* formations are gated, and vetoes must fire *last* so nothing can mask them.

```
1. BASE VALENCE        gate + star + spirit intrinsic values     (registry §3)
2. FORMATIONS          + TIER_WEIGHTS[tier] per matched rule     (registry §4–§6)
                       resolve tier:'conditional' from co-located gate
3. STRENGTH (Layer 3)  multiply/compress by 旺相休囚死            (§3.1 below)
4. MEN-GONG            門迫 / 宮制 / 和 / 義 asymmetry            (registry §7.4)
5. STRUCTURAL PENALTY  空亡, 伏吟, 反吟, 時干入墓, 三奇受制, 悖格   (registry §7)
6. VETO                六儀擊刑 → blocked (absolute)
                       三奇入墓 → blocked (nullifying)
                       → blocked ⇒ band forced 'plain', score clamped
7. SUPREME-GATE        void 青龍返首 / 飛鳥跌穴 if 迫/墓/擊/刑     (registry §9.6)
8. PROFILE WEIGHT      if profile.kind==='purpose', apply §4.2   (RULING §9-R5)
9. BAND ASSIGNMENT     thresholds → Band                        (§3.2)
```

### 3.1 Strength modulation — the missing Layer 3

Currently absent from `scoring.ts` (it sits in architecture §10.5 backlog). It is the classical analogue of weighting and should not ship without it.

The 《三元經》 principle, paraphrased: strength **compresses everything toward the middle** — a 大凶 star that is 旺相 becomes only mildly inauspicious; a 小凶 star when strong reads as 中平; and a 吉星 with no 氣 is likewise only 中平. A good symbol without vitality delivers little.

```ts
// Judging rules differ by symbol class — do NOT apply one table to all three:
//   九星  → 宮位 (palace element) is primary, 月令 (season) secondary
//   八門  → 月令 (season) primary
//   八神  → NOT in the 五行旺衰 system; no vitality. Carry `null`.
//
// Note: the 九星 vitality mapping uses a DIFFERENT relation set from the standard
// 五行旺相休囚死 (sources describe 我生者為旺 for stars vs 當令者旺 for elements).
// ⚠️ See §9-R7 — this table needs Joe's ruling before transcription.

const STRENGTH_MULT: Record<Vitality, { auspicious: number; inauspicious: number }> = {
  旺: { auspicious: 1.30, inauspicious: 0.55 },  // strong 凶 is LESS bad (凶卻小)
  相: { auspicious: 1.15, inauspicious: 0.70 },
  休: { auspicious: 0.75, inauspicious: 0.90 },
  囚: { auspicious: 0.50, inauspicious: 1.00 },
  死: { auspicious: 0.40, inauspicious: 1.15 },
};
// ⚠️ These multipliers are ENGINEERING PARAMETERS, not tradition. No text fixes a
// discount curve. They live in the config table with TIER_WEIGHTS and are tuned,
// not derived. The DIRECTION of each effect is traditional; the magnitude is not.
```

### 3.2 Band thresholds

```ts
// Absolute cutoffs, in scoring.ts config. Calibrated (§8), not guessed.
export const BAND_THRESHOLDS = {
  prime: 120,   // ≥ 120  → 大吉
  good:   45,   // ≥  45  → 吉
  // below  45  → 不吉 (plain)
} as const;     // ⚠️ PLACEHOLDER VALUES — calibrate per §8 before shipping.
```

**Design target, not a traditional fact:** if `prime` fires on more than roughly one palace in ten across a calendar year, the badge stops meaning anything; if it fires on fewer than one in a hundred, users find nothing and abandon the tool. Calibrate to sit between. Joe rules on the final target (§9-R4).

---

## 4. The two lookup modes

Both render identically (§6). They differ only in step 8 of the pipeline.

### 4.1 Mode A — General (default)

`profile = { kind: 'general' }`. Step 8 is a no-op. The palace is scored on formation quality alone: which directions are strong *at all* this hour, regardless of what you intend to do.

### 4.2 Mode B — By purpose (用神)

`profile = { kind: 'purpose', activity }`. The user names the purpose; the engine weights the palace by whether it carries that purpose's 用神.

All inputs are chart-derived. **No querent data.** 年命 (birth-year branch) stays out of v1 as decided.

```ts
interface PurposeProfile {
  activity: ActivityTag;              // registry §8 tag
  yongShen: {
    gates:   Door[];                  // e.g. wealth → 生門
    stars:   Star[];                  // e.g. study  → 天輔
    spirits: Spirit[];                // e.g. career → 值符
    stems:   Stem[];                  // e.g. contract → 丁 (documents)
  };
  selfPalace: PalaceIndex;            // palace of 日干 — the querent-free "self"
}
// Step 8: boost palaces holding this activity's 用神; apply the registry §8
// preset's boost/exclude lists; apply the 日干宮 → direction relation (§9-R5).
```

The **self** is the 日干 palace, read from the chart. The **direction** is the palace under evaluation. Classical travel selection reads the destination palace against the 日干 palace — whether that relation feeds the score is ruling §9-R5.

### 4.3 The usability filter (runs before both modes)

The classical ladder, applied per palace, producing `BaseFilterResult`. This is a **gate**, not points — a direction failing it should not surface as usable however high its score.

```
Precondition (chart-scope): slot free of 五不遇時 / 三奇入墓 / 六儀擊刑
Then, per palace:
  奇 + 三吉門(開/休/生)  → 吉方        (auspicious direction)
  吉門 without 奇        → usable      (得門不得奇)
  奇 without 吉門        → ⚠️ §9-R1 — sources disagree; RULING NEEDED
  neither                → 凶方        (not a usable direction)
Refinement:  吉格 → 吉方 · no 吉格 and no 凶格 → usable · 凶格 → unusable
Additional:  the 吉門 must be 相生 or 比和 with its palace to count
             (menGongRelation ∈ {和, 義, 比和}) — see §9-R6
```

---

## 5. Roll-ups: hour and day

**Hour:** no score. `counts.prime` and `counts.good` only (§2). This is deliberate — see §1.2.

**Day:** a *projection*, never a mean. A day holding one superb 時辰 and eleven mediocre ones is an excellent day for someone who can act at that hour; a mean buries it.

```ts
interface DayProjection {
  peak: { branch: Branch; palace: PalaceIndex; score: number; band: Band };
  primeCells: number;   // count of (時辰 × palace) cells at 'prime' across the day
  goodCells:  number;
}
// Calendar cell (§10.3 of architecture) displays peak.band + primeCells,
// NOT an averaged day score.
```

---

## 6. UI specification

### 6.1 PalaceCell background tint

Faint background fill so bands read peripherally without competing with the existing 神/門/星/干/支 glyph layout or the dark + gold language.

```css
/* Dark theme. Tints are low-alpha overlays on the existing cell background —
   NOT solid fills, NOT border changes (borders already encode quality). */
--band-prime-bg: color-mix(in srgb, var(--gold) 10%, transparent);
--band-good-bg:  color-mix(in srgb, var(--cyan)  7%, transparent);
--band-plain-bg: transparent;   /* absence of tint IS the signal */
```

Rules:
- `plain` gets **no tint**. Only two tinted states exist; scanning is for presence, not discrimination among three fills.
- Tint sits *behind* all glyphs. Text contrast must remain WCAG AA against the tinted background — verify, don't assume.
- `blocked === true` renders as `plain` plus an overlay marker (§9-R3).
- The score **number** appears in a fixed corner slot at reduced weight — present for the user who wants it, not competing with the glyphs.

### 6.2 HourRow direction counts

Replaces the current per-hour rating. Two small pills, colour-matched to the band tints:

```
辰時  07:00–09:00   [◆2]  [◆3]   ⚠︎五不遇時
                     ↑      ↑      ↑
              prime count  good  chart-scope warning glyph
```

- Zero counts render as an em-dash, not `0` — visual quiet for empty hours.
- `chartBlocked` renders the whole row dimmed with the warning glyph; counts still shown (a vetoed hour may still be informative).
- Pills are the *same* hue tokens as the cell tints, at full saturation.

### 6.3 Direction affordance

Because the palace now means a **direction you go, face, or site something toward**, the day panel needs a compass reading, not just a grid. Minimum viable: label each palace cell with its compass direction (N/NE/E…). Preferred: an 8-segment rose per 時辰, each segment tinted by band — this is the shape almost no consumer app ships and is the clearest expression of the model.

---

## 7. Module changes

New:
```
src/calendar/strength.ts        # Layer 3: vitality tables + compression (§3.1)
src/calendar/direction.ts       # PALACE_DIRECTION, BaseFilterResult ladder (§4.3)
src/calendar/profiles.ts        # PurposeProfile map: activity → 用神 (§4.2)
src/components/DirectionRose.tsx
```
Rewrite:
```
src/calendar/scoring.ts         # per-palace pipeline (§3); scoreHour → HourSummary
```
Extend:
```
src/components/PalaceCell.tsx   # band tint + score slot (§6.1)
src/components/DayDetailPanel.tsx  # HourRow counts (§6.2)
src/components/MonthGrid.tsx    # DayProjection, not averaged score (§5)
src/calendar/search.ts          # rank (hour × palace) cells, not hours
```

---

## 8. Calibration & tests

**Calibration procedure** (run once, before thresholds are fixed):
1. Compute every (hour × palace) cell over a full year for one method.
2. Plot the score distribution.
3. Set `BAND_THRESHOLDS` so band frequencies hit Joe's target (§9-R4).
4. Commit the distribution snapshot as a fixture — a later scoring change that shifts band frequencies materially should fail CI loudly.

**Fixtures required** (per architecture §4.4 discipline — every one carries provenance):
- One per band boundary: a cell scoring just above and just below each threshold.
- One per veto: 六儀擊刑 and 三奇入墓 must force `blocked` and `band==='plain'` regardless of how many 吉格 are stacked on the palace.
- Strength: the same formation in a 旺 palace must outscore itself in a 死 palace; a 大凶 star at 旺 must score *less negative* than the same star at 囚 (the compression rule — this is the one most likely to be implemented backwards).
- Direction ladder: one fixture per rung of §4.3.
- Roll-up: a day with one `prime` cell and eleven weak 時辰 must project as high-band, proving no mean crept back in.
- Purpose mode: the same hour must rank differently under two different `activity` values, or the profile is not wired.

---

## 9. Rulings needed from Joe — implementation blockers

Do not guess these. Each names the divergence and what each choice costs.

**R1 — 得奇不得門 (wonder, no auspicious gate).** The registry §8 calls it "weak"; the 九宮八卦 formulation of the classical ladder says it does **not** count as an auspicious direction. Registry is the softer reading. Which governs? *Cost:* the strict reading materially shrinks usable inventory.

**R2 — 中5宮.** Has no direction. Confirm: excluded from `counts` and from direction search, but still rendered and scored in the grid?

**R3 — `blocked` rendering.** Overlay marker (dot/hatch/strikethrough) on an untinted cell, or visually identical to `plain`? Making it distinct is more honest but adds a fourth visual state.

**R4 — Band frequency target.** What share of cells should reach `prime` — roughly 1 in 20? 1 in 50? This single number determines whether the tool feels discerning or useless.

**R5 — 日干宮 relation in purpose mode.** Should the direction's score be modified by its 生剋 relation to the 日干 palace (classical travel practice), or is that querent-adjacent enough to defer? *Cost of including:* more faithful; also more to explain in the UI.

**R6 — 門宮相生 as filter or score.** Registry §7.4 computes `menGongRelation` and feeds it to the score. One practitioner statement of the selection ladder makes it a **precondition** — an auspicious gate only counts if 相生/比和 with its palace. Filter or weight?

**R7 — 九星 vitality table.** Sources describe the star strength relations as differing from the standard 五行旺相休囚死 (e.g. 我生者為旺 rather than 當令者旺), and give 宮位 primacy over 月令. Joe to supply or confirm the exact table from his school before transcription. **This is the largest unverified surface in the spec — everything in §3.1 depends on it.**

**R8 — 八神 hard filter.** One practitioner source holds that 白虎 or 玄武 in the 用神宮 makes it unusable *even with* an auspicious gate. The registry treats them as tier weights. School variance — filter or weight?

**R9 — Purpose 用神 map.** §4.2 needs the concrete `activity → {gates, stars, spirits, stems}` table. The registry §8 presets give `boost`/`goodGates`/`goodSpirits`, which is close but not identical to a 用神 map. Confirm whether the presets are sufficient or a separate 用神 table is required.

---

## 10. Honest scope label

This model rates **chart quality per direction per 時辰**. It is not "good for this person" — 年命, personal 用神, and 神煞/黄历 day layers are all out of v1 by decision. The UI copy should say so plainly rather than implying a personalised reading.

And the standing caveat from the registry §0 applies with full force to the score itself: 奇門遁甲 is a traditional metaphysical system, not an empirically validated predictive science. The number is an advisory ranking of tradition-faithfulness. It is not a probability of outcome, and the product should never imply it is.
