# 奇门遁甲 App — Technical Architecture Blueprint
**Goal:** an accurate, fast, easy-to-navigate daily tool for finding good dates.
**Visual direction:** unchanged — keep the current dark + gold aesthetic at https://qimendunjia-7vrdqlgc.manus.space.
**Stack:** React 19 + TypeScript + tRPC + Express + MySQL (retained, but with responsibilities re-distributed as below).

---

## 1. The One Architectural Insight That Drives Everything

A Qimen chart is a **pure, deterministic function**:

```
chart = f(instant, method, settings)
```

No user data, no external state, no network needed. This has three consequences that shape the whole architecture:

1. **The engine should be a standalone, dependency-free TypeScript package** that runs identically in Node *and* in the browser.
2. **Nothing chart-related ever needs to be stored in MySQL.** The database shrinks to user data only (saved charts, preferences). This removes an entire class of sync/staleness bugs.
3. **The board space is tiny and cacheable.** A board layout is fully determined by (阴/阳遁, 局数, 时干支) — at most 2 × 9 × 60 = **1,080 unique boards per method**. Memoize them once and a full month view or a 180-day search becomes a sequence of near-free lookups.

Everything below follows from these three points.

---

## 2. Repository Structure (Monorepo)

```
qmdj/
├── packages/
│   └── engine/                  # Pure TS. ZERO runtime dependencies.
│       ├── src/
│       │   ├── calendar/        # ganzhi, solar terms, 晚子时, 空亡, 马星
│       │   ├── board/           # 地盘, 天盘, 九星, 八门, 八神 construction
│       │   ├── patterns/        # declarative 格局 registry + evaluator
│       │   ├── scoring/         # palace + overall quality scoring
│       │   ├── data/            # single source of truth (see §5)
│       │   └── index.ts         # public API
│       └── tests/
│           ├── golden/          # verified chart fixtures (JSON)
│           └── boundaries/      # solar-term crossing, 晚子时, 换旬 cases
├── apps/
│   ├── web/                     # React 19 + Tailwind 4 (current look)
│   │   └── src/worker/          # engine running in a Web Worker
│   └── server/                  # Express + tRPC — thin wrapper over engine
└── tooling/                     # fixture generator, cross-check scripts
```

**Why a monorepo:** the engine is imported by both `web` (client-side computation) and `server` (API parity + .ics generation). One implementation, two runtimes, no drift.

---

## 3. Layered Architecture

```
┌─────────────────────────────────────────────────┐
│  UI Layer (React)                               │
│  CalendarPage · DayDetailPanel · ChartView ·    │
│  SearchPage · ReferencePage · Settings          │
├─────────────────────────────────────────────────┤
│  Data Hooks (useChart, useMonthSummary,         │
│  useSearch) → talk to the Worker, not tRPC      │
├─────────────────────────────────────────────────┤
│  Web Worker: @qmdj/engine + memo cache          │  ← all chart math here
├─────────────────────────────────────────────────┤
│  tRPC/Express (thin): saved charts, .ics,       │
│  share links — user data only                   │
├─────────────────────────────────────────────────┤
│  MySQL: users, saved_charts, preferences        │  ← nothing computed
└─────────────────────────────────────────────────┘
```

**Key shift from the current build:** `qmdj.chart`, `qmdj.daySummary`, `qmdj.monthSummary`, and `qmdj.search` no longer need server round-trips. The engine runs in a Web Worker in the browser, so calendar navigation, day panels, chart paging (← →), and even 180-day searches are instant and work offline. The tRPC endpoints are kept (same names, same shapes) as a thin server-side wrapper for API consumers and for .ics generation — they call the same engine package, so results are guaranteed identical.

---

## 4. Engine Design (`@qmdj/engine`)

### 4.1 Public API

```ts
computeChart(instant: Instant, opts: EngineOptions): ChartResult
computeDaySummary(date: CivilDate, opts): DaySummary        // 12 时辰 ratings
computeMonthSummary(year, month, opts): MonthSummary        // per-day 12-seg bars
searchRange(range: DateRange, query: SearchQuery, opts): RankedSlot[]

interface EngineOptions {
  method: 'chaibu' | 'zhirun' | 'yinpan';
  boardType: 'zhuanpan' | 'feipan';        // 飞盘 future-proofed now
  lateZiShi: 'nextDay' | 'sameDay';        // 晚子时
  centrePalace: 'kun' | 'gen';             // future-proofed
}
```

All functions are pure. `ChartResult` carries everything the UI needs — palaces, four pillars, 值符/值使, 旬首, 空亡, 马星, detected patterns, scores — so the UI layer never re-derives Qimen logic.

### 4.2 Two-Stage Computation with Memoization

Split the pipeline into a **cacheable board stage** and a **cheap context stage**:

```
Stage 1 — Board (memoized)
  key = (遁, 局数, 时干支)                    ≤ 1,080 entries/method
  → 地盘, 天盘, 九星, 八门, 八神, 值符宫, 值使宫

Stage 2 — Context (computed per call, ~free)
  inputs = board + 日干支 + exact instant
  → 空亡 (from HOUR ganzhi), 马星, 五不遇时 (needs 日干),
    伏吟/反吟, day-dependent patterns, final scoring
```

The split matters because a handful of patterns (五不遇时, some 入墓 checks) depend on the day pillar, not just the hour — folding those into the memo key would explode the cache for no benefit. With this split, a month view is 31 × 12 = 372 stage-2 passes over ≤ 1,080 cached boards: milliseconds.

### 4.3 The Three Correctness Bugs — Fix Specifications

These are the highest-priority work items. Precise fixes:

**Bug 1 — 月柱 uses Gregorian month.**
`monthGanzhi()` must derive the month **branch** from the current 节 (the 12 "sectional" terms 立春, 惊蛰, 清明 …), not `date.getMonth()`. The month **stem** then follows from the year stem via the 五虎遁 rule (甲/己年 → 丙寅 first month, 乙/庚 → 戊寅, 丙/辛 → 庚寅, 丁/壬 → 壬寅, 戊/癸 → 甲寅, advancing from there). Implementation: `solarTermJDN()` already exists — build `monthBranchAt(instant)` that finds the latest 节 boundary ≤ instant, compared at **exact JDN including time of day**, not calendar date.

**Bug 2 — 局数 doesn't handle intra-day solar-term crossing.**
`getJuChaibu()` / `getJuZhirun()` must compare the *instant* (hour-resolution JDN) against the exact solar-term crossing time. Rule: if the term crosses at 09:56, hours before 09:56 belong to the previous term's 局, hours after to the new one. One shared helper `activeSolarTerm(instant)` used by both month-pillar and 局数 logic guarantees they can never disagree.

**Bug 3 — 空亡 uses day void instead of hour void.**
时空 must be computed from the **hour ganzhi's 旬**: find the 旬首 of the hour pillar, and the two branches outside that decade are void. Keep 日空 as a separately-named field if you want to display both later — but the chart's 空亡 markers read from hour void.

**Interaction to test explicitly:** 晚子时 (23:00–01:00) advances the day pillar to the next day *while* 局数 still follows the original date's active solar term — and the hour void must follow the new hour pillar. Write boundary fixtures for exactly this.

### 4.4 Test Harness — How Accuracy Stays Locked In

Accuracy is your product's core promise, so it gets first-class infrastructure:

**Golden fixtures.** JSON files, one per verified chart, e.g. the already-verified 壬午日 庚子时 阴遁9局 (2026-07-06 23:00) with all 9 palaces. Add 10–20 more spanning: both 遁, several 局, all three methods, 晚子时, and dates immediately before/after solar-term crossings. Source them from the same references already used (wannianrili.bmcx.com, yourchineseastrology.com, Yanxiang, 3meta), and record the source in each fixture.

**Boundary tests.** For every solar term in a sample year: assert pillar/局数 at crossing-time −1 minute and +1 minute.

**Pattern unit tests.** Each 格局 rule (see §5) gets at least one positive and one negative fixture.

**Regression gate.** CI runs the full suite on every change to `packages/engine`. No engine change merges with a red golden test. This is what makes it safe to hand implementation work to an AI coding agent at speed — the tests are the guardrail.

---

## 5. Single Source of Truth: The Data Registry

Right now, knowledge about 门/星/神/干/格局 is likely scattered across engine logic, UI colour maps, and the Reference page. Consolidate it into `packages/engine/src/data/`:

```ts
// gates.ts (similarly stars.ts, spirits.ts, stems.ts, palaces.ts)
export const GATES = {
  kai:  { name: '开门', element: 'metal', quality: 'auspicious',  meaning: '...', uses: [...] },
  xiu:  { name: '休门', element: 'water', quality: 'auspicious',  meaning: '...', uses: [...] },
  ...
}

// patterns.ts — declarative rule registry
export const PATTERNS: PatternRule[] = [
  {
    id: 'qinglong-fanshou',
    name: '青龙返首',
    tier: 'supreme-auspicious',
    scope: 'palace',
    when: { tianPanStem: '戊', diPanStem: '丙' },   // interpreted by evaluator
    interpretation: '...',
    guidance: { favours: [...], avoid: [...] },
  },
  ...
]
```

A small evaluator interprets `when` conditions instead of 40+ hand-written `if` blocks. Payoffs:

- Every pattern is **individually testable and auditable** — a domain expert (you) can review rules as data without reading code.
- The **Reference page renders directly from this registry** — it can never drift from what the engine actually does.
- **Search filter chips, calendar badges, palace popups, and event titles** all pull names/meanings from one place.
- Adding a pattern = adding one data object + one test fixture.

Scoring weights live here too (`scoring.ts` as a config table mapping tiers/elements/gates to weights), so tuning chart quality never requires touching algorithm code.

---

## 6. Frontend Architecture

### 6.1 Component Tree (matches the current UI)

```
App
├── Sidebar (collapsible)           節气, 局数, activity presets, include/exclude chips
├── CalendarPage
│   ├── MonthGrid → DayCell         lunar date, 干支 toggle, badges — NO day shade, NO day score (§6.5)
│   └── DayDetailPanel (right slide-in)
│       ├── HourList → HourRow       direction counts, patterns, warnings, role glyph, +日历
│       └── ChartView (inline, on the right) ← palace scoring + shading live HERE, not a standalone tab (§6.6)
├── ChartView
│   ├── QualityBanner · Breadcrumb · HourNav (← →)
│   ├── PalaceGrid → PalaceCell (神/门/星/干/支 order, band shading + corner score — §6.6)
│   ├── FourPillarsBar
│   └── PalaceDetailPopup
├── SearchPage → FilterBuilder, ResultsList (ranked), ExportIcs
├── ReferencePage                    ← rendered from the data registry (§5)
└── SettingsPage                     ← writes EngineOptions to localStorage
```

**Two UI decisions locked in 2026-07-24 (Joe):** the calendar day cell no longer
carries a shade or a score (§6.5), and the palace chart is **not** a standalone
tab — its scores and shading render inside the existing hour chart on the right
of the day panel (§6.6).

### 6.2 State & Data Flow

- **Engine settings** (method, 晚子时, board type, display prefs): React context, persisted to `localStorage`. Changing a setting invalidates the worker's memo cache in one message.
- **Navigation state** (selected month / day / hour, active filters): **URL search params**. This makes every chart deep-linkable and shareable — e.g. `?d=2026-08-14&h=chen&m=chaibu` — which later becomes your "share this auspicious slot with a client" feature for free.
- **Data hooks** (`useMonthSummary`, `useDaySummary`, `useChart`, `useSearch`): async calls into the Web Worker via a typed message bridge (or Comlink). Same TypeScript types as the tRPC router, so switching a hook between worker and server is a one-line change.
- **Hour paging (← →)** pre-computes the adjacent two hours in the worker so navigation feels instantaneous.

### 6.3 Search Execution

Brute force is genuinely fine here — and simple beats clever:

- 180 days × 12 时辰 = 2,160 slots. With memoized boards, stage-2 evaluation per slot is sub-millisecond → full search well under a second, inside the worker, no server involved.
- Filter pipeline ordered cheap-to-expensive: hard excludes (五不遇时, excluded gates) → quality threshold → detailed include-pattern matching → rank by weighted score.
- Activity presets (开业, 签约, 出行 …) are just named filter bundles stored in the data registry — user-visible and editable later.

### 6.4 Calendar Export

.ics generation is pure string templating — do it **client-side** in `apps/web` (works offline, no server dependency), with the tRPC `exportIcs` endpoint kept for API parity. Google Calendar URL-scheme links stay as they are.

### 6.5 Calendar day cell — no shade, no score (changed 2026-07-24)

**A day no longer carries an overall shade or an overall score.** The day-level
number was a projection of nine directions × twelve 時辰 onto one figure, and per
the v2 per-palace model that roll-up is not a meaningful single quality — so it
is removed from the calendar rather than shown misleadingly.

The month cell keeps only **navigation/date information**: Gregorian date, lunar
date, the 干支 toggle, and (optionally) formation badges. No 12-segment quality
bar, no day-band underline, no heat-map tint. The calendar is a *date picker*,
not a quality map; quality lives one level down, per hour and per palace (§6.6).

This **reverses §10.3** (the earlier "day score at a glance" backlog item) and
supersedes the v2 model's `DayProjection` calendar rendering
(`qmdj-palace-direction-model-v2.md` §5) — the day roll-up may still be *computed*
for search/ranking, but it is **not rendered** on the calendar.

### 6.6 Palace scoring & shading live in the hour chart — not a separate tab (changed 2026-07-24)

There is already an **hour chart on the right side** of the day panel (the 奇门盘
/ `ChartView` 九宫 grid for the selected 時辰). Palace band shading and the palace
score render **there**, on the existing chart. Do **not** add a standalone palace
tab or page — enrich the chart that is already on screen.

Per palace cell:
- **Band shading** behind the glyphs, using the shared band tokens (§6.7):
  `prime` (大吉) and `good` (吉) tinted; `plain` (不吉) untinted — absence of tint
  is itself the signal. `blocked` renders untinted with a hatch overlay.
- **Score in one fixed corner** of the cell (change requested 2026-07-24), small
  and low-weight — an ordering hint, never headline copy (§8.2 of the v2 model:
  the absolute number is not defensible; the band and ordering are).
- The 神/门/星/干/支 glyph order and element colours are unchanged.

**⚠️ OPEN — confirm with Joe before building:** whether to render the matched
**formation(s) inside the palace box**. For now, **do not put formations in the
box.** Joe will decide later how (and whether) formations surface at the cell
level — e.g. box, corner chip, or popup-only. Formations remain available in the
`PalaceDetailPopup`; only the in-box placement is deferred pending Joe's call.

### 6.7 One shared auspiciousness colour scale — kept in sync (changed 2026-07-24)

**Every surface that expresses auspiciousness must draw from one shared token
set**, so "very auspicious / auspicious / neutral / inauspicious" reads as the
same colour everywhere it appears — palace shading, hour-row direction counts,
search results, filter chips, legend, and the reference page. No surface may
define its own private shade for the same band.

```css
/* single source of truth — used by PalaceCell, HourRow, SearchResults, Legend */
--band-prime:  var(--gold);   /* 大吉 — very auspicious */
--band-good:   var(--cyan);   /* 吉   — auspicious       */
--band-plain:  transparent;   /* 不吉 — neutral (no tint) */
--band-blocked: hatch overlay;/* 不用 — excluded          */
```

Tint fills for shaded surfaces are derived from these base tokens by a single
`color-mix` step (see the v2 model §6.1), so a change to one token restyles the
whole app consistently. A shared `<Legend>` component reads the same tokens, so
the legend can never drift from what the cells show.

### 6.8 Palace colour follows the SCORE; cell layout redesign (changed 2026-07-24)

Two decisions from Joe that revise §6.6 and, for display, override §3.4 of the
palace-direction model:

**(a) Colour follows the score — not the rule-ladder band.** Joe flagged that a
cell could show a tinted (吉) background yet a negative score, because the band
(`assignBand`, classical ladder) and the ordering `score` are computed
independently. To remove that contradiction, the **displayed** band — palace tint,
corner-score colour, hour 大吉/吉 counts, legend — is now derived from the score by
`scoreBand()` in `bandsV2.ts`:

```
score ≥ SCORE_PRIME (25) → 大吉 (gold)
score ≥ SCORE_GOOD  (8)  → 吉   (teal)
else                     → 不吉 (no tint)      · blocked → no tint + hatch
```

Colour and number can no longer disagree. `SCORE_PRIME`/`SCORE_GOOD` are tuning
knobs (§8.2). ⚠️ Deliberate reversal of "band by rule ladder, not threshold"
(R4/§3.4) **for the UI only** — the rule-ladder `band`/`rung`/`reasons` are kept
and shown in the palace click-popup as the classical basis. Reverting to
classical-band colouring is a one-line switch back to `PalaceScore.band`.

**(b) Cell layout (image-matched).** 神 / 门 / 星 stacked in the **middle**, large
(same size as 天盘). 天盘 over 地盘 at the **bottom-right**, no 天/地 labels. Four
corners carry existing symbols: **score** (top-left), **符/使/空/马** (top-right),
**palace number** (bottom-left), **天/地盘** (bottom-right). 中5宫 follows the
second reference: grey 天盘 top-left, 神 · 五 · 地盘 along the bottom.

**(c) Gold hour-pillar removed** from the 奇门盘 view (already in `FourPillarsBar`);
the gold box on the 时干 (old §10.5) is dropped too.

**⚠️ Not implemented — glyphs not yet computed** (as §10.6 warned): the small grey
stem in the top-left corner and the bottom-left 八神-rotation label in the
reference. Meaning unconfirmed, so omitted rather than guessed — for Joe to define.

---

## 7. Server & Database (Deliberately Thin)

**tRPC endpoints retained:** `qmdj.chart`, `daySummary`, `monthSummary`, `search`, `exportIcs` — each a ~5-line wrapper calling `@qmdj/engine`. Useful for future API consumers, integrations, or a mobile client.

**MySQL schema shrinks to:**

```sql
users            (id, ...)
saved_charts     (id, user_id, name, instant, engine_options_json, created_at)
preferences      (user_id, options_json)
```

`saved_charts` stores only the *inputs* (instant + options), never the computed chart — recompute on load. This means engine bug-fixes automatically correct all historical saved charts, which for an accuracy-first product is exactly the behaviour you want.

---

## 8. Build Order — Phased Plan for Claude Code

Sequenced so accuracy is locked before features, and each phase leaves the app shippable:

**Phase 0 — Extract & Lock (1 session).** Pull the existing engine code into `packages/engine`; port the verified 壬午日庚子时 chart into a golden fixture; get CI green. No behaviour changes.

**Phase 1 — Correctness (1–2 sessions).** Implement `activeSolarTerm(instant)`; fix Bugs 1–3 per §4.3; add boundary + 晚子时 fixtures; expand golden fixtures to 15–20 charts across methods/遁/局. *Exit criterion: all fixtures green, cross-checked against two independent references.*

**Phase 2 — Performance Re-plumb (1 session).** Two-stage memoization (§4.2); move engine into a Web Worker; switch calendar/day/chart hooks from tRPC to worker. UI unchanged visually; navigation becomes instant.

**Phase 3 — Registry Refactor (1–2 sessions).** Migrate 门/星/神/干 metadata and all 40+ patterns into the declarative registry (§5); regenerate Reference page from it; per-pattern tests.

**Phase 4 — Search & Export polish (1 session).** Worker-based search with preset bundles; client-side .ics; deep links via URL params.

**Phase 5 — Roadmap features.** In this order (each now cheap because of the architecture): 年命 input for personalised readings (stage-2 addition), 旺相休囚 indicators (data registry + stage-2), saved charts (inputs-only DB rows), 飞盘 board type (alternate stage-1 strategy behind `boardType`), 日家奇门, image/PDF export, Traditional Chinese (string table swap), light mode (Tailwind theme tokens).

**Working method with Claude Code:** one phase per session; start each session by running the golden suite; every engine change must land with a fixture. The test harness — not the human — is the reviewer of Qimen correctness, which is what makes fast AI-assisted iteration safe here.

---

### 8.1 UI adjustments — 2026-07-24 (specs updated first, build order below)

Four small, engine-safe presentation changes from Joe. Specs above are updated;
this is the proposed order (each is pure presentation on the existing engine +
v2 scoring — no correctness risk):

1. **Shared band tokens (§6.7)** — factor auspiciousness colours into one token
   set + a `<Legend>` reading them. *Do first: everything else consumes these.*
2. **Calendar de-scoring (§6.5)** — strip day shade / score / 12-seg bar from
   `DayCell`; keep date + lunar + 干支 toggle. Small, isolated.
3. **Palace shading + corner score in the hour chart (§6.6)** — band tint behind
   glyphs, score in a fixed corner, on the existing `ChartView` grid. Remove the
   standalone palace tab. **Do not** render formations in the box.
4. **Confirm-gate:** ask Joe how/whether formations surface at the cell level
   before building any in-box formation display (§6.6 ⚠️).

Sequence rationale: (1) unblocks (2) and (3); (4) is a question, not code.

---

## 9. What Explicitly Does *Not* Change

- Visual design, layout, colour language (dark + gold, cyan/green/amber/red quality coding, palace element ordering 神→门→星→干→支). **One shared auspiciousness scale (§6.7)** — very-auspicious / auspicious / neutral / inauspicious use the *same* shades on every surface; no per-surface colour drift.
- The three-method support (拆补 / 置润 / 阴盘) and all existing feature behaviour.
- tRPC endpoint names and response shapes (so anything already integrated keeps working).

The re-architecture is invisible to users on day one — they just notice the app got instant, works offline, and (after Phase 1) the pillars, 局数, and 空亡 are finally exactly right.

---

## 10. Feature Backlog — requested 2026-07-19

Six feature updates from Joe, captured here as the working spec. Reference for
§10.5/§10.6 is a screenshot of a commercial 时家转盘 app (chart:
2026-07-08 酉时, 阴遁八局[9置闰], 值符 甲寅癸·天冲落中五宫, 值使 伤门落中五宫).
Ordered as given; not yet implemented.

### 10.1 Date search — three modes (extends §4.1 `searchRange`, §6.3)
Search a date/time range and surface good slots by any of:
1. **Recommended** — rank every 时辰 by the current quality score, best first.
2. **By formation (格局)** — pick a 格局; return every slot where it occurs.
3. **Include / exclude filters** — chips for formations to *require* and to
   *avoid*, combined with a score threshold.
Modes 2–3 depend on the §5 declarative 格局 registry (which formation list to
offer). Mode 1 works against today's provisional score already.

### 10.2 Symbol colour modes for 神 / 门 / 星 (extends §6.1, §9 colour language)
Let the user switch how 八神 / 八门 / 九星 are coloured, choosing between:
- **Auspiciousness** — quality bands (cyan/green/grey/amber/red). Current default.
- **五行 (5-element)** — wood/fire/earth/metal/water. Tokens already exist
  (`--wood/--fire/--earth/--metal/--water`; stems already use them).
Selectable per symbol class and persisted (localStorage, per §6.2 settings).

### 10.3 ~~Day score at a glance on the calendar~~ — WITHDRAWN 2026-07-24
**Reversed.** Joe: the calendar day cell shows **no shade and no score** — the
day-level roll-up is not a meaningful single quality (see §6.5). This backlog
item is retired; the month cell stays a plain date picker. Directional quality is
surfaced per hour and per palace in the hour chart instead (§6.6).


### 10.4 One-click ±1 day on the day panel (extends §6.1 DayDetailPanel)
Add prev/next-day arrows at the top of the right-hand day panel (mirroring the
reference app's ◀ ▶ header), advancing the selected day by ±1 while keeping the
current 时辰 and active tab.

### 10.5 Hour-stem box on 天盘 / 地盘 (new marker)
Draw a box/outline around the **时干 (hour stem)** wherever it appears on the
天盘 and on the 地盘 inside the palaces, marking the acting hour. In the
reference the hour is 辛酉, and 辛 is boxed in both 中五宫 and 坎一宫. Engine
already exposes hour ganzhi (`chart.pillars.hour`) and each palace's
`tianPanStems` / `diPanStem`, so this is pure presentation.

### 10.6 Palace-cell layout to match the reference (re-work §6.1 PalaceCell)
Re-arrange every 九宫 cell to the screenshot's positions. Slots seen per cell
(巽四宫 example → grey 丙 · 太阴 · 休门 · 天蓬 丙 · 天 四 壬):

```
[grey stem, TL corner]                         [八神, colored, TR]
[迫/刑 marker]  [八门, colored]                  [空/马 badge, corner]
[九星, colored]  [天盘干, colored]  [墓 superscript]
[八神-abbrev/值使 label]  [palace number, grey]  [地盘干, colored]
```

Markers to place precisely: **迫** (left of the gate), **墓** (superscript by
star/stem), **刑**, and **空 / 马** as corner chips (yellow in the reference).

**⚠️ Confirm before building:** two glyphs in the reference are ambiguous from a
single screenshot — (a) the small **grey stem in the top-left corner**, and
(b) the **bottom-left colored label** (天/地/玄/符/常/虎/蛇/阴/合, which is a
*different* 八神 rotation than the top row). Joe (domain expert) to confirm what
each represents before implementation.

### Dependency notes
- 10.1(2–3) and trustworthy scoring both need the **§5 格局 registry** — building
  that unblocks the most backlog at once.
- 10.2 and settings persistence share the same localStorage settings work (§6.2).
- 10.3 / 10.4 / 10.5 are small, independent UI changes on the existing engine.
