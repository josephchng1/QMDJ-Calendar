# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — the consulting client.** A non-practitioner who receives a deep link
from the practitioner and opens it **alone**, on a phone, with no one there to
explain it. They are not learning 奇门遁甲; they want to know when to act and
why they should trust the answer. Every screen reachable from a shared link must
be self-explanatory to this person.

The practitioner (repo owner) selects the dates and generates the links, and so
also uses the calendar, patterns, and search views directly. The client is the
audience the interface must serve; the practitioner is the operator upstream of
the link.

## Product Purpose

A 时家奇门遁甲 (hour-based Qimen Dunjia) date-selection calendar: find good days
and 时辰 for a given 用事, and see the chart that justifies the rating. Success is
a client opening a link, understanding when to act, and having reason to trust it.

## Positioning

A Qimen chart is a pure deterministic function of `(instant, method, settings)`.
The entire app therefore computes **client-side in a Web Worker** — it works
offline, needs no server, and every view's full state lives in the URL, so any
day / hour / method / 用事 combination is a shareable link. It runs on a
**vendored, frozen** copy of the Zhirun engine (`src/engine/`, from
`josephchng1/QMDJ`), which is never edited here and is re-synced deliberately.

## Operating Context

- The practitioner picks a date/hour and sends the client a deep link
  (`?ym=…&d=…&h=…&view=…&mtd=…&sv=…&lz=…&act=…&fx=…`).
- The client opens that link **unattended**, most often on a phone, possibly in
  a place with poor connectivity. Offline capability is load-bearing, not a nicety.
- The app is also intended to be **hosted publicly** at a real URL, and runs
  as-is from the repo on StackBlitz.
- Upstream, the practitioner works in the search and patterns views to find
  candidate slots before sending anything.

## Capabilities and Constraints

**Confirmed functionality**

- **Month calendar** — each day shows a 12-segment bar (one per 时辰) plus a
  whole-day quality band.
- **Day panel** — 12 时辰 ratings with 五不遇时 / 时空 flags, and the full 奇门盘
  for any hour with ← → hour paging.
- **Patterns view** — a registry of 91 格局.
- **Search view** — recommended and by-formation modes over 30/60/90/180-day
  ranges, filtered by 用事, 主/客 role, required and avoided formations, minimum
  score, and a 五不遇时 allowance.
- **12 用事 presets** — 开业开张, 签约合作, 合夥谈判, 求财投资, 扩张远图, 竞争销售,
  出行执行, 上官赴任, 动土修造, 婚姻和合, 谋略布局, 考试文书.
- **Per-palace direction grading** against the selected 用事.
- **Method toggles** — 置闰法 (default) / 拆补法, 八神变体, 晚子时次日.

**Durable constraints**

- **Language: Chinese terms, English gloss.** Terms such as 值符, 五不遇时, 格局
  stay in Chinese and are never translated away; an English explanation sits
  alongside or on hover. This is what makes the interface legible to a
  non-practitioner without diluting the vocabulary.
- **Mobile-first.** The phone is the primary screen, in the field.
- **The engine is frozen.** `src/engine/` is vendored and must not be edited.
- **Scoring is provisional.** `src/calendar/scoring.ts` is a coarse v1 heuristic
  (conventional 门/星/神 auspiciousness + 五不遇时 + 时空), *not* authoritative
  格局 evaluation. It must always be presented as provisional, and it is the
  single swap point for the real registry-driven scoring.
- **URL state is the sharing contract.** Link parameter shape is load-bearing;
  changing it breaks links already in clients' hands.

## Evidence on Hand

- Specification and design docs in-repo: `README.md`,
  `qmdj-app-architecture.md`, `qmdj-formations-registry.md` (+ `-v2`),
  `qmdj-palace-direction-model.md` (+ `-v2`), `qmdj-date-search-plan.md`.
- `QM OCR.pdf` — source material.
- Reference Qimen charts in the parent folder, used to validate the calculation
  algorithm.
- Golden tests at `packages/engine/tests/golden`.
- **No testimonials, customers, user counts, pricing, accuracy benchmarks, or
  press exist.** Future work must not fabricate any of these.

## Product Principles

1. **The link must stand alone.** The client arrives with no explanation and no
   one to ask. Anything a shared URL can reach has to make sense unattended.
2. **Preserve the vocabulary, supply the meaning.** Chinese terms are never
   replaced by English; they are explained beside themselves.
3. **The recommendation leads; the 盘 is the proof.** The chart substantiates the
   answer for those who can read it — it is not the answer itself.
4. **Provisional means labelled.** Where the scoring is a heuristic, the
   interface says so. Confidence is never implied beyond what the engine earns.
5. **The phone is the real screen.** Desktop is the generous case, not the design case.

## Accessibility & Inclusion

No formal standard has been established for this project. The confirmed,
product-specific needs are: comprehension by a reader with **no** 奇门 training,
and legibility of dense CJK chart content **on a phone**, including for readers
who cannot rely on hover to reveal glosses.
