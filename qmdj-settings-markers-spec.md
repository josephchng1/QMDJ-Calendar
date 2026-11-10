# Build spec — 设置 panel, 此刻 button, 时干 box, 迫/墓/刑 markers, 农历/干支 day cells, 五行 colour mode

**Requested by Joe 2026-11-10. Spec written by Fable 5.2; to be built by Opus.**
Status: **built 2026-11-10** (branch `settings-markers`). Everything here is presentation only. **Do not change the engine,
scoring, bands, calibration, or any URL parameter.**

Covers architecture items §10.5, §10.6 (markers only), §6.5 (lunar / 干支), §10.2,
plus two new items (此刻 button, 设置 panel).

Section numbers below (S1…S7) are this file's own. `§` numbers refer to
`qmdj-app-architecture.md`.

---

## Decisions already made (Joe, 2026-11-10) — do not re-ask

| Question | Answer |
|---|---|
| Which existing top-bar controls move into 设置? | **神·变体, 晚子时次日, 时区.** 置闰 / 拆补 and 复制链接 stay on the bar. |
| 农历 and 干支 in day cells | **Two separate switches.** A cell can show both, one, or neither. |
| Colour mode granularity | **One switch** for 神 / 门 / 星 together (replaces the per-class idea in §10.2). |
| 迫/墓/刑 markers | Shown by default, **can be hidden** in 设置. |
| 时干 box | Always on. No switch. |

Rules in S4 and S5 were checked against the reference-app screenshots in the
parent folder (`../IMG_0068.PNG`, `../IMG_8834.PNG`, `../IMG_8415.PNG`,
`../IMG_7482.PNG`). Expected results are listed in S8 — build to those.

---

## S1. Display settings (storage + context)

New file `src/settings.ts` (no JSX needed — React 19 renders a context directly as a provider).

```ts
export interface DisplaySettings {
  showMarks: boolean;                  // 迫 / 墓 / 刑 in palace cells   (S5)
  symbolColor: 'luck' | 'element';     // 神/门/星 colour mode          (S7)
  showLunar: boolean;                  // 农历 line in day cells         (S6)
  showDayGanzhi: boolean;              // 日干支 line in day cells       (S6)
}
export const DEFAULT_SETTINGS: DisplaySettings =
  { showMarks: true, symbolColor: 'luck', showLunar: true, showDayGanzhi: false };
```

- `parseSettings(raw: string | null): DisplaySettings` — pure. Returns
  `{ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }`; returns the defaults on `null`, bad
  JSON, or a non-object. Unknown keys are harmless; missing keys fall back to defaults
  (so adding a setting later needs no migration).
- `SettingsContext` + `useSettings()` returning `{ settings, set }`, where
  `set(patch: Partial<DisplaySettings>)` merges.
- `App` owns the state: initialise from `localStorage['qmdj.display.v1']` via
  `parseSettings`, write back on every change. Wrap **both** the read and the write
  in `try/catch` (private windows throw) — the app must work with storage unavailable.
- These four settings live in **localStorage only, never in the URL**. They are
  personal viewing preferences and must not travel with a shared link.
- Leaf components (`DayCell`, `PalaceCell`, `Legend`, `SettingsPanel`) read
  `useSettings()` directly. Do not thread these through `MonthGrid` / `PalaceGrid` /
  `DayDetailPanel` props.

## S2. 设置 panel and the slimmer top bar

**Top bar after the change** (`src/App.tsx:145-161`):

```
… view switcher …        [置闰] [拆补]   [设置]   [复制链接]
                         └ calendar view only (as today)
```

Removed from the bar and moved into the panel: 神·变体, 晚子时次日, the 时区 `<select>`.
Their state stays exactly where it is (`UiState.spiritVariant / lateZiNextDay / tz`,
URL params `sv` / `lz` / `tz`) — **only the controls move**. Deep links are unchanged.
The three moved controls are available in every view (the 时区 select already is).

**Panel** — new `src/components/SettingsPanel.tsx`, opened by the 设置 button.
Use the native popover (`popover="auto"` on the panel, `popoverTarget` on the button).
That gives click-outside and Esc dismissal for free; add no dialog library and no
hand-written outside-click handler. Leave it at the browser's default centred
position. Style with the existing `.panel gold-frame` classes and set
`color: var(--text)`, `border`, `padding` explicitly — the browser's default
popover styles (system colours, solid border) must not show through.

Contents, three groups, in this order:

| Group | Control | Type | Bound to |
|---|---|---|---|
| 排盘 | 神·变体（勾陈/朱雀） | checkbox | `ui.spiritVariant` |
| 排盘 | 晚子时算次日 | checkbox | `ui.lateZiNextDay` |
| 排盘 | 时区 | the existing `<select>` | `ui.tz` |
| 奇门盘 | 显示 迫·墓·刑 标记 | checkbox | `settings.showMarks` |
| 奇门盘 | 符号颜色： 吉凶 / 五行 | two `.seg` buttons, `data-active` + `aria-pressed` | `settings.symbolColor` |
| 日历 | 农历 | checkbox | `settings.showLunar` |
| 日历 | 日干支 | checkbox | `settings.showDayGanzhi` |

Checkboxes are native `<input type="checkbox">` inside a `<label>`. Changes apply
immediately; there is no save button.

`TZ_OFFSETS` / `tzLabel` are also used by `initialState()`. Either export them from
`App.tsx`, or pass the existing `<select>` element to the panel — take whichever is
the smaller diff.

## S3. 此刻 button (right-hand day panel)

Joe steps hours and days a long way from now and wants one click back.

- `DayDetailPanel` gets a new prop `onNow: () => void` and a button labelled
  **此刻** (title `回到今天 · 当前时辰`) in its header row
  (`src/components/DayDetailPanel.tsx:71-86`), right after the `日 ›` button.
- `App` passes `onNow={goToday}`. `goToday` (`src/App.tsx:112`) already does the
  whole job: selects today, sets the current 时辰, moves the calendar to this month,
  all in the selected 时区 and read fresh at click time. **Write no new date logic.**
- The active tab (时辰总览 / 奇门盘) does not change. On 奇门盘 the board becomes the
  current hour's board.
- The header row now holds six controls: add `flex-wrap` so it wraps on a phone.

## S4. Box around the 时干 on 天盘 and 地盘 (§10.5 — restores what §6.8(c) dropped)

- Target stem: `chart.pillars.hour.name[0]`. If that is `甲`, use
  `chart.board.xunShouYi` instead (甲 hides under its 旬首 仪).
  ⚠️ The 甲-hour rule is the standard convention but is **not** verified against a
  screenshot — no reference chart in the folder is a 甲 hour.
- Compute it once in `DayDetailPanel` (it has `chart`), pass as
  `hourStem` → `PalaceGrid` → `PalaceCell`.
- Box **every** occurrence: each entry of `tianPanStems` and the `diPanStem`, in all
  nine palaces — including the 地盘 stem of 中5宫. A palace holding two 天盘 stems
  (禽芮) boxes only the matching one.
- Style: `outline: 1px solid var(--text); outline-offset: 1px; border-radius: 2px`.
  `outline`, not `border`, so the stem does not move. The colour is deliberately the
  neutral text colour: gold and red already mean 大吉 and 凶 in this app (§6.7), so
  neither may be used for a marker that carries no quality.

## S5. 迫 / 墓 / 刑 markers (§10.6 — markers only, cell layout otherwise unchanged)

Shown only when `settings.showMarks` is true. Never in 中5宫.

| Marker | Rule | Sits | Colour |
|---|---|---|---|
| **迫** | gate 克 palace: `isMenPo(palace.gate, palace.palace)` | immediately left of the gate name | `--q-caution` |
| **刑** | a **天盘** stem `s` with `LIU_YI_JI_XING[s] === palace.palace` | left of that 天盘 stem | `--q-bad` |
| **墓** | a **天盘** stem `s` with `STEM_TOMB[s] === palace.palace`, **or** `SANQI_RUMU[s]?.includes(palace.palace)` | left of that 天盘 stem | `--text-dim` |

All three tables and `isMenPo` already exist in `src/calendar/data/structural.ts`.
Add one helper there and use it from `PalaceCell`:

```ts
/** Display marks for one 天盘 stem, as drawn on the board. Not a scoring predicate. */
export const stemMarks = (stem: string, palace: number): string =>
  (LIU_YI_JI_XING[stem] === palace ? '刑' : '') +
  (STEM_TOMB[stem] === palace || SANQI_RUMU[stem]?.includes(palace) ? '墓' : '');
```

Rules that are easy to get wrong:

1. **地盘 stems are never marked.** The reference app marks 天盘 only (IMG_0068:
   地盘 壬 in 巽4 has no mark; IMG_8834: 地盘 丙 in 乾6 and 地盘 癸 in 巽4 have none).
2. **Do not build the markers from `PalaceScore.warnings`, `isLiuYiJiXing` or
   `ev.jiXing`.** Those are scoring predicates with different semantics (see S9-A).
3. A stem can carry both (壬 in 巽4, 庚 in 艮8). Stack 刑 over 墓 in one narrow
   column to the left of the stem so two-stem palaces still fit.
4. Evaluate each 天盘 stem separately in two-stem (禽芮) palaces.
5. One deliberate difference from the reference app: 乙 on the 天盘 in **坤2** gets
   墓 here (Joe's ruling, registry §7.3: 乙 tombs in both 坤 and 乾). The reference app
   marks 乙 only in 乾6. This keeps the marker in step with the app's own 三奇入墓 veto.
   To match the reference app instead, drop the `SANQI_RUMU` clause.

Layout inside the existing cell (`src/components/PalaceCell.tsx`):

- Markers are `text-[9px] leading-none`, plain text, no border (the bordered chips in
  the top-right corner stay as they are: 符 / 使 / 空 / 马).
- **迫** is absolutely positioned (`position: relative` on the gate span, marker
  `absolute right-full`), so the gate name stays centred in the 神/门/星 stack.
- **刑 / 墓** are in normal flow before the stem. The 天盘 row is right-aligned, so it
  simply grows leftwards.
- Give each marker a `title`: `门迫（门克宫）`, `六仪击刑（天盘）`, `天盘干入墓`.
- Extract a small local `Stem` component in `PalaceCell.tsx` for "one stem: colour +
  optional box + optional marks"; it is used for 天盘, 地盘 and the centre cell.

`Legend.tsx`, group 标记: add 迫 / 墓 / 刑 in their colours (only while
`showMarks` is on) and a boxed sample labelled 时干.

## S6. 农历 and 日干支 in calendar day cells (§6.5)

Under the Gregorian day number in `DayCell`, up to two small lines
(`text-[10px] leading-tight`, `--text-dim`), each behind its own switch:

1. **农历** (`settings.showLunar`) — the lunar day name, e.g. `廿四`. On the first day
   of a lunar month show the month name instead, e.g. `六月`, `闰六月`, `正月`, in
   `--gold-dim` so month starts stand out.
2. **日干支** (`settings.showDayGanzhi`) — the day pillar, e.g. `癸未`.

The cell stays a plain date picker: no shade, no score, no badge (§6.5 still holds).
Make the cell a column; let its height grow (keep `minHeight: 44`). The `title`
becomes e.g. `7/8 · 农历五月廿四 · 癸未日`.

**Lunar date — use the platform calendar. Do not add a dependency and do not write
a lunar algorithm.** New file `src/calendar/lunar.ts`:

```ts
const FMT = new Intl.DateTimeFormat('zh-CN-u-ca-chinese',
  { month: 'long', day: 'numeric', timeZone: 'UTC' });   // build once, reuse

/** { month: '闰六月', day: '廿九', first: false } for a civil date, or null if unsupported. */
export function lunarDate(y: number, m: number, d: number)
```

- Feed it `new Date(Date.UTC(y, m - 1, d))` and read `formatToParts`: the `month` part
  is already a name (`五月`, `闰六月`, `正月`, `腊月`); the `day` part is a number string.
- Day number → name: 1–10 `初一…初十`, 11–19 `十一…十九`, 20 `二十`, 21–29 `廿一…廿九`, 30 `三十`.
- Month name fix-up to match the reference app's wording: `十一月 → 冬月`,
  `十二月 → 腊月` (some runtimes already return `腊月`; map both).
- If `FMT.resolvedOptions().calendar !== 'chinese'`, return `null` and render no
  lunar line. No other fallback.

**Day 干支 — reuse the engine helper**: `dayGanZhi(dayNumber(y, m, d)).name` from
`src/engine/ganzhi.ts`. It is already in the main bundle (via `direction.ts` →
`structural.ts`). It is the pillar of the civil date; the 晚子时 setting does not
apply to a day cell.

## S7. Colour 神 / 门 / 星 by 吉凶 or by 五行 (§10.2)

One setting, `settings.symbolColor`, for all three classes.

- `'luck'` (default) — today's behaviour, unchanged.
- `'element'` — colour by 五行 using the existing `ELEMENT_VAR` tokens (the same ones
  the stems use).

In `src/qmdata.ts`, give `gateColor`, `starColor`, `spiritColor` an optional second
argument `mode: 'luck' | 'element' = 'luck'`. Gates and stars already carry `element`
in `GATE_META` / `STAR_META`. Add the one missing table:

```ts
export const SPIRIT_ELEMENT: Record<string, Element> = {
  值符: 'wood', 腾蛇: 'fire', 太阴: 'metal', 六合: 'wood', 白虎: 'metal',
  玄武: 'water', 九地: 'earth', 九天: 'metal', 勾陈: 'earth', 朱雀: 'fire',
};
```

The first eight match the colours in the reference-app screenshots (值符 is drawn as
木 there). 勾陈 / 朱雀 do not appear in any screenshot; they use the standard
attribution. ⚠️ Joe to correct this table if he reads any of them differently.

`PalaceCell` is the only caller of the three colour functions (lines 44, 94, 97, 100) —
pass `settings.symbolColor` at each. Stems are always coloured by 五行; unchanged.

`Legend.tsx`: show the 符号 (上吉/吉/平/慎/凶) group only in `'luck'` mode. The 五行
group is already there and now explains the symbols too.

---

## S8. Tests and acceptance

No new dependencies; no component-test framework. Pure-function tests in vitest, then
a visual check against the reference charts.

**Unit tests**

| File | Assert |
|---|---|
| `src/calendar/lunar.test.ts` | 2026-07-08 → `五月` `廿四` · 2026-02-05 → `腊月` `十八` · 2025-12-25 → `冬月` `初六` · 2025-08-22 → `闰六月` `廿九` · 2026-02-17 → `正月` `初一`, `first: true` · 2025-07-25 → `闰六月`, `first: true`. (First four are read off the reference screenshots.) |
| same file | day pillar: 2026-07-08 `癸未` · 2025-12-25 `戊辰` · 2025-08-22 `癸亥` · 2026-02-05 `庚戌`. |
| `src/calendar/data/structural.test.ts` | `stemMarks('壬',4) === '刑墓'` · `('庚',8) === '刑墓'` · `('己',2) === '刑'` · `('戊',3) === '刑'` · `('辛',9) === '刑'` · `('乙',6) === '墓'` · `('癸',2) === '墓'` · `('己',8) === '墓'` · `('乙',2) === '墓'` · `('丁',6) === ''` · `('丙',4) === ''`. |
| same file | `isMenPo`: true for 伤门@2, 开门@3, 死门@1, 景门@6, 惊门@4; false for 杜门@7, 休门@2, 死门@3, 开门@9. |
| `src/settings.test.ts` | `parseSettings(null)`, `parseSettings('{bad')`, `parseSettings('[]')` → defaults; `parseSettings('{"showMarks":false}')` → defaults with `showMarks: false`. |
| `src/qmdata.test.ts` | `gateColor('开门')` unchanged (gold); `gateColor('开门','element') === 'var(--metal)'`; `starColor('天蓬','element') === 'var(--water)'`; `spiritColor('值符','element') === 'var(--wood)'`. |

**Visual check** — 置闰, UTC+8, 奇门盘 tab. Compare with the screenshot named.

| Open | Reference | 时干 box | 迫 | 刑 | 墓 |
|---|---|---|---|---|---|
| `?d=2026-07-08&h=9&tz=8` | IMG_0068 | 辛: 天盘 坎1, 地盘 中5 | 伤门 坤2 · 开门 震3 · 死门 坎1 · 景门 乾6 | none | 癸 坤2 · 己 艮8 · 乙 乾6 |
| `?d=2026-02-06&h=0&tz=8` (the 23:22 晚子时 of 02-05) | IMG_8834 | 戊: 天盘 震3, 地盘 艮8 | 惊门 巽4 | 壬 巽4 · 己 坤2 · 戊 震3 · 庚 艮8 | 壬 巽4 · 庚 艮8 · 乙 乾6 |
| `?d=2025-12-25&h=6&tz=8` | IMG_8415 | 戊: 天盘 艮8, 地盘 坎1 | none | 辛 离9 | 乙 坤2 (ours only — S5 rule 5) |
| `?d=2025-08-22&h=10&tz=8` | IMG_7482 (box only — that screenshot has markers hidden) | 壬: 天盘 离9, 地盘 巽4 | none | 戊 震3 · 癸 巽4 | 乙 坤2 (S5 rule 5) |

These four rows were produced by running the current engine with the S4/S5 rules
(2026-11-10), and rows 1–3 agree with the screenshots mark for mark, apart from the
one deliberate 乙-in-坤2 difference.

**Behaviour checklist**

- [ ] Top bar shows only: view switcher, 置闰/拆补 (calendar view), 设置, 复制链接.
- [ ] 设置 opens; closes on Esc and on click outside; every control works at once.
- [ ] 神·变体 / 晚子时次日 / 时区 still write `sv` / `lz` / `tz` to the URL; an old deep link opens the same chart as before.
- [ ] Reload: the four display settings are remembered. With storage blocked the app still works on defaults.
- [ ] 显示标记 off → no 迫/墓/刑 anywhere, legend entries gone; the 时干 box stays.
- [ ] 五行 mode → 神/门/星 recolour; palace tint and corner score do **not** change.
- [ ] 农历 / 日干支 switches each add or remove their own line; lunar month starts show the month name.
- [ ] From a far-away day and hour, on either tab: 此刻 lands on today, the current 时辰, this month, same tab.
- [ ] Phone width (375 px): header rows wrap, a two-stem palace with marks does not overflow its cell.
- [ ] `npm run typecheck`, `npm test`, `npm run build` all pass; golden and calibration tests untouched.

---

## S9. Flagged — not part of this build

**A. Scoring reads 六仪击刑 off the 地盘; the reference app marks it on the 天盘.**
**Resolved 2026-11-10 (Joe): made an option.** 设置 → 排盘 → 六仪击刑按 地盘 / 天盘
(`CalendarOptions.jiXingPlate`, URL `jx=tian`; default 地盘, so calibration is unchanged).
It changes scores, so it travels with the link like 神·变体. Original note:
`isLiuYiJiXing` (`structural.ts:69`) tests `p.diPanStem`. The 地盘 is fixed for a whole
局, so some palaces are vetoed for every hour of that 局 (阴3局: 坤2, 震3 and 离9 all at
once). After this build the board can show a palace blocked for 六仪击刑 with no 刑
marker (IMG_0068, 巽4), or a 刑 marker on a palace that is not vetoed. This spec does
**not** change scoring — it moves bands and the calibration gate, and needs Joe's
ruling on which plate the veto reads. Raise it; do not fix it here.

**B. Not built, by decision:** per-class colour modes; a switch for the 时干 box;
節气 or festival labels in day cells; remembering 置闰/拆补, 神·变体, 晚子时次日 or 时区
across visits (they stay URL-only, as today); the grey top-left stem and the
bottom-left 八神 label from the reference (§6.8, still awaiting Joe's definition).

## S10. Files touched

| File | Change |
|---|---|
| `src/settings.ts` | **new** — S1 |
| `src/components/SettingsPanel.tsx` | **new** — S2 |
| `src/calendar/lunar.ts` | **new** — S6 |
| `src/App.tsx` | settings state + provider; slim top bar; render panel; `onNow={goToday}` |
| `src/components/DayDetailPanel.tsx` | 此刻 button; compute and pass `hourStem`; header `flex-wrap` |
| `src/components/PalaceGrid.tsx` | pass `hourStem` through |
| `src/components/PalaceCell.tsx` | `Stem` sub-component: box + 刑/墓; 迫 on the gate; colour mode |
| `src/components/DayCell.tsx` | lunar and 干支 lines |
| `src/components/Legend.tsx` | 迫/墓/刑 + 时干 samples; hide 符号 group in 五行 mode |
| `src/qmdata.ts` | `SPIRIT_ELEMENT`; `mode` argument on three colour functions |
| `src/calendar/data/structural.ts` | `stemMarks` |
| tests | the five test files in S8 |
| `qmdj-app-architecture.md` | see S11 |

Suggested order: S1 → S2 → S7 → S4 + S5 → S6 → S3. After S1 the rest are independent.

## S11. Architecture-doc edits to make in the same change

- §6.1 component tree: `SettingsPage` → 设置 popover holding 排盘 + display options.
- §6.2: display settings are in `localStorage['qmdj.display.v1']`; chart options stay in the URL.
- §6.5: note the lunar line and the 干支 line are each behind a switch.
- §6.8(c): the 时干 box is **restored** (neutral outline, 天盘 and 地盘) — S4.
- §10.2, §10.5: mark built, point here. §10.6: markers built; the two ambiguous glyphs still open.
- Replace the "spec written, not built" pointer line under §10 with "built".
