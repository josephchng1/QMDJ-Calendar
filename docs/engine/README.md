# 时家奇门遁甲 Engine — 置闰法 (Zhi Run) + 拆补法

> Ported from `josephchng1/QMDJ` on 2026-10-18. The engine source now lives at
> `src/engine/`, and the validation suite at `packages/engine/tests/reference/`
> (`npm run test:engine`). File paths below refer to the original repo layout.

A self-contained TypeScript engine for the QMDJ app. No external dependencies. Computes astronomical solar terms, four pillars, 局数 by 置闰法 and 拆补法, and the full 转盘 nine-palace board (九星, 八门, 八神, 天盘/地盘干, 值符/值使, 空亡, 马星).

Runs on Node ≥ 22.7 (`--experimental-strip-types`), or compile with tsc for the browser/tRPC backend.

```
npm test          # runs the full validation suite (2098 checks)
npm run example   # prints today's 置闰 and 拆补 charts side by side
```

```ts
import { buildChart } from './src/index.ts';
const chart = buildChart({ y: 2026, m: 3, d: 17, hh: 10, mm: 6 });          // 置闰法 (default)
const chart2 = buildChart({ y: 2026, m: 3, d: 17, hh: 10, mm: 6, method: 'chaibu' });
// chart.summary  -> { fourPillars, dun, yuan, term, zhiFu, zhiShi }
// chart.board.palaces[0..8] -> { spirit, gate, stars, tianPanStems, diPanStem, isZhiFu, isHourKong, isMaXing, ... }
```

Options: `lateZiNextDay` (晚子时算次日, default true), `tzHours` (default 8 = Beijing/SGT), `spiritVariant` (勾陈/朱雀 naming instead of 白虎/玄武).

---

## 1. Solar terms (节气)

Apparent geocentric solar longitude is computed from the truncated VSOP87 Earth series of 寿星天文历 (transcribed from the MIT-licensed lunar-java `ShouXingUtil`, itself derived from sxwnl), plus abridged nutation, annual aberration, and a ΔT table whose modern segment is fitted to JPL DE440s. Term moments are solved by Newton iteration on the unwrapped longitude and converted TT → UT → UTC+8.

Verified against the 12 exact term timestamps shown in the reference-app screenshots (2019 and 2025–26): all within **1.2 minutes**, and against officially published values the engine is within seconds (e.g. 冬至 2024 computed 17:20:35 vs published 17:20; 夏至 2025 computed 10:42:17 vs published 10:42). The reference app itself runs ~1 minute early relative to published values.

Practical caveat: day-level decisions (符头 counting, month pillars) could only be affected if a term falls within ~1 minute of midnight — astronomically rare; no such case exists in the 1900–2100 test scan.

## 2. 置闰法 (traditional intercalation) — `getJuZhiRun`

Rules implemented per the classical canon (《遁甲符应经》,《河洛精蕴·奇门遁甲说》; principle **超不过九, 接不过五**):

1. Every 甲/己 day is a 符头 opening a 5-day 元: branch 子午卯酉 = 上元, 寅申巳亥 = 中元, 辰戌丑未 = 下元. The chunk stream runs continuously (上→中→下, term by term).
2. **Anchoring at the solstices**: for each 冬至/夏至, take the 上元符头 (甲子/己卯/甲午/己酉 day) on or before the solstice day. If it leads the solstice by ≤ 9 days (正授/超神), it opens 冬至/夏至上元. If the lead reaches 10+ days, **置闰**: the 大雪/芒种 三元 are repeated once and the solstice 上元 opens at the *next* 上元符头 (接气, lag ≤ 5 days).
3. Every half-year between consecutive anchors therefore contains exactly 36 chunks, or 39 when it ends with an intercalated 大雪/芒种 repetition.
4. 局数 from the classical table (冬至/惊蛰 1·7·4, 小寒 2·8·5, … 大雪 4·7·1), 阳遁 for the 冬至 half, 阴遁 for the 夏至 half.

The implementation is stateless (each solstice anchor is derived independently) and the consistency of the whole construction is machine-checked: for **every day from 1900 to 2100** the 符头's branch-derived 元 must equal its chunk position, every anchor must be an 上元符头, every half-year must be 36/39 chunks, and 超神 ≤ 9 / 接气 ≤ 5 must hold. 402 solstice anchors and 70 intercalations pass all invariants. Recent/upcoming intercalations found by the scan: 闰芒种 2016, 2019, 2022 · 闰大雪 2024, 2027, 2030.

## 3. 拆补法 — `getJuChaiBu`

Term in effect at the **exact input moment** (so the 局 switches mid-day at the term crossing — fixes bug #2 in the spec), 元 from the day's 符头 branch. 晚子时 keeps the original date's term while the day pillar advances (per spec).

## 4. Four pillars

* Day pillar anchored at 2000-01-01 = 戊午; verified across 2019–2026 reference charts.
* **Month pillar strictly by 节 boundaries** (立春, 惊蛰, …) evaluated at the exact moment — fixes bug #1 (Gregorian-month bug). 五虎遁 for the month stem, 五鼠遁 for the hour stem.
* Year pillar switches at 立春.
* 晚子时 (23:00–24:00): day + hour pillar advance to the next day (算次日, matching the app setting); configurable.
* 空亡: **hour-旬 void** for 时空 (fixes bug #3) and day-旬 void for 日空. 马星 from the hour branch trine.

## 5. 转盘 board

地盘 三奇六仪 (戊己庚辛壬癸丁丙乙, 阳顺阴逆 from the 局数 palace); 值符星 = star of the 旬首仪 palace (中五 → 天禽, riding 天芮 at 坤二); 值符 falls on the 时干's 地盘 palace (甲时 → 旬首仪; 中五 → 寄坤二 for the rotating layers). 值使门 = gate of the 值符 origin palace (中五 → 死门), advanced one palace per hour from the 旬首 through the Luoshu numbers 1–9 (including 中五). Stars/gates rotate in fixed ring order 蓬任冲辅英芮柱心 / 休生伤杜景死惊开; 八神 值符腾蛇太阴六合白虎玄武九地九天 clockwise in 阳遁, counter-clockwise in 阴遁. 天盘干 of each palace = 地盘干 of the arriving star's home palace (芮宫 carries 禽's stem as a second 天盘干).

## 6. Validation results

`tests/run.ts` — **3088 checks, all passing**:

* 12 solar-term timestamps (±2 min tolerance; actual max deviation 1.2 min vs the app, seconds vs published values).
* 3 day-pillar anchors (incl. 2000-01-01 = 戊午).
* **30 full reference charts** transcribed from the professional app screenshots (Sep 2024 … Jul 2026 plus one 2019 chart — 阳遁 & 阴遁, 值符/值使入中宫 cases, the 勾陈/朱雀 spirit variant, a 晚子时 chart): four pillars, 局数, 三元, 旬首/仪, 值符星+宫, 值使门+宫, 日空/时空, and **all eight outer palaces element-by-element** (神, 门, 星, 天盘干, 地盘干) — 100% match.
* **置闰-vs-拆补 divergence windows directly confirmed by screenshots** (batch 2): 2024-09-30/10-01 (app 阴6 = 置闰寒露, 拆补 would be 阴7 秋分), 2024-11-01…11-05 (app 阴9 = 置闰立冬, 拆补 阴8 霜降 — the 超神 build-up before 闰大雪 2024), 2025-04-06 (app 阳6 = 置闰春分下, 拆补 阳7 清明下). The engine's 置闰 output matches the app in every divergence window, proving the intercalation chain (超神 → 闰大雪 2024 → 接气 → 正授) end-to-end. Also covered: 2025-02-03 12:32 (before 立春 — year/month correctly still 甲辰/丁丑) and 2025-09-07 16:00 (chart on the exact 白露 day, 51 min before the term moment).
* 置闰 structural invariants for 1900–2100 (see §2) plus an every-single-day scan of the 置闰 assignment across the full 200 years.
* 拆补 intra-day switching at 小暑 2026-07-07 09:56 (阴9 → 阴8) and the spec's verified case 2026-07-06 23:00 壬午日庚子时 = 阴遁9局.
* 2019 接气 window: 2019-12-22 = 大雪下 阴1局, 冬至上 opens 甲午 12-23; the cycle's physical intercalation is 闰芒种 2019 (repeat 己卯 6/11 – 己丑 chunk, 夏至上 opens 甲午 6/26).

### Important note on method divergence

For 2026-07-06 23:00 (the spec's cross-validated case), 拆补 gives 阴遁9局 but a correct **置闰** engine gives 阴遁8局 (小暑上, 符头 己卯 7/4 already serving 小暑). The external references used for the spec's verification (almanacs, Yanxiang) are 拆补-based. The two methods agree most of the time and differ precisely in windows of accumulated 超神 or post-闰 接气 — that is the point of 置闰. All ten screenshots happen to fall in agreement windows, so they validate both paths; the divergence behaviour itself is covered by the classical invariants and the documented test cases. If you have any 置闰-mode reference charts from a divergence window (e.g. the morning of 2026-07-07, or December dates in 2024 between 大雪 and 冬至), add them to `tests/references.ts` for a direct check.

### One observed app difference (month pillar granularity)

IMG_7530 (2025-09-07 16:00) shows the reference app already displaying month 乙酉 although 白露's exact moment is 16:51 — the app switches the month pillar at **day** granularity. This engine switches at the **exact term moment** (the classical rule and the fix requested in the spec), so between 00:00 and 16:51 that day the engine gives 甲申. 局数 and the whole board are unaffected (置闰 is chunk-based); only the displayed month pillar differs inside such windows.

### Known limitations

* 格局 detection (青龙返首 etc.), 门迫/入墓/击刑 markers, and quality scoring are outside this engine's scope (the app layer already has them); the board output exposes everything they need.
* 阴盘 (Yin Pan) method and 飞盘 boards are not included.
* Lunar-calendar month/day display (农历) is not included (the moon series was deliberately omitted).
* Solar terms supported for 1900–2100 with tested accuracy; outside this range ΔT extrapolation reduces precision.

## File map

| File | Contents |
|---|---|
| `src/vsop87data.ts` | astronomical tables (XL0 / nutation / ΔT), transcription structurally checksummed |
| `src/astro.ts` | JD, ΔT, solar longitude, term solver, `solarTermsOfYear`, `termsBracketing` |
| `src/ganzhi.ts` | pillars, 旬首, 空亡, 马星, 晚子时 handling |
| `src/ju.ts` | `getJuZhiRun`, `getJuChaiBu`, ju tables, solstice anchors |
| `src/board.ts` | 转盘 board builder |
| `src/index.ts` | `buildChart` public API |
| `tests/references.ts` | 10 transcribed reference charts + 12 term timestamps |
| `tests/references2.ts` | 20 more reference charts (Sep 2024 – Sep 2025), incl. divergence windows |
| `tests/run.ts` | validation suite |
