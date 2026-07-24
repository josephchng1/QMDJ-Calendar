# 奇門遁甲 — Per-Palace Scoring & Direction Model — v2
**Implementation spec. Supersedes `qmdj-palace-direction-model.md` (v1) and the per-hour scoring model in `qmdj-date-search-plan.md`.**
**Data source of truth: `qmdj-formations-registry-v2.md`.**

**Status: implementable.** Of v1's nine blocking rulings, **eight are resolved** — R1, R4, R6, R7 (both parts), R8, R9, plus the strength-table inversion v1 did not know it had. R4 was **dissolved rather than answered**: bands are now assigned by the classical rule ladder (§3.4), so there is no threshold to calibrate. What remains (§9) is two UI conventions with defaults applied and two low-stakes formation questions. **Nothing blocks writing the engine.**

**What changed from v1, in one paragraph:** band assignment moves from a **calibrated score threshold to a deterministic rule ladder** taken from S0 pp.135–140, with the score demoted to intra-band ordering (§3.4 — the largest structural change); the strength multiplier table was **inverted and is fixed** (§3.1); the pipeline is **reordered** so vitality modulates symbols rather than formations (§3); the usability ladder is **tightened** to the strict reading and gains a fourth rung (§4.3); **主客 becomes partly chart-derived** rather than pure user input (§4.4); three new direction-native features arrive from source — **急則從神, 神盤 tactical map, 星宮生剋** (§4.4–4.6); and a **selection-vs-forecast triage rule** now governs what may be imported from the primary text at all (§0).

---

## 0. The governing methodological rule

**Read `qmdj-formations-registry-v2.md` §0.1 before implementing anything.** In brief:

S0 (张志春《神奇之门》) contains **forecast chapters** (斷卦/預測 — "given this hour, what is happening?") and **selection chapters** (擇時擇方 — "which hour and direction should I act in?"). This product does selection only. Selection-chapter statements **outrank** forecast-chapter statements wherever the two touch the same mechanism. Forecast narrative (測婚為女逃男, 病者必死, 女人產嬰童) never enters scoring and never enters `guidance` — it lives in an optional `divination` field for palace pop-ups.

Three v1 positions were built on forecast evidence and are corrected here:
- the strength multiplier direction (§3.1) — was justified by a 斷病 passage; now rests on the selection chapter, and the conclusion **flipped**;
- the "宮剋門 is bad" contradiction — dissolved, it was a forecast-chapter quotation of a different text;
- 八門克應 — downgraded from "largest missing registry" to deprioritised.

---

## 1. Why the atomic unit is (hour × palace)

A 時辰 is not uniformly good or bad. The same hour is simultaneously excellent toward one direction and unusable toward another — the normal condition of every chart, not an edge case. Collapsing nine palaces into one number discards most of the signal before the user sees it.

1. **Usable inventory expands.** 180 days × 12 時辰 = 2,160 slots becomes ~2,160 × 8 = ~17,280 rated directional cells (中5宮 excluded from direction counts, §9-R2).
2. **The hour roll-up question dissolves.** `值使門×0.6 + outer-avg×0.4` is abandoned. An average across directions that disagree is meaningless. The hour is **described, not scored**.
3. **v2 reinforcement.** S0(p135) treats 時干入墓 explicitly as a **方位** problem — 時干入墓方位, 時干落入其墓地所在之宮. It disqualifies *that direction*, not the whole hour. The per-palace unit is what the source actually describes.
4. **The day number is a projection, not a mean.** §5.

---

## 2. Data model

```ts
// ─── Bands ────────────────────────────────────────────────────────────────
type Band = 'prime' | 'good' | 'plain';   // 大吉 / 吉 / 不吉
// 'blocked' is NOT a fourth band; it is an overlay (§9-R3).

// ─── Vitality — NOTE: two enums, deliberately not merged ──────────────────
type GateVitality = '旺'|'相'|'休'|'囚'|'死';   // 八門, 三奇六儀
type StarVitality = '旺'|'相'|'休'|'囚'|'廢';   // 九星 — never 死, S0(p107)
type Vitality = GateVitality | StarVitality;

// ─── Direction ────────────────────────────────────────────────────────────
type Direction = 'N'|'NE'|'E'|'SE'|'S'|'SW'|'W'|'NW';
const PALACE_DIRECTION: Record<PalaceIndex, Direction | null> = {
  1:'N', 2:'SW', 3:'E', 4:'SE', 5:null, 6:'NW', 7:'W', 8:'NE', 9:'S',
};

// ─── The atomic unit ──────────────────────────────────────────────────────
interface PalaceScore {
  palace: PalaceIndex;
  direction: Direction | null;          // null for 中5宮

  band: Band;                           // set by the RULE LADDER, §3.4 — not by score
  rung: Rung;                           // NEW — which rung of the S0(p136) ladder
  reasons: string[];                    // NEW — plain-language rule trace, drives the UI
  blocked: boolean;                     // hard exclusion fired (§3.4 step 0)

  score: number;                        // ORDERING ONLY — ranks cells within a band
  matched: MatchedFormation[];
  warnings: string[];                   // 空亡, 門迫, 入墓, 擊刑, 受制 …
  badges: Badge[];                      // positive structural notes, §6.4

  strength: {
    star: StarVitality | null;
    gate: GateVitality | null;
    stems: Record<Stem, GateVitality>;  // NEW in v2 — 三奇六儀 carry vitality too (S0 p137)
    spirit: null;                       // 八神 have no 五行旺衰. Always null.
  };

  baseFilter: BaseFilterResult;         // §4.3
  roleAffinity: 'mover' | 'host' | null;// NEW — §4.4
  tactical?: string;                    // NEW — 神盤 guidance text, §4.5
}

// ─── The hour: described, not scored ──────────────────────────────────────
interface HourSummary {
  instant: { y:number; m:number; d:number; branch: Branch };
  ganzhi:  { day: string; hour: string };

  palaces: PalaceScore[];               // length 9, index-ordered
  counts: { prime: number; good: number };

  chartWarnings: string[];              // 伏吟, 反吟, 空亡 …
  chartBlocked: boolean;                // 五不遇時 → true. All 9 palaces blocked; hour
                                        // excluded from search and from counts.

  hourRoleFavour: 'mover' | 'host';     // NEW — 五陽時利客 / 五陰時利主, §4.4
  emergencyDirections: PalaceIndex[];   // NEW — 急則從神, §4.6
}

// ─── Profiles ─────────────────────────────────────────────────────────────
type ScoreProfile =
  | { kind: 'general' }
  | { kind: 'purpose'; activity: ActivityTag; role?: 'mover'|'host'; highStakes?: boolean };

computeHourSummary(instant, opts: EngineOptions, profile: ScoreProfile): HourSummary
```

**Contract preserved:** `scoreHour()` may be retained as a thin wrapper returning `HourSummary`, so `DaySummary` / `MonthSummary` shapes keep compiling during migration.

---

## 3. The scoring pipeline (per palace) — REORDERED in v2

Order is load-bearing.

```
1. BASE VALENCE      gate + star + spirit + stems, weighted by CLASS_WEIGHT
2. VITALITY          × AMPLITUDE[level], per symbol class, SIGN PRESERVED
3. MEN-GONG          和/義 amplify · 制 damps · 迫 pushes negative
4. FORMATIONS        + TIER_WEIGHTS[tier]; resolve 'conditional' from co-located gate
                     ← NOT scaled by steps 2–3 (would double-count the gate)
5. STRUCTURAL        空亡, 伏吟, 反吟, 時干入墓, 三奇受制, 悖格
6. VETO              六儀擊刑 → blocked · 三奇入墓 → blocked
                     blocked ⇒ band forced 'plain', score clamped
7. SUPREME-GATE      void 青龍返首 / 飛鳥跌穴 if 迫/墓/擊/刑
8. ROLE              主/客 weighting if role is set
9. PROFILE           purpose-mode 用神 weighting
10. BAND             assignBand() — RULE LADDER, S0 pp.135–140              §3.4
                     ← independent of steps 1–9. The score does NOT set the band.
```

**⚠️ Step 10 does not read the score.** `assignBand()` takes the palace's *structural* facts — which gates, stems, deities, formations and vitalities are present — and walks the classical ladder. Steps 1–9 produce a number whose only job is **ordering cells within a band** when ranking search results. This is the change that resolves R4: no threshold, no calibration, no percentage to guess.

**⚠️ v1 had strength at step 3, after formations, implicitly scaling them.** That is wrong. S0(p137) applies 旺相休囚 to **門、奇、星、儀** — symbol classes. 格局 are gated by 迫/墓/擊/刑 instead (step 7), a different mechanism. Scaling formation weights by vitality double-counts the gate that the formation is built on.

### 3.1 ⚠️ Vitality (Layer 3) — the v1 table was INVERTED

```ts
// ── The rule, from the SELECTION chapter. S0(p137): ────────────────────────
//   生門…得時又得地，為旺相，才是真正的吉…則吉門也就不吉了。
//   相反，凶門如果得時得地則為真正的凶，如逢休囚死衰之時之地，
//                                       則凶門也就不能逞凶了。
//   九星旺相…吉者為吉，凶者為凶；如果逢休囚衰廢季節，則無氣，吉凶程度都大大減低。
//
// STRENGTH SCALES MAGNITUDE. IT NEVER FLIPS SIGN.

export const AMPLITUDE: Record<Vitality, number> = {
  旺: 1.30,  相: 1.15,  休: 0.80,  囚: 0.60,  死: 0.45,  廢: 0.45,
};
// ONE column, applied to |valence|.
//
// ⚠️ DELETED FROM v1: the two-column STRENGTH_MULT with
//        旺: { auspicious: 1.30, inauspicious: 0.55 }
//        死: { auspicious: 0.40, inauspicious: 1.15 }
//    That said "a strong 凶 symbol is LESS bad." S0 says the opposite.
//    This is the single most consequential correction in v2 — a strong 死門
//    was previously being scored as nearly harmless.
//
// The DIRECTION is traditional (S0 p137). The CURVE is an engineering parameter
// living in scoring.ts config alongside TIER_WEIGHTS. Tune the numbers; never
// tune the monotonicity.
```

**Two axes, both required — 得時 and 得地.**

```ts
interface VitalityInput { season: Element; palace: PalaceIndex; }
// 得時 = judged against 月令 (season element)
// 得地 = judged against 宮位 element
// S0's worked example (p137): 生門(土) is 得地 in 艮8/坤2 (土) and 離9 (火生土);
//   得時 in 立春→春分前45天 (艮8's season) or 四季月 (辰/未/戌/丑 土旺之月).
//   生門臨震3/巽4 → 木剋土 → 受制. 生門 in 冬10/11月 or 秋7/8月 → 土休囚 → 吉門也就不吉了.

// ── 八門 and 三奇六儀: STANDARD 五行 relation on both axes ──────────────────
//   生我 / 比和 → 得 ;  剋我 / 我剋(洩) → 不得
//   得時 + 得地      → 旺
//   one axis only    → 相
//   neither, 洩 only → 休
//   剋我 on one axis → 囚
//   剋我 on both     → 死

// ── 九星: ONE AXIS ONLY — 月令. Non-standard relation set. S0(p106) verbatim: ──
//   我生之月最旺 · 與我五行相同的月份為相(次旺) · 我剋月建五行時為休
//   月建五行生助我的時候為廢 · 月建五行剋我時為囚
export const STAR_VITALITY: Record<Relation, StarVitality> = {
  'I-generate':   '旺',   // 我生 — most powerful
  'same':         '相',
  'I-control':    '休',   // 休於財
  'generates-me': '廢',   // 廢於父母
  'controls-me':  '囚',   // 囚於鬼
};
export function starVitality(star: Star, monthElement: Element): StarVitality {
  return STAR_VITALITY[relation(STAR_ELEM[star], monthElement)];
}
// ✅ RULING R7-b (Joe): follow the book. 九星 take NO 得地 axis.
//    The book states one rule, once, in terms of 月建 (p106), and every worked
//    example is month-driven. p107's "對地盤宮的影響" is its EXPLANATION of the
//    rule's shape, and the same paragraph equates the two outright:
//    "被地盤宮五行生助的時候，即季節月令五行生助它們的時候". One variable, two
//    descriptions — not two axes. v2-draft's inferred second axis is DELETED.
//
//    The star–palace relation is NOT lost. S0(p139) assigns it to 主客 instead:
//    天盤星生地盤宮則利主 · 宮剋星則利主 · 星剋宮則利客 · 宮生星則利客.
//    That lives in §4.4 starPalaceRole(). Routing it there rather than inventing
//    a vitality axis is the whole point of the ruling.
//
// ⚠️ FIFTH STATE IS 廢, NOT 死. S0(p107): 九星卻叫旺、相、休、囚、廢…絕對不會「死」.
//    A star can be inert; it cannot die. Keep the two enums separate.

// ── 八神: NO vitality. 第五節 gives them no 五行旺衰 treatment. Always null.
```

**Axis summary after the R7-b ruling — this is the thing to get right in code:**

| Symbol class | 得時 (月令) | 得地 (宮位) | Relation set | Fifth state |
|---|---|---|---|---|
| 八門 | ✅ | ✅ | standard 五行 | 死 |
| 三奇六儀 | ✅ | ✅ | standard 五行 | 死 |
| 九星 | ✅ | ❌ **no axis** | **non-standard (p106)** | **廢** |
| 八神 | ❌ | ❌ | — | `null` |

The two most likely implementation bugs are (a) sharing one enum across 門 and 星, and (b) reusing the standard 五行 relation function for stars. Both fail silently and both are caught by the fixtures in §8.

### 3.2 Symbol-class weighting — NEW

```ts
// S0(p137): 在門、星、神三者中，吉門最重要，吉星、三奇次之，吉神可起輔助作用。
// S0(p136): 可見吉門比三奇還重要。
export const CLASS_WEIGHT = { gate: 1.00, star: 0.60, stem: 0.60, spirit: 0.30 } as const;
// Applied to BASE VALENCE only (step 1), never to formation tier weights.
// ORDERING is traditional; ratios are tunable. Constraint: spirit < star ≤ gate.

// 大事看星 (S0 p140): when profile.highStakes === true, raise star weight
// (suggested 0.60 → 0.85) and surface star vitality prominently in the UI.
```

### 3.3 門宮 relation — CORRECTED

```ts
// The complete spec is the 歌訣, S0(p100) verbatim, glossed p103:
//   吉門被剋吉不就，凶門被剋凶不起；
//   吉門相生有大利，凶門得生禍難避；
//   吉門剋宮吉不就，凶門剋宮事更凶。
function applyMenGong(v: number, rel: MenGongRelation | null): number {
  switch (rel) {
    case '和':                                       // 門生宮
    case '義': return v * (1 + K_SHENG);             // 宮生門 — AMPLIFY, sign preserved
    case '制': return v * (1 - K_ZHI);               // 宮剋門 — DAMP, sign preserved
    case '迫': return v > 0 ? v * (1 - K_PO)         // 門剋宮 — asymmetric,
                            : v * (1 + K_PO);        //          pushes negative both ways
    default:   return v;                             // 比和 / 中5
  }
}
// ⚠️ v1 had 和/義 "mildly easing a 凶門". S0(p103) is explicit that the reverse holds:
//    但是對於凶門來說，如果受生，更加旺相，那就凶上加凶了。
//    Same underlying principle as the §3.1 inversion — strength amplifies what is there.
//
// The payoff that survives unchanged and is worth surfacing:
//    宮制 on a 凶門 is a GOOD sign (凶不起) → its own badge, §6.4.
```

### 3.4 ⭐ Band assignment — a rule ladder, not a threshold. **Resolves R4.**

**The band is decided by classical rules, not by where a number falls.** S0(pp.135–140) states the complete selection ladder plus its qualifiers and disqualifiers. Encoding it directly removes the calibration problem entirely: there is no percentage to guess, no distribution to fit, and every band carries a reason traceable to a page.

**The score's job changes.** It no longer determines the band. It **orders cells within a band** for ranking. That confines every engineering parameter (§8.2) to tie-breaking, where being imprecise costs nothing.

```ts
type Rung = '奇門相會' | '得門不得奇' | '逢吉格' | '得奇不得門' | '凶方';

interface BandResult {
  band: Band;
  rung: Rung;
  blocked: boolean;
  reasons: string[];        // one plain-language line per rule that fired — drives the UI
}

export function assignBand(p: PalaceEval, chart: ChartEval, profile: ScoreProfile): BandResult {
  const reasons: string[] = [];

  // ── STEP 0 — HARD EXCLUSION. Chart-scope first, then palace-scope. ────────
  //
  // 0a. 五不遇時 — CHART SCOPE. The whole 時辰 is unusable; skip the 9 palaces.
  //   ✅ RULING (Joe): 五不遇時 is BAD. Avoid these hours outright.
  //   S0(p135), SELECTION chapter, is the harsher and governing statement:
  //     從時間選擇上，要盡量避開五不遇時…而且是陽剋陽、陰剋陰，所以主凶
  //     丁日癸卯時，正是奇門擇時最忌諱的五不遇時
  //   (S0's worked example: the 1995-01-26 satellite launch was scheduled in a
  //    五不遇時; he called failure from the chart, and the launch exploded.)
  //   The softer p133 wording (不一定都凶) sits in the 凶格 definitional chapter;
  //   per §0.1 the selection chapter governs. Checked FIRST — cheapest and broadest.
  if (chart.wuBuYuShi) {
    return { band:'plain', rung:'凶方', blocked:true,
             reasons:['五不遇時 — 時干剋日干，擇時最忌，此時辰不用'] };
  }
  //
  // 0b. PALACE SCOPE. S0(p136) names this list verbatim: ─────────────────────
  //   應避開三奇入墓、六儀擊刑、年、月、日、時格和大、小、刑格
  //   及飛干格、伏宮格、飛宮格等凶格
  //   plus 時干入墓方位 (p135, an explicit 方位 exclusion)
  const HARD = {
    liuYiJiXing:'六儀擊刑', sanQiRuMu:'三奇入墓', shiGanRuMu:'時干入墓',
    suiGe:'歲格', yueGe:'月格', riGe:'日格', shiGe:'時格',
    daGe:'大格', shangGe:'上格', xingGe:'刑格',
    feiGanGe:'飛干格', fuGongGe:'伏宮格', feiGongGe:'飛宮格',
  } as const;
  const fired = Object.entries(HARD).filter(([k]) => p[k]).map(([,v]) => v);
  if (fired.length) {
    return { band:'plain', rung:'凶方', blocked:true,
             reasons:[`不可用 — ${fired.join('、')}`] };
  }

  // ── STEP 1 — THE LADDER. S0(p136), structure taken verbatim. ───────────────
  //   選擇乙丙丁三奇與開休生三吉門相會的方位，這是最佳的方位。
  //   只有奇而沒有吉門 → 得奇不得門，還不能算吉利方位。
  //   只有吉門而沒有奇 → 得門不得奇，也算吉利方位，可用。
  //   不得奇又不得吉門 → 逢吉格，也可用；如遇凶格，則不可用。
  //
  // PURPOSE OVERRIDE, also from p136: 但還看辦什麼事情，比如捕獵討債，就可用傷門，
  //   弔唁送葬則可用死門。 → in purpose mode the preset's gates REPLACE 三吉門.
  const goodGates: Door[] = profile.kind === 'purpose'
    ? ACTIVITY_PRESETS[profile.activity].goodGates
    : ['開門','休門','生門'];

  const hasGate = goodGates.includes(p.door);
  const hasQi   = p.hasSanQi && !p.sanQiNullified;          // §4.7 nullification applies
  const hasJiGe = p.matched.some(m => m.tier === 'supreme-auspicious'
                                   || m.tier === 'auspicious');
  const hasXiongGe = p.matched.some(m => m.tier === 'inauspicious'
                                      || m.tier === 'supreme-inauspicious');

  let rung: Rung, band: Band;
  if (hasQi && hasGate)            { rung='奇門相會';   band='prime';  reasons.push('三奇與三吉門相會 — 最佳的方位'); }
  else if (hasGate)                { rung='得門不得奇'; band='good';   reasons.push('得門不得奇 — 吉利方位，可用'); }
  else if (hasJiGe && !hasXiongGe) { rung='逢吉格';     band='good';   reasons.push('不得奇門，但逢吉格 — 可用'); }
  else if (hasQi)                  { rung='得奇不得門'; band='plain';  reasons.push('得奇不得門 — 還不能算吉利方位'); }
  else                             { rung='凶方';       band='plain';  reasons.push('不得奇又不得吉門'); }

  // ── STEP 2 — QUALIFY 'prime'. S0(p137): 得時又得地…才是真正的吉。────────────
  //   All four must hold or the cell falls to 'good'. Each is a stated rule,
  //   not a tuning choice.
  if (band === 'prime') {
    const vital  = ['旺','相'].includes(p.strength.gate!);   // 得時得地
    const notPo  = p.menGong !== '迫';                       // 吉門剋宮吉不就 (p103)
    const notVoid= !p.kongWang;                              // 空亡 — 不實/徒勞
    const clean  = !hasXiongGe;
    if (!(vital && notPo && notVoid && clean)) {
      band = 'good';
      if (!vital)   reasons.push('吉門失氣 — 未得時得地，吉門也就不吉了');
      if (!notPo)   reasons.push('門迫 — 吉門剋宮，吉不就');
      if (!notVoid) reasons.push('空亡 — 事不落實');
      if (!clean)   reasons.push('同宮見凶格');
    }
  }

  // ── STEP 3 — PROMOTION good → prime. Two routes, both from source. ────────
  //   (a) A TOP-TIER 吉格, clean of 迫/墓/擊/刑 — the classical caveat
  //       "若逢迫墓擊刑，吉事成凶" (S0 p110, 青龍返首).
  const TOP_TIER = new Set([
    'qinglong-fanshou',   // 青龍返首  戊/丙 — 大吉大利
    'feiniao-diexue',     // 飛鳥跌穴  丙/戊 — 百事吉，可謀大事
    'tian-dun', 'di-dun', 'ren-dun',   // 天/地/人遁
    'sanqi-deshi',        // 三奇得使
    'sanqi-shengdian',    // 三奇貴人升殿 — 貴人升正殿，百事可為
    'sanqi-zhiling',      // 三奇之靈 — 吉道清靈，用事俱吉
    'tianxian-shige',     // 天顯時格
  ]);
  const topTier = p.matched.find(m => TOP_TIER.has(m.id));
  const cleanOfFour = p.menGong !== '迫' && !p.ruMu && !p.jiXing && !p.xing;

  if (band === 'good' && topTier && cleanOfFour && !hasXiongGe) {
    band = 'prime';
    reasons.push(`${topTier.name} — 上格，且不逢迫墓擊刑`);
  }
  //   (b) 得門不得奇 + a strong gate + a 四吉神. S0(p136) 神盤 rule +
  //       p137 吉神可起輔助作用. The deity is the assist, never the basis.
  if (band === 'good' && rung === '得門不得奇'
      && ['旺','相'].includes(p.strength.gate!)
      && ['太陰','六合','九地','九天'].includes(p.spirit)
      && cleanOfFour) {
    band = 'prime';
    reasons.push(`吉門得時得地，${p.spirit}相助`);
  }

  // ── STEP 4 — DEMOTIONS. Ordered; each drops at most one band. ─────────────
  //   (a) 吉門失氣. S0(p137): 生門臨震3巽4…受制…則吉門也就不吉了。
  if (hasGate && ['休','囚','死'].includes(p.strength.gate!)) {
    band = demote(band); reasons.push('吉門逢休囚 — 無力');
  }
  //   (b) 門迫 on an otherwise-good cell. S0(p103): 吉門剋宮，吉不就。
  if (hasGate && p.menGong === '迫' && band !== 'plain') {
    band = demote(band); reasons.push('門迫');
  }
  //   (c) 凶格 caps the cell. S0(p136): 如遇凶格，則不可用。
  if (hasXiongGe) { band = 'plain'; reasons.push('見凶格 — 不可用'); }

  // ── STEP 5 — (五不遇時 handled at step 0a — chart scope, early return.) ────

  // ── STEP 6 — 大事看星. S0(p140): 凡遇重大事情…還必須看九星的吉凶狀態。────
  if (profile.kind === 'purpose' && profile.highStakes && band === 'prime') {
    const starOk = STARS[p.star].quality !== 'inauspicious'
                && ['旺','相'].includes(p.strength.star!);
    if (!starOk) { band = 'good'; reasons.push('大事看星 — 九星無氣或為凶星'); }
  }

  return { band, rung, blocked:false, reasons };
}

const demote = (b: Band): Band => b === 'prime' ? 'good' : b === 'good' ? 'plain' : 'plain';
```

**Why this is the right shape.** Every branch above is a sentence in the book, not a parameter. A user asking "why is this gold?" gets `reasons` — 三奇與三吉門相會 · 青龍返首，且不逢迫墓擊刑 — rather than "it scored 134." And you can audit the whole rule set by reading it against pp.135–140, which is exactly the review you can do and I cannot.

**Rung ordering note (one deliberate extension).** S0 offers the 逢吉格 rescue for the *neither* case (不得奇又不得吉門). I let it fire for **any palace lacking a 吉門**, which also catches 奇-without-門 palaces that carry a 吉格. Reasoning: if a 吉格 rescues the weakest rung, it must rescue a stronger one. That is an inference from the ladder's logic, not a line in the text. To restrict it to the letter, add `&& !hasQi` to the `逢吉格` branch.

---

## 4. Lookup modes, filters, and role

### 4.1 Mode A — General (default)
`profile = { kind:'general' }`. Steps 8–9 are no-ops. Which directions are strong *at all* this hour.

### 4.2 Mode B — By purpose (用神)

`profile = { kind:'purpose', activity, role?, highStakes? }`. All inputs chart-derived. **No querent data.** 年命 stays out of v1 by decision.

**R9 substantially resolved.** S0(p145) gives the 用神綱領 directly:

> 測天時，以九星為主；測人事，以八門為主；測地理、方位，以九宮為主；測六親，以年、月、日、時為主…日干為求測之人，時干為所測之事。

```ts
interface PurposeProfile {
  activity: ActivityTag;
  yongShen: { gates: Door[]; stars: Star[]; spirits: Spirit[]; stems: Stem[] };
  classEmphasis: Partial<typeof CLASS_WEIGHT>;   // NEW — from the 綱領 above
  selfPalace: PalaceIndex;                        // palace of 日干
  matterPalace: PalaceIndex;                      // NEW — palace of 時干 (所測之事)
}
// 綱領 application:
//   human-affairs activities (launch, contract, partnership, career, romance)
//        → emphasise 八門
//   directional/relocation activities (travel, construction)
//        → emphasise 九宮 (i.e. palace element and 門宮 relation weigh more)
//   high-stakes anything → emphasise 九星 (大事看星, S0 p140)
//
// Step 9: boost palaces holding this activity's 用神; apply registry §8.2 preset
// boost/exclude; optionally apply the 日干宮 relation (§9-R5, defaulted OFF).
```

### 4.3 ⚠️ The usability ladder — TIGHTENED. Resolves R1.

S0(p136), selection chapter, states the ladder in full. v1's version was softer than the source.

```ts
type BaseFilterResult = '吉方' | 'usable' | 'not-auspicious' | '凶方';

// Chart-scope precondition — the slot must be free of:
//   五不遇時 · 三奇入墓 · 六儀擊刑 · 年/月/日/時格 · 大格/上格/刑格
//   · 飛干格 · 伏宮格 · 飛宮格                                    [S0 p136 list]
export function baseFilter(p: PalaceEval): BaseFilterResult {
  const hasQi   = p.hasSanQi && !p.sanQiNullified;     // §4.7 nullification applies
  const hasGate = ['開門','休門','生門'].includes(p.door);

  if (hasQi && hasGate)  return '吉方';           // 三奇 + 三吉門相會 — 最佳的方位
  if (hasGate)           return 'usable';         // 得門不得奇 — 也算吉利方位，可用
  if (hasQi)             return 'not-auspicious'; // ⚠️ 得奇不得門 — 還不能算吉利方位
  if (p.hasJiGe)         return 'usable';         // ⚠️ NEW RUNG — 逢吉格，也可用
  return '凶方';                                   // 如遇凶格，則不可用
}
```

**Two changes from v1:**
1. **R1 resolved to the STRICT reading.** 得奇不得門 does not count as an auspicious direction. v1 called it "weak." *Cost, as v1 predicted: usable inventory shrinks. That is the source-faithful behaviour.*
2. **A fourth rung v1 omitted:** neither 奇 nor 吉門, **but a 吉格 present → usable**.

**R6 resolved: 門宮相生 is a SCORE, not a hard filter.** v1 flagged a practitioner source making 相生/比和 a precondition. S0 handles it through strength instead — 生門臨震3/巽4…受制…則吉門也就不吉了 (p137). A 受制 gate is demoted by §3.4 step 4(a) on its own (吉門也就不吉了); a second hard gate would double-penalise. Keep it in §3.3.

### 4.4 ⭐ NEW — 主客. Partly chart-derived, not pure user input.

v1 had `role` as user input only. S0(pp.138–139), selection chapter, makes much of it computable.

```ts
// (1) HOUR-DERIVED — no user input. S0(p139):
//     五陽時 (甲乙丙丁戊) 利客: 打仗宜主動出擊；日常適宜遠行、求財、上任、遷徙、嫁娶、起造
//     五陰時 (己庚辛壬癸) 利主: 宜按兵不動，後發制人；商戰宜採取守勢，等待時機
export function hourRoleFavour(hourStem: Stem10): 'mover'|'host' {
  return ['甲','乙','丙','丁','戊'].includes(hourStem) ? 'mover' : 'host';
}

// (2) FORMATION-DERIVED. S0(p139):
//     白虎猖狂(辛/乙), 螣蛇夭矯(癸/丁) → 客剋主 → 利客
//     青龍逃走(乙/辛), 朱雀投江(丁/癸) → 主剋客 → 雖為凶格卻是為主不害，應該為主
//     伏吟 → host (按兵不動，以逸待勞) · 反吟 → mover (主動出擊)
//     太白入熒(庚/丙) → 為客進利，為主破財

// (3) STAR-PALACE DERIVED — ENTIRELY NEW, no 星–宮 relation existed in v1. S0(p139):
//     天盤星生地盤宮 → 利主 · 地盤宮生天盤星 → 利客
//     星剋宮        → 利客 · 宮剋星        → 利主
export function starPalaceRole(star: Star, p: PalaceIndex): 'mover'|'host'|null {
  const s = STAR_ELEM[star], q = PALACE_ELEM[p];
  if (generates(s, q)) return 'host';
  if (generates(q, s)) return 'mover';
  if (controls(s, q))  return 'mover';
  if (controls(q, s))  return 'host';
  return null;   // 比和 — 做事對雙方都有利
}
```

**Product consequence, and it is real:** a cell carrying 青龍逃走 or 朱雀投江 is **not simply unusable** — S0 says 為主不害，應該為主. A binary block/allow model throws that away. Surface such cells as *conditionally usable in the host role* rather than hiding them. This is a differentiator; consumer pickers do not do it.

**UI:** default `role` from `hourRoleFavour()`, let the user override with a two-state toggle (我主動 / 我等待). When user role and hour favour disagree, say so rather than silently scoring it.

### 4.5 ⭐ NEW — 神盤 tactical direction map

S0(p136) gives four 吉神 a directional/tactical meaning, which is exactly the register this model needs:

```ts
export const SPIRIT_TACTICAL: Partial<Record<Spirit, {role:'mover'|'host'; use:string}>> = {
  九天: { role:'mover', use:'主動出擊，先發制人 — initiate, go public, strike first' },
  九地: { role:'host',  use:'屯兵固守，以逸待勞 — hold, consolidate, defend' },
  太陰: { role:'host',  use:'埋伏，不易被敵人發現 — position unseen, prepare quietly' },
  六合: { role:'host',  use:'對於逃亡退卻有利 — exit, withdraw, disengage cleanly' },
};
// Renders as `PalaceScore.tactical` — one line of plain guidance in the direction popup.
// Also feeds the role weighting in step 8.
```

### 4.6 ⭐ NEW — 急則從神 (emergency mode)

S0(p135): 急則從神緩從門…如逢急難，宜從值符方下而行…沒有選擇三奇和吉門的充裕時間，便可從天盤值符所在之宮或地盤值符所在之宮而去。

```ts
export function emergencyDirections(chart: ChartResult): PalaceIndex[] {
  return [chart.tianPanZhiFuPalace, chart.diPanZhiFuPalace];
}
```
**UI:** an "urgent — I have to act now" toggle that bypasses the entire pipeline and returns these two directions with a plain explanation. Cheap to build, genuinely useful, and it is the one part of the tradition that answers "I don't have time to pick a good hour."

### 4.7 三奇受制 — extended, and it feeds the base filter

S0(p137) adds the **gate** as a controlling agent and describes compounding:

> 乙奇屬木，宜遇休門（屬水）及臨坎、震、巽3宮…能夠發揮它的作用；如果遇開門，則受金之剋，如臨乾六宮，不僅受乾金之剋，而且入戌墓，乙奇自然也就不奇了。

```ts
// Three control axes now: palace element · 地盤干 · GATE element (new).
// Compounding: 受剋 + 入墓, or 剋 on two axes → NULLIFIED (奇也就不奇了).
// When nullified, the palace does NOT count as 得奇 in baseFilter() — this is
// the one place a structural condition feeds the filter rather than the score.
// Symmetric positive case: 乙 with 休門 or in 坎1/震3/巽4 is EMPOWERED — small bonus.
```

---

## 5. Roll-ups: hour and day

**Hour:** no score. `counts.prime` / `counts.good` only. Plus `hourRoleFavour` and `chartWarnings`.

**Day:** a **projection**, never a mean. A day with one superb 時辰 and eleven mediocre ones is an excellent day for someone who can act at that hour; a mean buries it.

```ts
interface DayProjection {
  peak: { branch: Branch; palace: PalaceIndex; direction: Direction; score: number; band: Band };
  primeCells: number;
  goodCells:  number;
}
// ⚠️ CHANGED 2026-07-24 (Joe): the calendar day cell renders NEITHER a band, a
//    score, NOR a direction — no day-level shade at all (architecture §6.5). The
//    day roll-up below is still COMPUTED for search ranking, but the month cell
//    stays a plain date picker. Directional quality is shown one level down, in
//    the hour chart's palace cells (architecture §6.6). This supersedes the
//    "show direction in the month cell" idea that was here.
```

---

## 6. UI specification

### 6.1 PalaceCell background tint

```css
--band-prime-bg: color-mix(in srgb, var(--gold) 10%, transparent);
--band-good-bg:  color-mix(in srgb, var(--cyan)  7%, transparent);
--band-plain-bg: transparent;   /* absence of tint IS the signal */
```
- `plain` gets **no tint**. Only two tinted states; scanning is for presence, not discrimination among three fills.
- Tint sits behind all glyphs. Verify WCAG AA against the tinted background.
- `blocked === true` → `plain` plus an overlay marker (§9-R3).
- Score number in a fixed corner slot at reduced weight.
- **Renders in the existing hour chart, not a standalone tab** (architecture §6.6,
  changed 2026-07-24). Enrich the 奇门盘 grid already on the right of the day panel.
- **`--band-*-bg` fills derive from the ONE shared auspiciousness scale**
  (architecture §6.7): `--gold` = prime/大吉, `--cyan` = good/吉. The same base
  tokens feed HourRow counts, search results, and the legend — no per-surface drift.
- **⚠️ Formations are NOT rendered inside the box yet** (Joe, 2026-07-24). The cell
  shows band tint + corner score + the 神/门/星/干/支 glyphs only. Formation display
  at the cell level (box / chip / popup-only) is an OPEN question for Joe — matched
  formations stay in `PalaceDetailPopup` until he decides. See §9-R-UI below.

### 6.2 HourRow direction counts

```
辰時  07:00–09:00   [◆2]  [◆3]   ⚠︎五不遇時   ▸客
                     ↑      ↑        ↑          ↑
              prime count  good   chart warn   hour role favour (NEW)
```
- Zero counts render as an em-dash, not `0`.
- `chartBlocked` (五不遇時) renders the row struck through and dimmed, counts replaced by an em-dash, with the label 五不遇時 · 不用. The hour is shown so users learn the pattern — it is never silently omitted from the day panel, only from search results.

### 6.3 Direction affordance

The palace now means **a direction you go, face, or site something toward**. Minimum viable: label each cell with its compass direction. Preferred: an 8-segment rose per 時辰, each segment tinted by band. Almost no consumer app ships this; it is the clearest expression of the model.

### 6.4 ⭐ NEW — positive badges

v1 had `warnings` only. Several v2 conditions are *favourable* and users will not infer them:

| Badge | Condition | Copy |
|---|---|---|
| 凶不起 | 宮制 on a 凶門 | "The palace restrains this gate — less harmful than it looks" |
| 值符鎮庚 | 庚 shares palace with 值符 | "值符 damps the obstruction here" |
| 為主不害 | 主剋客 formation (青龍逃走 / 朱雀投江) | "Inauspicious to initiate, but safe if you're responding" |
| 得門不得奇 | baseFilter === 'usable' via gate | "Usable — the gate carries it without a 奇" |
| 奇門相會 | baseFilter === '吉方' | "三奇 and 三吉門 meet here — the best case" |
| 得時得地 | both vitality axes 得 | "Strong in both season and palace" |

---

## 7. Module changes

New:
```
src/calendar/strength.ts       # §3.1 vitality: two relation sets, two enums, AMPLITUDE
src/calendar/direction.ts      # PALACE_DIRECTION, baseFilter ladder §4.3, emergency §4.6
src/calendar/role.ts           # §4.4 主客: hour / formation / star-palace derivation
src/calendar/profiles.ts       # §4.2 用神 map incl. 綱領 classEmphasis
src/components/DirectionRose.tsx
```
Rewrite:
```
src/calendar/scoring.ts        # per-palace pipeline §3; scoreHour → HourSummary
src/calendar/data/patterns.ts  # registry v2 §3–§6, incl. the 81-entry SHI_GAN_KE_YING
src/calendar/data/structural.ts# registry v2 §7, incl. corrected applyMenGong
```
Extend:
```
src/components/PalaceCell.tsx     # band tint, score slot, direction label, badges §6.4
src/components/DayDetailPanel.tsx # HourRow counts + role glyph §6.2
src/components/MonthGrid.tsx      # DayProjection with direction §5
src/calendar/search.ts            # rank (hour × palace) cells, not hours
```

---

## 8. Calibration & tests

### 8.1 Band frequency — a sanity check, no longer a calibration

**There is nothing to calibrate.** §3.4 derives the band from rules; the frequencies fall out of the tradition rather than being chosen. Run the distribution once anyway, as a **bug detector**:

1. Compute every (hour × palace) cell over a full year for one method — 365 × 12 × 8 ≈ 35,000 cells.
2. Count each rung and each band.
3. **Expected shape, derived structurally so you can check the code against it:**
   - `奇門相會` (top rung) — a 奇 occupies 3 of 9 palaces and a 三吉門 3 of 9, so **≈10%** of cells before exclusions; call it **6–10%** after.
   - `prime` — that rung *minus* the four §3.4 step-2 qualifiers, *plus* the two promotion routes. Expect **2–5%**.
   - `prime + good` — **roughly 20–30%**. The tradition is not stingy with 可用; it is stingy with 最佳.
   - `blocked` — **20–30%**. 五不遇時 alone removes **exactly 1 時辰 in 12 (8.3%)** — each day stem has precisely one 五不遇 hour (§7.1 table), so this figure is a hard arithmetic check on the implementation. The rest is 時干入墓 and the 庚 格 family.
   - **Verify 8.3% exactly.** If 五不遇時 fires on materially more or fewer than one hour in twelve, the 日干/時干 polarity test is wrong. This is the cheapest correctness check in the whole distribution run.
4. **If the numbers land far outside those ranges, you have a bug, not a tuning problem.** The three most likely: 三奇 detection reading only one plate; the 庚 obstruction family over-firing; `sanQiNullified` (§4.7) too aggressive and stripping 得奇 from most palaces.
5. Commit the distribution snapshot as a fixture. A later change that shifts band frequencies materially should fail CI loudly.

S0(p140) is the reality check on the whole exercise: 大量的是中間狀態，絕不是非吉則凶…中平狀態居多. If your calendar comes out mostly ordinary, that is the tradition working, not the tool failing.

### 8.2 What is tradition and what is a tuning knob

The book fixes **direction and ordering**; it never fixes **magnitude**. 真正的吉 · 大大減低 · 輔助作用 · 凶上加凶 are all comparatives. Nothing in the tradition says *how much*.

**Traditional — never tune, protect with fixtures:**
- Every formation's tier sign (吉 vs 凶) and the relative ordering 大吉 > 吉 > 小吉 > 平 > …
- The monotonicity of `AMPLITUDE`: strong amplifies, weak flattens — for both signs.
- The direction of each 門宮 relation: 和/義 amplify · 制 damps · 迫 pushes negative.
- The class ordering 門 > 星 ≈ 奇 > 神.
- Every veto and every rung of the ladder.

**Engineering parameters — expected to be tuned, live in `scoring.ts` config:**
- The `AMPLITUDE` curve values (1.30 / 1.15 / 0.80 / 0.60 / 0.45).
- `K_SHENG`, `K_ZHI`, `K_PO`.
- `CLASS_WEIGHT` ratios (1.00 / 0.60 / 0.60 / 0.30).
- `TIER_WEIGHTS` magnitudes. (`BAND_THRESHOLDS` no longer exists — §3.4 replaced it.)

**Consequence for testing, and this is the rule that keeps the two apart:** every fixture asserts an **ordering**, never a value. `score(死門@旺) < score(死門@囚)` is a permanent contract. `score(死門@旺) === -78` is not — it breaks the first time anyone tunes a knob, for no benefit.

**Consequence for the product:** after §3.4, the app's **bands** are defensible against the source line by line, and its **rankings within a band** are reasonable. Its **absolute numbers are not** — a 137 does not mean anything a 129 doesn't. Show bands and ordering prominently; keep the raw number small and secondary (§6.1 already does this). Never put a number in user-facing copy that implies precision the tradition cannot supply.

**Fixtures required** — each carries provenance:
- **The inversion test (highest priority).** A 死門 in a 旺 state must score **more negative** than the same 死門 in a 囚 state. This is the exact assertion v1 would have failed. Write it first; it is the regression guard on the whole v2 correction.
- **The 門宮 生 test.** A 凶門 in a 和 or 義 palace must score **more negative** than the same gate in a 比和 palace (凶門得生禍難避).
- **The 制 test.** A 凶門 in a 制 palace must score **less negative** than in 比和 (凶不起).
- **Star enum test.** No 九星 vitality path may ever produce `'死'`.
- **Ladder test.** One fixture per rung of §3.4 / §4.3, including the 吉格-only rung and a 得奇不得門 cell asserting it does **not** reach `prime` or `good`.
- **Band-independence test (new, important).** Take a `prime` cell and multiply every scoring weight by 10. The band must not change. This is the contract that makes §8.2's knobs safe to turn.
- **Qualifier tests (§3.4 step 2).** A 奇門相會 cell must fall to `good` when any one of: gate is 休/囚/死 · 門迫 · 空亡 · a 凶格 shares the palace. Four fixtures, one per qualifier.
- **Promotion tests (§3.4 step 3).** 青龍返首 clean of 迫墓擊刑 → `prime`. The same 青龍返首 with 門迫 → stays `good` (若逢迫墓擊刑，吉事成凶).
- **Purpose-override test (§3.4 step 1).** A 傷門 palace must reach `good` under a 討債/捕獵 activity and `plain` under 開業 — proves the p136 但還看辦什麼事情 clause is wired.
- **五不遇時 exclusion test.** A cell that would be `prime` in a clean hour must return `blocked` + `plain` when the hour is 五不遇時 — including when the palace carries 青龍返首 or 天遁. No formation rescues the hour. All nine palaces must return blocked, and the hour must not appear in search results.
- **Reason-trace test.** Every non-`plain` cell must return at least one non-empty `reasons` entry. A band with no stated reason is a bug in the ladder.
- **Nullification test.** 乙 in 乾6 with 開門 → `sanQiNullified === true` → baseFilter must not see 得奇.
- **Veto test.** 六儀擊刑 and 三奇入墓 force `blocked` and `band==='plain'` regardless of how many 吉格 stack on the palace.
- **Order test.** Same palace scored with steps 2–3 applied to formations vs not — must differ; asserts formations are unscaled.
- **Role test.** A 青龍逃走 cell must surface as host-usable and mover-blocked.
- **Roll-up test.** A day with one `prime` cell and eleven weak 時辰 must project high-band — proves no mean crept back.
- **Purpose test.** The same hour must rank differently under two `activity` values, or the profile is not wired.
- **81-table test.** Every key in `SHI_GAN_KE_YING` resolves; all 81 present; no duplicate 格名 where the source gives distinct pairs.

---

## 9. Remaining rulings — none block engine work

**✅ RESOLVED since v1** — R1 (strict ladder, §4.3) · R6 (score not filter, §4.3) · R7-primary (star relation set + 廢, §3.1) · R8 (八神 are 輔助 → weight not filter, S0 p137) · R9 (用神綱領, §4.2) · plus the strength-table inversion, which v1 did not even list as a ruling because it was believed settled.

**⏳ STILL OPEN — defaults applied, change any in one line:**

**R2 — 中5宮.** *Default applied:* excluded from `counts` and direction search; still rendered and scored in the grid. Confirm.

**R-UI (NEW, 2026-07-24) — formation display at the palace cell.** Joe deferred
this. Until he rules, palace cells show band tint + corner score + glyphs only;
matched formations live in the popup, NOT in the box. Options to put to Joe:
in-box line, corner chip, or popup-only. *Confirm before building any in-box form.*

**R3 — `blocked` rendering.** *Default applied:* untinted cell + a diagonal hatch overlay. More honest than making it identical to `plain`; costs a fourth visual state. Confirm.

**R5 — 日干宮 relation in purpose mode.** *Default applied: OFF.* S0's selection chapter uses 日干 only for 五不遇時; the 日干為求測之人 framing is forecast-chapter (p144). Including it is more faithful to classical travel practice but drifts toward querent data, out of v1 scope. Deferred.

**N2 — 庚/乙.** Registry v2 §4.10 applies `inauspicious` (太白逢星, S0 p114) with a 吉門-gated lift to `conditional` via 奇儀相合. S0 states both readings in different chapters. Low stakes — one pair.

**N3 — 人遁 duplication.** `ren-dun` (p123, supreme) and `ren-dun-jige` (p112, auspicious) coexist, de-duped in scoring. Keep both, or drop the p112 form for strict N1 consistency?

**✅ RESOLVED BY RULING (2026-07):**
- **N1 — 九遁 trigger breadth.** Follow p123. Narrow: 天遁 = 生門+丙+丁, 地遁 = 開門+乙+己. Registry v2 §5.1.
- **R7-b — 九星 得地 axis.** Follow the book. **No 得地 axis for stars** — 月令 only, p106 relation set. The star–palace relation is routed to 主客 (§4.4), which is where S0(p139) assigns it. §3.1.
- **五不遇時 severity.** **Hard chart-scope exclusion** — the whole 時辰 is unusable, no formation rescues it (§3.4 step 0a). Upgraded from v1/v2-draft's "default-exclude with warning". Registry v2 §7.1, §2.2, §7.10 updated to match.
- **R4 — Band frequency.** **Dissolved, not answered.** Bands are now assigned by the S0(pp.135–140) rule ladder (§3.4), not by a score threshold. There is no percentage to choose and no calibration step. §8.1 keeps a distribution run purely as a bug detector.

---

## 10. Honest scope label

This model rates **chart quality per direction per 時辰**. It is not "good for this person" — 年命, personal 用神, and 神煞/黃曆 day layers are out of v1 by decision. UI copy should say so plainly.

The registry §0 caveat applies with full force to the score itself: 奇門遁甲 is a traditional metaphysical system, not an empirically validated predictive science. The number is an advisory ranking of tradition-faithfulness, not a probability of outcome.

S0(p140–141) says this better than a disclaimer can, and it is worth putting in front of users rather than in a footer:

> 吉與凶並非是絕對的，它們也存在相對性，在一定條件下還會相互轉化…大量的是中間狀態，絕不是非吉則凶。
> 實際結果並不一定是吉時吉方就一定有吉的成果…除了天時、地利，還有人和。人的主觀努力也占相當大的成分，所以還必須「盡人事」。經過人的努力，可能轉凶為吉。

That is the source itself telling the user the tool is advisory and the effort is theirs. Use it.
