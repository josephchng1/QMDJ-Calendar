# 奇门遁甲 · 择日历 (Qimen Calendar)

A daily calendar for finding good dates and hours by 时家奇门遁甲. A Qimen chart is a
pure, deterministic function of `(instant, method, settings)` — so the whole app
computes **client-side in a Web Worker**, works offline, and never needs a server.

Built on a **vendored, frozen copy** of the Zhirun chart engine
(`src/engine/`, from [`josephchng1/QMDJ`](https://github.com/josephchng1/QMDJ)).
The engine is never edited here; algorithm updates are re-synced deliberately.

## What it does today

- **Month calendar** — every day shows a 12-segment bar (one per 时辰) plus a
  whole-day quality band, so auspicious windows pop at a glance.
- **Day panel** — click a day for its 12 时辰 ratings (with 五不遇时 / 时空 flags)
  and the full **奇门盘** for any hour, with ← → hour paging.
- **Three methods** — 置闰法 (default) / 拆补法, 八神变体, 晚子时次日 toggles.
- **Deep links** — the selected month / day / hour / options live in the URL, so
  any view is shareable (`?ym=2026-07&d=2026-07-14&h=6&mtd=zhirun`).

## Architecture (per the blueprint)

```
src/
├── engine/     # vendored pure engine — buildChart(instant, opts) → Chart
├── calendar/   # scoring.ts (provisional quality) · summary.ts (day/month) · bands.ts
├── worker/     # engine.worker.ts + typed bridge (chart / day / month)
├── hooks/      # useChart · useDay · useMonth
└── components/ # MonthGrid · DayCell · DayDetailPanel · HourRow · PalaceGrid · …
```

## ⚠️ Scoring is provisional

The colour scoring is a **coarse v1 heuristic** (conventional 门/星/神
auspiciousness + 五不遇时 + 时空), **not** authoritative 格局 evaluation. It exists
to drive the calendar bars until the declarative pattern + scoring registry
(blueprint §5) is built. `src/calendar/scoring.ts` is the single swap point.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

Also runs as-is on StackBlitz.

## Roadmap

Search (find best slots across a range), a data-driven 格局 registry + Reference
page, the three engine correctness fixes (§4.3: 月柱/局数/空亡 boundary handling),
board memoization, .ics export, saved charts.
