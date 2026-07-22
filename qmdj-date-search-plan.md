# 奇門遁甲 擇日擇時 — Date/Time Selection & Search: Implementation Plan

**Scope:** the "find good dates/times for execution" feature described in `qmdj-app-architecture.md` §4.1, §6.3, §10, backed by the `qmdj-formations-registry.md` data spec. This plan turns those two documents into a build order.

**Decisions locked (2026-07):**
1. **Foundation first** — build the real 格局 registry + evaluator + scoring before any search UX. Search is only meaningful on a real score.
2. **Chart quality only** — a date's quality is pure `f(instant, method, settings)`. No querent 日主/用神/命卦 in v1. Scoring is structured so a querent layer *could* be added later without rework, but nothing in v1 depends on user data.
3. **All three search modes** ship in v1: Recommended, By-formation, Include/exclude filters.
4. **Engine accuracy bugs (月柱 from 節 / 局數 boundary-time / 時空 from hour 旬) reported fixed** — Phase 0 adds regression fixtures to lock that in, not to re-open it.

---

## 0. Where we are today

**Built:** engine (`src/engine/`) → `buildChart(instant, opts)` with palaces, pillars, 值使門, 空亡 flags; a **provisional** `src/calendar/scoring.ts` (coarse gate/star/spirit + 五不遇時 + 空亡, self-described as swappable); calendar layer (`computeDaySummary`/`computeMonthSummary`), worker bridge, month grid + day panel UI.

**Missing (= this feature):** the declarative formations registry, the pattern evaluator, the structural predicates, the real scoring config, activity presets, `searchRange`, and all search UI.

The provisional `scoreHour()` is the **single swap point** — `DaySummary`/`MonthSummary` shapes and the UI depend only on `{ score, band, warnings }`, so replacing the internals leaves everything downstream intact. Every phase preserves that contract.

---

## 1. Module map

New (create):
```
src/calendar/data/patterns.ts     # registry §4–§6 as PatternRule[] + symbol tables (GATES/STARS/SPIRITS, SANQI maps, tomb tables)
src/calendar/data/structural.ts   # computed predicates §7 (六儀擊刑, 三奇入墓, 五不遇時, 門迫/宮迫, 空亡, 伏吟/反吟, 時干入墓, 三奇受制, 悖格)
src/calendar/data/presets.ts      # ACTIVITY_PRESETS §8 (boost / goodGates / goodSpirits / exclude, per activity)
src/calendar/evaluator.ts         # interpret WhenClause against a palace / chart → matched formations
src/calendar/search.ts            # searchRange(): the cost-ordered pipeline + three modes
src/hooks/useSearch.ts            # search via worker bridge
src/components/SearchPanel.tsx    # query builder (activity / formation / range / filters)
src/components/SearchResults.tsx  # ranked slot list → jump to day/hour
```
Rewrite:
```
src/calendar/scoring.ts           # real TIER_WEIGHTS + veto tiers + structural modifiers (keeps scoreHour signature)
```
Extend:
```
src/worker/bridge.ts + engine.worker.ts   # add computeSearch()
src/components/MonthGrid.tsx / DayCell.tsx # overlay day score on the 12-segment bar (§10.3)
src/components/DayDetailPanel.tsx          # render formation badges from the registry (single source)
```

---

## 2. Data model

```ts
type SearchMode = 'recommended' | 'by-formation' | 'filter';

interface SearchQuery {
  start: { y: number; m: number; d: number };
  days: number;                 // 30 / 90 / 180
  hours?: number[];             // default all 12; allow restricting to waking 時辰
  mode: SearchMode;
  activity?: ActivityTag;       // 'recommended'
  formationId?: string;         // 'by-formation'
  filters?: {                   // 'filter'
    require?: string[]; avoid?: string[];
    minScore?: number;
    allowWuBuYu?: boolean;      // surface 五不遇時 slots with a warning instead of hiding
  };
  role?: 'host' | 'mover';      // 主/客 — weights 伏吟利主 / 反吟利客 for competition & travel
}

interface MatchedFormation { id: string; name: string; tier: Tier; palace?: PalaceIndex; }

interface SlotResult {
  instant: { y: number; m: number; d: number; hh: number };
  ganzhi: { day: string; hour: string };
  score: number; band: Band; blocked: boolean;
  matched: MatchedFormation[];  // drives badges + explanations
  warnings: string[];           // 五不遇時, 值使門臨空, 時干入墓 …
}

interface SearchResult {
  query: SearchQuery;
  slots: SlotResult[];                                   // ranked, blocked filtered (unless surfaced)
  dayScores: Record<string, { score: number; band: Band }>; // 'YYYY-MM-DD' → calendar overlay
}
```

---

## 3. Phases

### Phase 0 — Data + predicates (no scoring change yet)
- Transcribe registry §3–§6 into `patterns.ts`; §7 predicates into `structural.ts`. Keep the registry's `[CONSENSUS]/[VARIANT]/[DERIVED]` confidence flag on each rule.
- **One golden fixture per formation and per predicate** (boundary cases per architecture §4.4). Reuse the scaffold in `packages/engine/tests/golden/`.
- Add 3 regression fixtures pinning the accuracy fixes (a 節-boundary day for 月柱, a solar-term-crossing hour for 局數, an hour-旬 void case for 時空). Guardrail only.
- **Deliverable:** registry is data + tests; nothing wired into the UI. Fully reviewable against the spec.

### Phase 1 — Evaluator + real scoring
- `evaluator.ts`: `WhenClause` interpreter — AND of present fields, same-palace semantics for multi-symbol clauses, `scope:'chart'` rules evaluated once. Handles `any`, `anyStem`, `sanqiInPalace`, `isZhiShiGate`, `stemPairIsHe`.
- Rewrite `scoring.ts` per registry §9 pipeline:
  1. base valence (gate+star+spirit) → 2. `+TIER_WEIGHTS[tier]` per matched formation → 3. resolve `conditional` pairs from co-located gate → 4. structural modifiers (門迫/宮迫 asymmetry incl. 宮制 = 凶不起; 空亡/伏吟/反吟; 時干入墓/三奇受制 penalties) → 5. veto tiers (六儀擊刑 = absolute `blocked`; 三奇入墓 = `blocked`/nullify; 五不遇時 = default-exclude + heavy penalty) → 6. 迫/墓/擊/刑 gating that voids 青龍返首 / 飛鳥跌穴.
- **Interaction rules to encode explicitly** (all called out in the registry): 三詐 ⊂ 三奇之靈 → count the bonus once; 乙+庚 reads 合(和解) *with* a 吉門 else 被刑(凶); 三奇得使 rescues 奇⇢儀 凶 pairs; 天顯時 (hour stem 甲) suppresses the 伏吟 penalty.
- Output `{ score, band, blocked, matched, warnings }` — superset of today's shape, so `scoreHour()` stays drop-in. Calendar/UI unchanged, now real.
- **Open design point to finalize here:** the per-slot **roll-up** — today's provisional is `值使門×0.6 + outer-avg×0.4`. For chart-quality selection, the slot's worth for an activity should weight the palace(s) carrying that activity's key gate/star/spirit (from the preset) plus 值符/值使, not a flat average. Nail this before search.

### Phase 2 — Presets + search core
- `presets.ts`: `ACTIVITY_PRESETS` (§8) — each activity = `{ boost, goodGates, goodSpirits, exclude }`. Global vetoes (六儀擊刑, 三奇入墓) apply to every preset.
- `search.ts`: `searchRange(query) → SearchResult`. Cost-ordered pipeline over memoized boards (§4.1: ~180×12 slots < 1s): hard vetoes → score threshold → detailed formation match → rank. 主/客 weighting for competition/travel via `role`.
  - **Recommended:** rank all slots for `activity`.
  - **By-formation:** filter to slots where `formationId` matched (any palace), then rank.
  - **Filter:** apply `require`/`avoid`/`minScore`/`allowWuBuYu`, then rank.
- Reuse the memoized Stage-1 board cache (architecture §4.2, 1,080 layouts/method) so a 180-day sweep stays sub-second in the worker.

### Phase 3 — Search UX
- `SearchPanel`: mode toggle → activity picker / formation picker / filter builder; date range (30/90/180) + optional 時辰 restriction + min-score + role.
- `SearchResults`: ranked slots (date · 時辰 window · band · matched-formation chips); click → open that day/hour in the existing day panel.
- Calendar overlay (§10.3): paint each day's score onto the 12-segment month bar so the strongest days read at a glance.
- Day panel badges rendered directly from the registry (the reference/badges single-source promise).

---

## 4. Open items (resolve during build, not blockers)

- **三奇得使 label (registry §10.1):** source-faithful is 奇+值使門 (张志春). If you want the app to label 奇+任一吉門 as 三奇得使 for friendliness, it's a one-line `when` flip. Default: keep source-faithful.
- **Full 十干克應 81 combos (registry §10.2):** v1 ships only the fixed-valence pairs + `conditional` family already in §4. The complete 81 as a `conditional` reference table for palace pop-ups is a later enrichment.
- **VARIANT-flagged rules:** ship the common version; leave the alternative in a note for your review before any public launch (same discipline as your §10.6 "confirm before building").

---

## 5. Test guardrail (the point of foundation-first)

Every formation, every predicate, the roll-up, and each search mode gets a fixture. Because the chart is deterministic, a fixture is a permanent contract: once the registry is transcribed and green, tuning weights in `scoring.ts` can never silently break a formation. This is what makes the scoring safe to hand to a coding agent at speed.
