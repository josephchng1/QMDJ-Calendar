# Spec ↔ Engine Reconciliation

Reconciles `qmdj-app-architecture.md` (the blueprint) against what the `qimen-engine`
code actually exposes today. Read this before building the frontend — several spec
assumptions are already out of date.

_Last reviewed against engine v1.0.0._

---

## 1. Reality check: what exists vs. what the spec assumes

| Spec says | Reality in this folder |
|---|---|
| "React 19 + tRPC + Express + MySQL retained" | **None of it exists.** No server, no DB, no React — engine only. |
| Monorepo `packages/engine` + `apps/web` + `apps/server` (§2) | Flat `qimen-engine/` folder, no workspaces, no build tooling. |
| API: `computeChart` / `computeDaySummary` / `computeMonthSummary` / `searchRange` (§4.1) | Only `buildChart(input)` exists. No day/month/search functions yet. |
| `EngineOptions` = `{ method, boardType, lateZiShi, centrePalace }` | Real input is `ChartInput` (see §3). No `boardType`/`centrePalace`. |
| Three methods: 拆补 / 置润 / **阴盘** | Only **`zhirun` + `chaibu`**. 阴盘 (Yin Pan) is not implemented. |
| 飞盘 board type future-proofed | Only 转盘 (rotating) exists. |
| **Phase 1 — fix Bugs 1–3** (Gregorian month, intra-day 局 crossing, day-void vs hour-void) | **All three already fixed** in the engine. See §2. |
| Data registry: 门/星/神/干 metadata + 40+ 格局 patterns + scoring (§5) | **Does not exist.** Engine explicitly excludes 格局/scoring. Greenfield. |
| 农历 (lunar date) in day cells (§6.1) | Not implemented — moon series deliberately omitted. |
| Two-stage memoisation + Web Worker (§4.2, §6.3) | Not present. `buildChart` is a plain sync function. |

**Bottom line:** Phase 0 and most of Phase 1 are effectively done (under different
names). Everything Phase 2 onward — worker, tRPC wrapper, pattern registry, all UI,
search, .ics — is genuinely greenfield.

---

## 2. The "three correctness bugs" are already fixed

The spec (§4.3) frames these as top-priority work. They are already implemented:

- **Bug 1 (月柱 Gregorian month):** `fourPillars()` derives the month branch from the
  active 节 at the exact input moment, stem via 五虎遁 — not `getMonth()`.
- **Bug 2 (局数 intra-day term crossing):** `getJuChaiBu` uses the term in effect at the
  exact instant, so 局 switches mid-day at the crossing (tested at 小暑 2026-07-07 09:56).
- **Bug 3 (空亡 hour-void):** `hourKongWang` (from the hour 旬) and `dayKongWang` are
  separate fields; the board's void markers read from the hour void.

**Implication:** the frontend can trust the engine's pillars/局/空亡 as correct. Don't
re-plan Phase 1 as a fix; treat it as done and lift the golden case into a fixture if
you want a regression guard.

### One nuance the spec-era references won't match
For 置闰 (`zhirun`), the spec's cross-validated case 2026-07-06 23:00 gives **阴遁8局**,
whereas almanac/拆补 references give 阴遁9局. That is intended 置闰 behaviour (符头 己卯
already serving 小暑上), not a bug. If you show both methods side by side, expect them to
diverge in 超神/接气 windows.

---

## 3. The API the frontend actually codes against

```ts
import { buildChart } from './src/index.ts';

const chart = buildChart({
  y, m, d, hh, mm,                 // required — local civil date/time (24h)
  method: 'zhirun' | 'chaibu',     // default 'zhirun'
  lateZiNextDay: true,             // 晚子时 rolls day pillar to next day (default true)
  tzHours: 8,                      // default 8 (Beijing/Singapore)
  spiritVariant: false,            // true = 勾陈/朱雀 naming
});
```

### `Chart` (returned)
- `input` — echoes the call.
- `pillars: FourPillars` — `year/month/day/hour: GanZhi`, `qimenDayNum`, `isLateZi`,
  `currentTerm/nextTerm: SolarTerm`, `hourKongWang/dayKongWang: [number, number]`,
  `hourXunShou: GanZhi`, `maXing: number`.
- `juResult: JuResult` — `dun: 'yang'|'yin'`, `ju: 1..9`, `yuan: 0|1|2`, `servingTerm`,
  `fuTou: GanZhi`, `isRun`, `method`.
- `board: Board` — see below.
- `summary` — pre-formatted Chinese strings: `fourPillars`, `dun`, `yuan`, `term`,
  `zhiFu`, `zhiShi`. Use directly for a header; no assembly needed.

### `Board` (the 3×3 grid)
- `palaces: Palace[]` — flat, index `0..8` = Luoshu palace `1..9` (NOT grid order).
  Classic display order is `[4,9,2, 3,5,7, 8,1,6]`.
- `zhiFuStar`, `zhiFuPalace`, `zhiFuDisplayPalace` (中5→坤2), `zhiShiGate`,
  `zhiShiPalace`, `zhiShiDisplayPalace`, `xunShou`, `xunShouYi`, `hourKongWang`,
  `dayKongWang`, `maXing`.

### `Palace`
`palace`, `spirit|null`, `gate|null`, `stars: string[]` (芮宫 = `["天芮","天禽"]`),
`tianPanStems: string[]`, `diPanStem: string`, `isZhiFu`, `isZhiShi`, `isHourKong`,
`isMaXing`. Palace 5 (中宫) has null spirit/gate/stars — render only its `diPanStem`.

Rendering reference: `example.ts` lines 19–34 map the order array over `palaces`.

---

## 4. What the app layer still owns (not in the engine)

Build these fresh — the engine exposes the raw fields but no interpretation:

- **格局 detection** (青龙返首, 门迫, 入墓, 击刑 …) and **quality scoring** — spec §5's
  declarative registry + evaluator. Greenfield.
- **门/星/神/干 metadata** (element, quality, meaning, uses) — spec's single source of
  truth. Engine only returns names.
- **Day/month summaries + search** — wrap `buildChart` (12 时辰/day; 180-day scan).
- **农历** display, **.ics** export, **saved charts / preferences** persistence.

---

## 5. Recommended amendments to the blueprint

1. Rename spec API to the real names, or add thin aliases:
   `computeChart = buildChart`; build `computeDaySummary/MonthSummary/searchRange` as new
   wrappers over `buildChart`.
2. Drop `boardType`/`centrePalace`/`yinpan` from the near-term `EngineOptions` — mark as
   future, since none exist. Keep `method` (2 values), `lateZiNextDay`, `tzHours`,
   `spiritVariant`.
3. Re-label Phase 0–1 as "done — add regression fixtures", not "fix bugs".
4. Note the 置闰-vs-拆补 divergence so the UI's "both methods" view is expected, not
   flagged as an error.
