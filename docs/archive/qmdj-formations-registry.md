# 奇門遁甲 格局 Registry — Data & Rules Spec for Date/Time Selection
**Purpose:** a validated, source-cited registry of 吉格 (auspicious) and 凶格 (inauspicious) formations, plus the structural "harm" conditions, for the 擇日擇時 (date/time-selection) engine described in `qmdj-app-architecture.md §5`. Written to be dropped into `packages/engine/src/data/patterns.ts` (and companion tables) and evaluated by the declarative pattern evaluator.

**How to use this with Claude Code:** treat every `PatternRule` / table below as the single source of truth. The `when` clauses are machine-evaluable against the fields the engine already exposes (`palace.tianPanStems`, `palace.diPanStem`, `palace.door`, `palace.star`, `palace.spirit`, `chart.pillars.day/hour`, `palace.index`). Structural conditions (§7) are computed, not stem-pair lookups — implement each as its own predicate and back it with a boundary fixture per `§4.4` of the architecture doc.

---

## 0. Accuracy statement, scope & how to read the confidence flags

奇門遁甲 is a traditional Chinese metaphysical / divinatory system, not an empirically validated predictive science. Everything below is presented as **faithful to the QMDJ textual tradition and to multiple corroborating contemporary sources** — that is the sense in which it has been "validated." It is not a claim that these formations forecast real-world outcomes.

This spec targets **時家轉盤奇門 (hour-based, rotating-plate Qi Men)**, which is the dominant school and the one your app already uses (拆補/置閏/陰盤 all share the same formation logic; only board construction differs). Definitions were checked against Chinese primary/secondary sources and one English cross-check (full list in §11).

Each formation carries a confidence flag:

- **[CONSENSUS]** — same definition across every source checked. Safe to build as-is.
- **[VARIANT]** — sources genuinely disagree on the exact trigger; I give the most common version and name the alternative. **These are the ones for you (domain expert) to confirm against your own school before shipping** — same discipline as the "⚠️ Confirm before building" notes in your own backlog (§10.6).
- **[DERIVED]** — I computed the table myself from first principles (e.g. via 五鼠遁) because sources listed it with typos; the rule is deterministic so the derivation is trustworthy.

Where I was not confident enough to state a precise trigger (e.g. 天輔時, and the finer 三詐 sub-types), I have **left it out of the firm registry and listed it in §10** rather than fabricate a rule.

---

## 1. Encoding conventions

```ts
// Stems (天干). 甲 never appears on the plate — it is hidden (遁甲) and represented by its 儀.
type Stem = '乙'|'丙'|'丁'|'戊'|'己'|'庚'|'辛'|'壬'|'癸';
// The 六甲 → 六儀 substitution (遁甲):
//   甲子→戊  甲戌→己  甲申→庚  甲午→辛  甲辰→壬  甲寅→癸
type Jiaxun = '甲子'|'甲戌'|'甲申'|'甲午'|'甲辰'|'甲寅';

// Palaces — reference by Luoshu number for machine use. Element in parentheses.
//  1 坎(水) · 2 坤(土) · 3 震(木) · 4 巽(木) · 5 中(土) · 6 乾(金) · 7 兌(金) · 8 艮(土) · 9 離(火)
type PalaceIndex = 1|2|3|4|5|6|7|8|9;

type Door  = '休門'|'生門'|'傷門'|'杜門'|'景門'|'死門'|'驚門'|'開門';
type Star  = '天蓬'|'天芮'|'天沖'|'天輔'|'天禽'|'天心'|'天柱'|'天任'|'天英';
type Spirit= '值符'|'螣蛇'|'太陰'|'六合'|'白虎'|'玄武'|'九地'|'九天'; // see §3.3 note on 勾陳/朱雀

type Tier =
  | 'supreme-auspicious'   // 大吉
  | 'auspicious'           // 吉
  | 'minor-auspicious'     // 小吉
  | 'neutral'              // 平 / 中性
  | 'conditional'          // 門吉則吉、門凶則凶 (valence flips with the gate)
  | 'minor-inauspicious'   // 小凶
  | 'inauspicious'         // 凶
  | 'supreme-inauspicious';// 大凶

interface PatternRule {
  id: string;
  name: string;            // 中文
  nameEn: string;
  tier: Tier;
  scope: 'palace' | 'chart';
  confidence: 'consensus' | 'variant' | 'derived';
  when: WhenClause;        // interpreted by the evaluator; see each entry
  interpretation: string;  // plain-language meaning
  guidance: {
    favours: ApplicationTag[];  // event types this supports
    avoid:   ApplicationTag[];  // event types this warns against
  };
  notes?: string;          // school variance, caveats
  source: string;          // key(s) into §11
}

// Application tags used across the registry (your activity presets, §6.3 / §8):
type ApplicationTag =
  | 'launch'        // 開業/開張/發布 — opening, product/company launch
  | 'contract'      // 簽約/合作 — signing, agreements
  | 'partnership'   // 結盟/合夥/談判 — alliances, negotiation, JV
  | 'wealth'        // 求財/投資 — seeking money, investment
  | 'expansion'     // 擴張/遠圖 — scaling, entering new markets, big moves
  | 'competition'   // 競爭/銷售/投標 — sales, tenders, contests, litigation-offense
  | 'travel'        // 出行/搬遷 — travel, relocation, execution/movement
  | 'career'        // 求職/升遷/謁貴 — career, promotion, meeting VIPs
  | 'construction'  // 動土/修造/奠基 — building, foundations, long-term setup
  | 'romance'       // 婚姻/感情/調和 — marriage, reconciliation, PR/goodwill
  | 'secrecy'       // 隱蔽/佈局/謀略 — covert plans, strategy, positioning
  | 'study';        // 考試/文書 — exams, documents, writing
```

**Evaluator contract.** A `when` clause is an AND of the fields present. `tianPanStem`/`diPanStem` match a single palace's plates. Multi-symbol clauses (`door` + stems + `spirit`) all refer to the **same palace**. `scope:'chart'` rules read whole-chart context (pillars, voids) and are evaluated once per chart, not per palace.

---

## 2. Tier → score weights (config, tune freely)

Lives in `scoring.ts` per architecture §5. Starting weights (signed; summed per palace, then rolled up):

```ts
export const TIER_WEIGHTS: Record<Tier, number> = {
  'supreme-auspicious':  +100,
  'auspicious':           +60,
  'minor-auspicious':     +30,
  'neutral':                0,
  'conditional':            0,   // resolved by co-located gate quality at eval time
  'minor-inauspicious':   -30,
  'inauspicious':         -60,
  'supreme-inauspicious':-100,
};
```

**Severity tiers (per S0):**
- **Absolute veto** → `blocked=true`, cannot be rescued: **六儀擊刑** (<cite>"極凶，即使六儀為值符也不可用，一動必有災傷"</cite>).
- **Strong veto / nullifying** → `blocked=true` for selection purposes: **三奇入墓** (<cite>"百事不宜，謀事盡休…無力之象"</cite> — note it *nullifies* rather than harms: 吉的不吉，凶的不凶).
- **Strong default-exclude** (not absolute): **五不遇時** (<cite>"不一定都凶…最好避開為妥"</cite>). Hide from "good slots" but allow a strongly-formed slot to surface with a warning.

Model the first two as `blocked`; model 五不遇時 as a default search filter with a heavy penalty. (Source: S0 p129, p133.)

---

## 3. Intrinsic symbol tables (base valence before formations)

These are the well-established consensus classifications. Colour them per §10.2 of your backlog (auspiciousness mode vs 五行 mode).

### 3.1 八門 (Eight Gates) — element + base valence  [CONSENSUS]
```ts
export const GATES = {
  開門: { element:'金', quality:'auspicious',    uses:['launch','career','wealth','travel','expansion'] },
  休門: { element:'水', quality:'auspicious',    uses:['partnership','romance','career','travel'] }, // 謁貴/見貴人/休養
  生門: { element:'土', quality:'auspicious',    uses:['wealth','launch','construction','contract'] },
  傷門: { element:'木', quality:'inauspicious',  uses:['competition'] }, // 討債/捕獵/競技 offense only
  杜門: { element:'木', quality:'neutral',       uses:['secrecy'] },     // 隱藏/避難/技術
  景門: { element:'火', quality:'neutral',       uses:['study','competition'] }, // 文書/宣傳/blueprints
  死門: { element:'土', quality:'inauspicious',  uses:[] }, // 弔喪/斷事/刑戮
  驚門: { element:'金', quality:'inauspicious',  uses:['competition'] }, // 訴訟/口舌
} as const;
// 三吉門 = 開/休/生 ; 三凶門 = 死/驚/傷 ; 二平門 = 杜/景
```

### 3.2 九星 (Nine Stars) — element + base valence  [CONSENSUS on the 吉/凶 split; minor school variance on 天沖/天輔 ranking]
```ts
export const STARS = {
  天心: { element:'金', quality:'auspicious'    }, // 醫/貴/謀略 — 大吉
  天任: { element:'土', quality:'auspicious'    }, // 穩/財/田產
  天輔: { element:'木', quality:'auspicious'    }, // 文教/升學/君子 — 大吉 for study
  天禽: { element:'土', quality:'auspicious'    }, // 中宮/公正/中介
  天沖: { element:'木', quality:'minor-auspicious' }, // 武/勇/進取/復仇 — 小吉
  天蓬: { element:'水', quality:'inauspicious'  }, // 盜/賊/暗昧
  天芮: { element:'土', quality:'inauspicious'  }, // 病星 — most inauspicious; illness/errors
  天柱: { element:'金', quality:'inauspicious'  }, // 破壞/毀折/退守
  天英: { element:'火', quality:'inauspicious'  }, // 虛/血光/文書口舌 — 小凶
} as const;
```

### 3.3 八神 (Eight Gods) — base valence  [CONSENSUS on valence; VARIANT on naming]
```ts
export const SPIRITS = {
  值符: { quality:'auspicious',   theme:'貴人/權威/主事 — most auspicious' },
  太陰: { quality:'auspicious',   theme:'暗助/庇護/謀劃/隱密' },
  六合: { quality:'auspicious',   theme:'合作/婚姻/中介/和合' },
  九天: { quality:'auspicious',   theme:'高遠/擴張/宣揚/主動進取' },
  九地: { quality:'auspicious',   theme:'穩固/防守/田產/潛藏' },
  螣蛇: { quality:'inauspicious', theme:'虛驚/纏繞/怪異/反覆' },
  白虎: { quality:'inauspicious', theme:'傷災/爭鬥/疾病/道路' },
  玄武: { quality:'inauspicious', theme:'盜竊/欺瞞/暗昧/失脫' },
} as const;

// 八神 NAMING — CONFIRMED (Joe): default set uses 白虎 / 玄武; expose a user setting
// to relabel positions 5 & 6 as 勾陳 / 朱雀 (persisted per §6.2 / §10.2 settings work).
// The two positions are the SAME gods with alternate traditional names & themes:
export const SPIRIT_NAMING = {
  'baihu-xuanwu': {   // DEFAULT
    pos5: { name:'白虎', quality:'inauspicious', theme:'傷災/爭鬥/疾病/道路' },
    pos6: { name:'玄武', quality:'inauspicious', theme:'盜竊/欺瞞/暗昧/失脫' },
  },
  'gouchen-zhuque': { // ALTERNATE (user-selectable)
    pos5: { name:'勾陳', quality:'inauspicious', theme:'纏訟/田土是非/牽絆/遲滯' },
    pos6: { name:'朱雀', quality:'inauspicious', theme:'文書/口舌/官司/信息' },
  },
} as const;
// Setting key e.g. `spiritNaming: 'baihu-xuanwu' | 'gouchen-zhuque'`. Valence is unchanged
// either way (both inauspicious), so this is a LABEL/THEME swap only — no scoring impact.
// This is the resolution of your §10.6 bottom-left-label ambiguity. (Source: S13.)
```

---

## 4. 十干克應 — named stem-pair formations (天盤干 over 地盤干)

The engine's most important palace-level registry. `戊` doubles as hidden `甲` (the 值符's stem), so a `戊` on the plate can trigger both a `戊`-rule and, where a source names it via 甲, the same physical combination. Read all pairs as **天盤(over) / 地盤(under)**.

> Reading note: many of the 81 combinations are **conditional** (門吉則吉、門凶則凶) — they amplify whatever gate shares the palace rather than carrying a fixed sign. Those are tagged `tier:'conditional'`; resolve their sign from the co-located gate at eval time. Only the pairs with a **fixed** classical valence are given a firm auspicious/inauspicious tier below.

### 4.1 吉格 (auspicious stem-pairs)
```ts
export const PATTERNS_AUSPICIOUS: PatternRule[] = [
  {
    id:'qinglong-fanshou', name:'青龍返首', nameEn:'Dragon Turns Its Head',
    tier:'supreme-auspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'戊', diPanStem:'丙' }, // 戊(甲) over 丙
    interpretation:'The dragon (甲/戊 wood-authority) aids 丙 fire — a top-tier "everything goes your way" structure; strong for bold, far-reaching moves. S0 caveat: 吉事變凶 if 門克宮 (門迫) OR the palace is 震三宮 (子卯相刑).',
    guidance:{ favours:['launch','expansion','wealth','career','competition'], avoid:[] },
    notes:'Gate in evaluator: void/invert if 門迫 or palace=3震 (子卯刑); also generic 墓/擊/刑. Source: S0(p123).',
    source:'S0(p123),S3,S5',
  },
  {
    id:'feiniao-diexue', name:'飛鳥跌穴', nameEn:'Flying Bird Falls into the Nest',
    tier:'supreme-auspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'丙', diPanStem:'戊' }, // 丙 over 戊(甲)
    interpretation:'"A hundred battles, a hundred victories" — the bird finds its cave. Excellent for winning contests, closing, decisive execution. Same 迫/墓/擊/刑 caveat as 青龍返首.',
    guidance:{ favours:['competition','wealth','launch','partnership'], avoid:[] },
    source:'S5,S13,S27',
  },
  {
    id:'qinglong-yaoming', name:'青龍耀明', nameEn:'Dragon Shines Bright',
    tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'戊', diPanStem:'丁' },
    interpretation:'Favourable for meeting VIPs, seeking rank/reputation. Guard against gossip if the palace is in 墓/迫.',
    guidance:{ favours:['career','study','partnership'], avoid:[] },
    source:'S5,S8',
  },
  {
    id:'qiyi-xiangzuo', name:'奇儀相佐', nameEn:'Wonder & Instrument Assist',
    tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'乙', diPanStem:'丁' },
    interpretation:'乙+丁 — best for documents, examinations, applications; "a hundred things doable."',
    guidance:{ favours:['study','contract','career'], avoid:[] },
    source:'S5',
  },
];
```

### 4.2 凶格 (inauspicious stem-pairs)
```ts
export const PATTERNS_INAUSPICIOUS: PatternRule[] = [
  {
    id:'qinglong-taozou', name:'青龍逃走', nameEn:'Dragon Flees',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'乙', diPanStem:'辛' },
    interpretation:'Loss through subordinates/partners; theft, desertion, things slipping away. Classic marriage reading: one party wants out.',
    guidance:{ favours:[], avoid:['partnership','contract','wealth','launch'] },
    source:'S4,S5,S27',
  },
  {
    id:'baihu-changkuang', name:'白虎猖狂', nameEn:'White Tiger Runs Wild',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'辛', diPanStem:'乙' },
    interpretation:'Aggression, breakdown, road/injury risk, ruptured relations; the mirror of 青龍逃走.',
    guidance:{ favours:[], avoid:['partnership','contract','travel','launch'] },
    source:'S4,S27',
  },
  {
    id:'zhuque-toujiang', name:'朱雀投江', nameEn:'Vermilion Bird Dives into the River',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'丁', diPanStem:'癸' },
    interpretation:'Documents/messages go wrong; disputes, retractions, sunk communications, despondency.',
    guidance:{ favours:[], avoid:['contract','study','partnership'] },
    source:'S4,S27',
  },
  {
    id:'tengshe-yaojiao', name:'螣蛇夭矯', nameEn:'Flying Snake Writhes',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'癸', diPanStem:'丁' },
    interpretation:'Entanglement, anxiety, strange reversals, deception around agreements.',
    guidance:{ favours:[], avoid:['contract','partnership','wealth'] },
    source:'S4,S27',
  },
  {
    id:'taibai-ruying', name:'太白入熒 (白入熒)', nameEn:'Venus into Mars',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'庚', diPanStem:'丙' }, // 庚加丙
    interpretation:'庚 over 丙 — S0: MORE 凶 than the reverse. 占賊賊必來，須防偷營，以固守為吉 — expect an incoming raid; defend/hold. Favours the mover (客) against a holder.',
    guidance:{ favours:['competition'], avoid:['wealth','launch','partnership'] },
    notes:'比熒入白更凶. 固守為吉 (defence favoured). Source: S0(p127).',
    source:'S0(p127)',
  },
  {
    id:'huoru-jinxiang', name:'熒入太白 / 火入金鄉', nameEn:'Fire Enters Metal',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'丙', diPanStem:'庚' }, // 丙加庚
    interpretation:'丙 over 庚 — 火入金鄉「賊即去」: the raider departs; less severe than 太白入熒. Still a loss/backfire for the initiator, but the threat leaves rather than arrives.',
    guidance:{ favours:[], avoid:['wealth','launch','partnership'] },
    source:'S0(p127)',
  },
  {
    id:'geng-da-ge', name:'大格', nameEn:'Great Obstruction',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'庚', diPanStem:'癸' },
    interpretation:'庚+癸 — roads blocked, matters stall, no reply, people fail to arrive. One of the "庚 formations" family (庚 is 阻隔/道路/is the great obstructor).',
    guidance:{ favours:[], avoid:['travel','launch','partnership','contract'] },
    source:'S27',
  },
  {
    id:'geng-xing-ge', name:'刑格', nameEn:'Punishment Obstruction',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'庚', diPanStem:'己' },
    interpretation:'庚+己 — friction, penalties, legal snags.',
    guidance:{ favours:[], avoid:['contract','partnership','launch'] },
    source:'S27',
  },
  {
    id:'geng-xiao-ge', name:'小格', nameEn:'Lesser Obstruction',
    tier:'minor-inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'庚', diPanStem:'壬' },
    interpretation:'庚+壬 — smaller-scale blockage and delay.',
    guidance:{ favours:[], avoid:['travel','launch'] },
    source:'S27',
  },
  {
    id:'zhange-taibai-tonggong', name:'戰格 / 太白同宮', nameEn:'Battle Formation',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'庚', diPanStem:'庚' },
    interpretation:'庚+庚 — direct conflict, confrontation, values in collision.',
    guidance:{ favours:[], avoid:['partnership','contract','launch'] },
    source:'S27',
  },
  {
    id:'tianwang-sizhang', name:'天網四張', nameEn:'Heaven Net Spread Fourfold',
    tier:'supreme-inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'癸', diPanStem:'癸' },
    interpretation:'癸+癸 — everything netted/trapped; do not act. S0 confirms ONLY 癸+癸 qualifies. The "net high/low" escapability rule is disputed across texts (see note after §4.2) — do not encode it as hard logic.',
    guidance:{ favours:[], avoid:['launch','travel','contract','partnership','competition'] },
    source:'S0(p132),S25',
  },
  {
    id:'wangdai-tianlao', name:'網蓋天牢', nameEn:'Net Covers the Heavenly Prison',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'癸', diPanStem:'辛' },
    interpretation:'癸+辛 — litigation lost, confinement, entrapment; especially bad for disputes.',
    guidance:{ favours:[], avoid:['contract','partnership','competition'] },
    source:'S6',
  },
  {
    id:'riqi-rumu', name:'日奇入墓 (乙+己)', nameEn:'Day-Wonder Enters Tomb',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'乙', diPanStem:'己' },
    interpretation:'乙 over 己 — prospects unclear, buried potential; with a bad gate the matter is definitely bad. (Distinct from the palace-based 三奇入墓 in §7.3.)',
    guidance:{ favours:[], avoid:['launch','career','partnership'] },
    source:'S5',
  },
  {
    id:'riqi-beixing', name:'日奇被刑 (乙+庚)', nameEn:'Day-Wonder Punished',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'乙', diPanStem:'庚' },
    interpretation:'乙 over 庚 — lawsuits, financial loss, partners harbouring private agendas. NB: with a 吉門 present this can instead read as 奇儀相合/和解 (§6 qiyi-xianghe) — gate the sign on 吉門 presence.',
    guidance:{ favours:[], avoid:['partnership','contract','wealth'] },
    source:'S5,S0(p126)',
  },
  {
    id:'hege-geng-yi', name:'合格 (庚+乙)', nameEn:'Binding (part of 奇格)',
    tier:'conditional', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'庚', diPanStem:'乙' }, // 庚加乙, 乙庚合
    interpretation:'庚+乙 = 合格 (乙庚合). Part of the 奇格 (庚加三奇) family. 出行用兵 → 凶; but the 合 can mean binding/agreement WITH a 吉門. Context-dependent.',
    guidance:{ favours:[], avoid:['travel','competition'] },
    source:'S0(p128)',
  },
  {
    id:'poge-geng-ding', name:'破格 (庚+丁)', nameEn:'Rupture (part of 奇格)',
    tier:'inauspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'庚', diPanStem:'丁' }, // 庚加丁, 丁火克庚
    interpretation:'庚+丁 = 破格 (丁火克庚金). Rupture, breakage; 出行用兵大凶.',
    guidance:{ favours:[], avoid:['travel','launch','competition','partnership'] },
    source:'S0(p128)',
  },
  // NB: 庚+丙 (part of 奇格, "賊格") = 太白入熒 — already covered above as taibai-ruying.
];
```
> **奇格 note (S0 p128):** 庚 加 三奇 = 奇格 — 庚+乙 (合格), 庚+丙 (賊格 = 太白入熒), 庚+丁 (破格). All 出行用兵均大凶.

**天網四張 correction (S0 p132):** the source argues forcefully that **only 癸+癸** is 天網四張 (not "any 癸"), which matches this registry. It also flags that **網高/網低 is genuinely disputed** — one view: palaces 1–4 "low, escapable," 6–9 "high, trapped"; the opposite view: 1–4 "hard to pass," 6–9 "passable." <cite>孰是孰非，尚待實踐驗證</cite>. So do **not** encode a hard high/low rule; treat 癸+癸 as uniformly supreme-inauspicious and, if you want, expose the palace number for the user to judge.

### 4.3 庚 "obstruction" family — computed variants  [CONSENSUS on the family, VARIANT on which are foldable to fixed pairs]
Beyond the fixed `庚+癸/己/壬/庚` above, several 庚 格 depend on **which pillar's stem** 庚 sits over, so they are chart-context rules, not static pairs:

```ts
// Evaluate against chart.pillars. 庚 = the great obstructor (阻格/道路).
export const GENG_OBSTRUCTION_RULES = [
  { id:'sui-ge',   name:'歲格', when:'tianPan 庚 over 地盤 = 年干', tier:'inauspicious' },
  { id:'yue-ge',   name:'月格', when:'tianPan 庚 over 地盤 = 月干', tier:'inauspicious' },
  { id:'ri-ge',    name:'日格 / 伏干格', when:'tianPan 庚 over 地盤 = 日干', tier:'inauspicious',
    note:'日干臨庚 conversely = 飛干格' },
  { id:'shi-ge',   name:'時格', when:'tianPan 庚 over 地盤 = 時干', tier:'inauspicious' },
  { id:'fugong-ge',name:'伏宮格', when:'tianPan 庚 over 地盤 = 值符本儀 (旬首)', tier:'inauspicious' },
  { id:'feigong-ge',name:'飛宮格', when:'值符(甲/戊) over 地盤 庚', tier:'inauspicious',
    note:'吉事不成，凶事更凶' },
] as const;
```
All are "obstruction/blockage" — treat as `avoid:['launch','travel','contract','partnership']`. (Source: S27; S2 for 天乙伏宮.)

### 4.4 Supplementary 癸-combination reference (華蓋 group)  [reference — S0(p132)]
S0 enumerates the full 癸 row/column while disambiguating 天網四張. Most are niche/inauspicious "華蓋" themes; included as reference for palace pop-ups and toward the eventual full table. Not all need scoring weight — tag the clearly-valenced ones, leave the rest `neutral` until you decide.

```ts
// 天盤癸 + 地盤X:
export const GUI_OVER = {
  戊:'天乙會合', 乙:'華蓋星', 丁:'螣蛇夭矯'/*S0 p132 prints 丙; corrected to 丁 per its own p127 def*/,
  己:'華蓋地戶', 庚:'太白入網', 辛:'網蓋天牢', 壬:'復見螣蛇', 癸:'天網四張',
};
// 天盤X + 地盤癸:
export const OVER_GUI = {
  戊:'青龍華蓋', 乙:'華蓋逢星', 丙:'華蓋悖師', 丁:'朱雀投江', 己:'地刑玄武',
  庚:'大格', 辛:'天牢華蓋', 壬:'幼女奸淫',
};
// ⚠️ S0 p132 has a likely 丙/丁 typo in the 癸+丙/癸+丁 line; its own p127 derivation makes
// 螣蛇夭矯 = 癸+丁 (阴水克阴火). This registry uses 癸+丁 (see §4.1). Confirm if transcribing further.
```

---

## 5. 九遁 — the complete "Nine Concealments"  [CONFIRMED — 神奇之门 / S0]

All nine now carry authoritative definitions from the uploaded 《神奇之门》 (张志春). The three primaries (天/地/人遁) are the highest auspicious structures; 神/鬼遁 and the four 乙-奇 concealments (风/云/龙/虎) are specialised. `蔽` = "cover/shielding," the shared idea: a wonder+gate(+deity/plate) that hides your action from harm.

```ts
export const PATTERNS_CONCEALMENT: PatternRule[] = [
  {
    id:'tian-dun', name:'天遁', nameEn:'Heaven Concealment',
    tier:'supreme-auspicious', scope:'palace', confidence:'consensus',
    when:{ door:'生門', tianPanStem:'丙', diPanStem:'丁' }, // 生門 + 丙(天) + 丁(地)
    interpretation:'月精之蔽. 二奇并生門, 二火生艮土 — obstacles dissolve, 百事生旺. Prime for launches, advancement, seeking office, trade, marriage.',
    guidance:{ favours:['launch','career','wealth','partnership','expansion'], avoid:[] },
    source:'S0(p123),S31,S35',
  },
  {
    id:'di-dun', name:'地遁', nameEn:'Earth Concealment',
    tier:'supreme-auspicious', scope:'palace', confidence:'consensus',
    when:{ door:'開門', tianPanStem:'乙', diPanStem:'己' }, // 開門 + 乙(天) + 己(地, 地戶)
    interpretation:'日精之蔽 (己=地戶, 開門得日精). Cover for hidden/foundational work — positioning, groundwork, ambush, construction.',
    guidance:{ favours:['construction','secrecy','launch','wealth'], avoid:[] },
    source:'S0(p123),S31,S35',
  },
  {
    id:'ren-dun', name:'人遁', nameEn:'Human Concealment',
    tier:'supreme-auspicious', scope:'palace', confidence:'consensus',
    when:{ door:'休門', tianPanStem:'丁', spirit:'太陰' }, // 休門 + 丁(天) + 太陰
    interpretation:'星精之蔽. Best for 探密/伏藏/和談/求賢/結婚/交易 — money, reconciliation, marriage, negotiation, recruiting.',
    guidance:{ favours:['wealth','partnership','romance','career','secrecy'], avoid:[] },
    source:'S0(p123),S26,S35',
  },
  {
    id:'shen-dun', name:'神遁', nameEn:'Spirit Concealment',
    tier:'auspicious', scope:'palace', confidence:'consensus', // corrected via S0
    when:{ door:'生門', tianPanStem:'丙', spirit:'九天' }, // 生門 + 丙(天) + 九天
    interpretation:'宜攻虛/開路/塞河/造像/教化 — bold, high-visibility advance; publicity, opening new ground.',
    guidance:{ favours:['expansion','launch','career'], avoid:[] },
    source:'S0(p123)',
  },
  {
    id:'gui-dun', name:'鬼遁', nameEn:'Ghost Concealment',
    tier:'auspicious', scope:'palace', confidence:'consensus', // CORRECTED via S0: 杜門 not 生門
    when:{ any:[ {door:'杜門', tianPanStem:'丁', spirit:'九地'},
                {door:'開門', tianPanStem:'丁', spirit:'九地'} ] },
    interpretation:'宜偷營劫寨/設偽伏虛 — covert ops, moving unseen, feints. (Earlier draft said 生門 — that was wrong; S0 is 杜門, or 開門, with 丁 + 九地.)',
    guidance:{ favours:['secrecy','competition'], avoid:[] },
    source:'S0(p123-124)',
  },
  // — Four 乙-奇 concealments: 乙(天) + a 三吉門 + a specific plate/palace. Martial/utility framings. —
  {
    id:'feng-dun', name:'風遁', nameEn:'Wind Concealment',
    tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'乙', door:['開門','休門','生門'], palaceIndex:4 }, // 乙 + 吉門 + 巽4宮
    interpretation:'巽木主風 + 乙奇 + 吉門. Traditionally for wind-aided moves; broadly a 乙-奇+吉門 auspicious utility slot.',
    guidance:{ favours:['travel','competition','launch'], avoid:[] },
    source:'S0(p123)',
  },
  {
    id:'yun-dun', name:'雲遁', nameEn:'Cloud Concealment',
    tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'乙', door:['開門','休門','生門'], diPanStem:'辛' }, // 乙 + 吉門 + 地盤辛
    interpretation:'雲精之蔽. 宜求雨/立營寨/造軍械 — concealment via "cloud cover"; setup and provisioning.',
    guidance:{ favours:['construction','secrecy'], avoid:[] },
    source:'S0(p123)',
  },
  {
    id:'long-dun', name:'龍遁', nameEn:'Dragon Concealment',
    tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'乙', door:['開門','休門','生門'], any:[{palaceIndex:1},{diPanStem:'癸'}] }, // 乙 + 吉門 + 坎1宮 或 癸
    interpretation:'水中有龍. 宜掩捕/水戰/修橋/穿井 — water-related works, ambush by water.',
    guidance:{ favours:['construction','competition'], avoid:[] },
    source:'S0(p123)',
  },
  {
    id:'hu-dun', name:'虎遁', nameEn:'Tiger Concealment',
    tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ any:[ {tianPanStem:'乙', door:['休門','生門'], diPanStem:'辛', palaceIndex:8}, // 乙+休/生+辛臨艮8(寅虎)
                {tianPanStem:'庚', door:'開門', palaceIndex:7} ] },                      // 甲(庚)+開門臨兌7(庚辛金=白虎)
    interpretation:'宜安營扎寨/設隱埋伏/修築建造 — fortifying, laying ambush, building.',
    guidance:{ favours:['construction','secrecy'], avoid:[] },
    source:'S0(p123)',
  },
];
```
**Note:** 风/云/龙/虎遁 and their palace/plate conditions are niche for a business/launch calendar. Keep them in the registry for completeness (they'll light up rarely), but they don't need their own presets in §8.

---

## 6. 三奇 auspicious structures  [mostly CONFIRMED — 神奇之门 / S0]

The uploaded source resolves nearly all of these. Note two *distinct* "wonder in a strong palace" formations that are easy to conflate — 三奇升殿 (帝旺/長生 palace) and 奇游祿位 (臨官/祿 palace) — with different palace maps.

```ts
export const PATTERNS_SANQI: PatternRule[] = [
  {
    id:'sanqi-shengdian', name:'三奇貴人升殿', nameEn:'Wonder Ascends the Throne',
    tier:'auspicious', scope:'palace', confidence:'consensus', // CONFIRMED via S0(p125)
    when:{ sanqiInPalace:{ 乙:3, 丙:9, 丁:7 } }, // 乙→3震(乙卯), 丙→9離(丙午), 丁→7兌(丁酉長生)
    interpretation:'三奇貴人升殿 — 乙震/丙離/丁兌 (帝旺 or 長生 seat). 貴人升正殿, 百事可為.',
    guidance:{ favours:['launch','career','wealth','study'], avoid:[] },
    source:'S0(p125)',
  },
  {
    id:'qiyou-luwei', name:'奇游祿位', nameEn:'Wonder Roams to Its Salary Seat',
    tier:'auspicious', scope:'palace', confidence:'consensus', // NEW via S0(p126)
    when:{ sanqiInPalace:{ 乙:3, 丙:4, 丁:9 }, alsoDoor:['開門','休門','生門'] }, // 臨官/祿 + 三吉門
    interpretation:'乙到震(卯祿)/丙到巽(巳祿)/丁到離(午祿) = 本祿之位; with a 三吉門, 宜上官赴任/求財祈福. NOTE the palace map differs from 升殿 (丙→4 not 9, 丁→9 not 7).',
    guidance:{ favours:['career','wealth','launch'], avoid:[] },
    source:'S0(p126)',
  },
  {
    id:'yunü-shoumen', name:'玉女守門', nameEn:'Jade Maiden Guards the Gate',
    tier:'auspicious', scope:'palace', confidence:'consensus', // CONFIRMED via S0(p124)
    when:{ diPanStem:'丁', isZhiShiGate:true }, // 值使門所落之宮 遇 地盤丁奇 (丁 = 玉女)
    interpretation:'値使門\'s palace meets 地盤丁奇 (丁 is the "jade maiden"). 利宴會喜樂/婚姻 — goodwill, romance, celebrations, requests, mediation, PR.',
    guidance:{ favours:['romance','partnership','career','contract'], avoid:[] },
    notes:'CORRECTED via S0: it is 地盤丁 (diPan), not 天盤丁. Your earlier "丁+值使門" ruling stands; the plate is the 地盤. Per-day-stem 玉女 reading dropped. Engine already resolves the 值使門 palace.',
    source:'S0(p124)',
  },
  {
    id:'sanqi-deshi', name:'三奇得使', nameEn:'Wonder Obtains Its Envoy',
    tier:'auspicious', scope:'palace', confidence:'consensus', // UPDATED to S0 (张志春) definition
    when:{ anyStem:['乙','丙','丁'], isZhiShiGate:true }, // a 奇 in the SAME palace as the 值使門
    interpretation:'A 三奇 sharing the palace with the 值使門 ("obtains its envoy"). 得使可以用事. Per 张志春, this even rescues the otherwise-凶 奇⇢儀 pairings (乙+己/乙+辛/丙+庚/丁+癸): if the 值使門 is present, do not read them as 凶.',
    guidance:{ favours:['launch','career','partnership','wealth','contract'], avoid:[] },
    notes:'⚠️ REVISED. Your earlier ruling was "開/休/生門遇奇" (奇+三吉門). The uploaded S0 (张志春) defines 三奇得使 strictly as 奇+値使門 — the "使" IS the 値使門. I have set the rule to the source. Your "奇+三吉門" concept is real but is the *base filter* (see §8, and S0 p125 "宜用開/休/生三吉門…若得三奇更好") — I keep it there, not as 三奇得使. If you WANT the app to label 奇+任一吉門 as "三奇得使" for user-friendliness, flip this `when` back to `door:[開/休/生]`; just know it then diverges from 张志春. Your call — one-line change.',
    source:'S0(p124)',
  },
  // 三詐 — CONFIRMED (Joe). General form = 三吉門 + 三奇 + one of {太陰/九地/六合};
  // the sub-type is named by WHICH 吉神 is present. All: strategy/tactics/"winning by wits".
  {
    id:'san-zha-zhen', name:'真詐', nameEn:'True Deceit',
    tier:'auspicious', scope:'palace', confidence:'consensus', // CONFIRMED — Joe
    when:{ door:['開門','休門','生門'], anyStem:['乙','丙','丁'], spirit:'太陰' },
    interpretation:'三吉門 + 三奇 + 太陰. 太陰 = concealment/protection → best for covert planning, quiet positioning, protected moves.',
    guidance:{ favours:['secrecy','partnership','competition'], avoid:[] },
    source:'Joe (ruling); cf. S4,S36',
  },
  {
    id:'san-zha-zhong', name:'重詐', nameEn:'Heavy Deceit',
    tier:'auspicious', scope:'palace', confidence:'consensus', // CONFIRMED — Joe
    when:{ door:['開門','休門','生門'], anyStem:['乙','丙','丁'], spirit:'九地' },
    interpretation:'三吉門 + 三奇 + 九地. 九地 = stable/defensive/hidden → ambush, defensive positioning, groundwork that must hold.',
    guidance:{ favours:['secrecy','construction','competition'], avoid:[] },
    source:'Joe (ruling); cf. S4,S36',
  },
  {
    id:'san-zha-xiu', name:'休詐', nameEn:'Rest Deceit',
    tier:'auspicious', scope:'palace', confidence:'consensus', // CONFIRMED — Joe
    when:{ door:['開門','休門','生門'], anyStem:['乙','丙','丁'], spirit:'六合' },
    interpretation:'三吉門 + 三奇 + 六合. 六合 = harmony/union/intermediary → negotiation, alliances, mediation, deals via a go-between.',
    guidance:{ favours:['partnership','contract','romance'], avoid:[] },
    source:'Joe (ruling); cf. S0(p125),S4',
  },
  {
    id:'sanqi-zhiling', name:'三奇之靈', nameEn:'Numinous Wonder',
    tier:'auspicious', scope:'palace', confidence:'consensus', // NEW via S0(p126)
    when:{ anyStem:['乙','丙','丁'], door:['開門','休門','生門'], spirit:['太陰','六合','九地','九天'] },
    interpretation:'一奇 + 一三吉門 + 一四吉神(太陰/六合/九地/九天) all in one palace = 吉道清靈, 用事俱吉. The umbrella super-combo (三詐 is its 太陰/六合/九地 subset; this also admits 九天).',
    guidance:{ favours:['launch','career','wealth','partnership','expansion'], avoid:[] },
    notes:'De-dupe with 三詐 in scoring: if a 三詐 sub-type already matched, this is the same palace — count the bonus once, prefer the more specific 三詐 label in the pop-up.',
    source:'S0(p126)',
  },
  {
    id:'huanyi', name:'歡怡', nameEn:'Joyful Harmony',
    tier:'auspicious', scope:'palace', confidence:'consensus', // NEW via S0(p126)
    when:{ anyStem:['乙','丙','丁'], spirit:'值符' }, // 三奇 臨 值符之宮
    interpretation:'A 三奇 in the 值符 palace. 凡事謀皆有利, 撫恤將士, 眾情悅服 — morale, rallying people, winning goodwill of a team.',
    guidance:{ favours:['partnership','career','launch'], avoid:[] },
    source:'S0(p126)',
  },
  {
    id:'qiyi-xianghe', name:'奇儀相合', nameEn:'Stems in Union',
    tier:'conditional', scope:'palace', confidence:'consensus', // NEW via S0(p126); needs 吉門
    when:{ stemPairIsHe:true, alsoDoor:['開門','休門','生門'] }, // 乙庚/丙辛/丁壬(奇合) 或 戊癸/甲己(儀合) + 吉門
    interpretation:'天/地 stems form a 合 pair — 乙庚·丙辛·丁壬 (奇合) or 戊癸·甲己 (儀合) — WITH a 吉門: 主和解/了結/平局/平分. Reconciliation, settlement, splitting the difference, closing out.',
    guidance:{ favours:['partnership','contract','romance'], avoid:[] },
    notes:'⚠️ Interaction: 乙+庚 is ALSO 日奇被刑 (§4.2, 凶). Resolution per S0: WITH a 吉門 present, read the 合 (和解) meaning; without a 吉門, the 被刑 (凶) reading dominates. Evaluate gate presence before assigning sign.',
    source:'S0(p126)',
  },
  {
    id:'tianxian-shige', name:'天顯時格', nameEn:'Heaven-Revealed Hour (a.k.a. 天輔大吉時)',
    tier:'auspicious', scope:'chart', confidence:'consensus', // NEW via S0(p125) — resolves the old 天輔時 gap
    when:{ hourStemIs:'甲' }, // the hour pillar\'s stem is 甲 (旬首/六甲大將透出); equivalently 時干合日干
    interpretation:'When the hour pillar is a 甲-hour (甲子/甲戌/甲申/甲午/甲辰/甲寅) the 值符 六甲 "emerges." Although the chart is technically 伏吟, it is NOT 凶 — it turns auspicious. 宜行兵/上官/參謁/求財/遠行; 有罪者逢赦. This is the standard 伏吟 exception (§7.6).',
    guidance:{ favours:['career','wealth','travel','launch','partnership'], avoid:[] },
    notes:'This is the 天輔時 I could not source before — now confirmed. scope:chart (reads day+hour pillars). Concretely: 甲己日→甲子/甲戌時, 乙庚日→甲申時, 丙辛日→甲午時, 丁壬日→甲辰時, 戊癸日→甲寅時. When it fires, SUPPRESS the 伏吟 penalty for that slot.',
    source:'S0(p125,p131)',
  },
];
```

### 6.1 五假 (Five Falsehoods) — 凶門 borrowed for special purposes  [NEW via S0(p125-126)]
`假` = borrowing a gate's raw force for a narrow purpose; auspicious **only** for that purpose, and **五假忌迫墓** (void if the palace is in 迫 or 墓). These use the *inauspicious* gates deliberately — niche for a business calendar, but included for completeness.

```ts
export const PATTERNS_WUJIA: PatternRule[] = [
  { id:'tian-jia', name:'天假', nameEn:'Heaven False', tier:'conditional', scope:'palace', confidence:'consensus',
    when:{ door:'景門', anyStem:['乙','丙','丁'], spirit:'九天' },
    interpretation:'景門+三奇+九天. 宜爭戰訴訟/見貴求官/上書獻策/揚兵號令/申明盟約 — bold proclamations, litigation offense, seeking office.',
    guidance:{ favours:['competition','career','contract'], avoid:[] }, source:'S0(p125)' },
  { id:'di-jia', name:'地假', nameEn:'Earth False', tier:'conditional', scope:'palace', confidence:'consensus',
    when:{ door:'杜門', anyStem:['丁','己','癸'], spirit:['九地','太陰','六合'] },
    interpretation:'杜門+丁/己/癸+九地/太陰/六合. 宜潛藏埋伏/逃亡躲災/謀探私事 — hiding, evasion, private probing.',
    guidance:{ favours:['secrecy'], avoid:[] }, source:'S0(p125)' },
  { id:'ren-jia', name:'人假', nameEn:'Human False', tier:'conditional', scope:'palace', confidence:'consensus',
    when:{ door:'驚門', diPanStem:'壬', spirit:'九天' },
    interpretation:'驚門+壬+九天. 宜捕捉逃亡 (esp. paired with 太白入熒). Catching people/recovering.',
    guidance:{ favours:['competition'], avoid:[] }, source:'S0(p126)' },
  { id:'shen-jia', name:'神假 (物假)', nameEn:'Spirit False', tier:'conditional', scope:'palace', confidence:'consensus',
    when:{ door:'傷門', anyStem:['丁','己','癸'], spirit:['九地','六合'] },
    interpretation:'傷門+丁/己/癸+九地(或六合). 宜埋藏/祈禱/索債/捕捉/交易/伏藏 — burying, storing, debt-collection.',
    guidance:{ favours:['secrecy','wealth'], avoid:[] }, source:'S0(p126)' },
  { id:'gui-jia', name:'鬼假', nameEn:'Ghost False', tier:'conditional', scope:'palace', confidence:'consensus',
    when:{ door:'死門', anyStem:['丁','己','癸'], spirit:'九地' },
    interpretation:'死門+丁/己/癸+九地. 宜超度/安民/破土修造/伐邪/狩獵 — funerary, groundbreaking, clearing.',
    guidance:{ favours:['construction'], avoid:[] }, source:'S0(p126)' },
];
// All 五假: void if palace is 門迫 or 入墓 (五假忌迫墓). Tier 'conditional' → only "auspicious"
// for the listed narrow purpose; neutral/negative otherwise. Don't boost these in the
// business/launch/partnership presets.
```

---

## 7. Structural "harm" conditions (奇門四害 + 五不遇時 + 反吟/伏吟)

These are **computed predicates**, not stem-pair lookups. They are the backbone of *avoidance* in date selection. Implement each as its own function with a boundary fixture (architecture §4.4). See §7.10 for which are true hard vetoes vs strong default-excludes.

### 7.1 五不遇時 (Five Inharmonious Hour) — **strong default-exclude** (not absolute)  [CONFIRMED — S0(p133)]
Rule: **時干 controls 日干, same polarity** (時干克日干, 陽克陽/陰克陰 — the 七殺 of 日干). S0 tempers the classical severity: <cite>"事多不順，但不一定都凶，還要看格局的好壞，星、門的吉凶"</cite> — best avoided, but a strong formation/gate can partly redeem it.

```ts
export function isWuBuYuShi(dayStem: Stem10, hourStem: Stem10): boolean {
  return controlsSamePolarity(hourStem, dayStem); // hour 剋 day, same yin/yang
}
// Table CONFIRMED verbatim by S0(p133) — including 壬日戊申時, which validates my earlier
// 五鼠遁 derivation over the S19 web typo (戊午時):
export const WU_BU_YU_TABLE = {
  甲:'庚午時', 乙:'辛巳時', 丙:'壬辰時', 丁:'癸卯時', 戊:'甲寅時',
  己:'乙丑時', 庚:'丙子時', 辛:'丁酉時', 壬:'戊申時', 癸:'己未時',
} as const;
```
**Modelling:** default-exclude from search results (so it never surfaces as a "good" slot), but NOT a hard `blocked=-Infinity`. If a slot is 五不遇時 yet also carries e.g. a 三奇+吉門+吉格, show it with a strong warning rather than hiding it. This matches S0's "不一定都凶." Source: S0(p133).

### 7.2 六儀擊刑 (Six-Instrument Punishment) — **VETO**  [CONSENSUS]
A 儀(旬首) falling in a palace it 刑s. "極凶，即使六儀為值符，也不可用." Power cut ~50%.

```ts
export const LIU_YI_JI_XING: Record<Jiaxun, PalaceIndex> = {
  甲子: 3, // 戊 → 3震  (子刑卯)
  甲戌: 2, // 己 → 2坤  (戌刑未)
  甲申: 8, // 庚 → 8艮  (申刑寅)
  甲午: 9, // 辛 → 9離  (午自刑)
  甲辰: 4, // 壬 → 4巽  (辰自刑)
  甲寅: 4, // 癸 → 4巽  (寅刑巳)
};
// Fires when the palace's diPan 儀 equals the mapped stem AND palace.index matches.
```
Source: S25, S18, S27, S12 (all agree).

### 7.3 三奇入墓 (Three Wonders Enter Tomb) — **VETO**  [CONFIRMED — Joe]
A 三奇 landing in its tomb palace. "百事不宜，謀事盡休."

**Joe's ruling: BOTH 乙 tomb positions are valid — the veto fires when 乙 is in *either* 坤2 (未) or 乾6 (戌).** Both the classic 木墓於未 reading and the 陰木長生 (墓於戌) reading are accepted; the engine treats them inclusively.

```ts
// Tomb palace(s) per wonder. Array = "any of these palaces triggers 入墓".
export const SANQI_RUMU: Record<'乙'|'丙'|'丁', PalaceIndex[]> = {
  乙: [2, 6], // 坤(未) AND 乾(戌) — both valid per domain-expert ruling
  丙: [6],    // 乾(戌)  — stable across all sources
  丁: [8],    // 艮(丑)  — stable across all sources
};
// Fires when the palace holds the 奇 (乙/丙/丁) on the plate you evaluate 入墓 against
// (conventionally the 天盤 wonder) AND palace.index ∈ SANQI_RUMU[奇].
```
**Product note:** because 乙 now tombs in 2 of 9 palaces, its veto rate is ~2× the single-palace reading — expect marginally fewer 乙-favourable slots surfaced. This is the intended, tradition-faithful behaviour. If you later want to distinguish the two (e.g. treat 乾6 as a *softer* 乙-tomb than 坤6... err 坤2), split into `SANQI_RUMU_HARD` / `_SOFT` and downgrade rather than veto the soft one. Source: S18, S27, S24 (坤); S25 (乾); ruling by Joe (both).

### 7.4 門迫 & 宮迫 (Gate/Palace Oppression) — TWO distinct conditions  [CONFIRMED — Joe]
**Joe's ruling: these are two separate phenomena with *opposite* effect logic** (my earlier draft wrongly merged them). Both are computed from the 五行 剋 relation between the gate and the palace it occupies; the direction of 剋 decides which one, and each has its own consequence. Neither is a hard veto — both are score modifiers.

Palace elements: `1坎水 2坤土 3震木 4巽木 5中土 6乾金 7兌金 8艮土 9離火`.
Gate elements: `休水 生土 傷木 杜木 景火 死土 驚金 開金`.

```ts
const PALACE_ELEM: Record<PalaceIndex, Element> =
  {1:'水',2:'土',3:'木',4:'木',5:'土',6:'金',7:'金',8:'土',9:'火'};
const GATE_ELEM: Record<Door, Element> =
  {休門:'水',生門:'土',傷門:'木',杜門:'木',景門:'火',死門:'土',驚門:'金',開門:'金'};

// 門迫 (門克宮): the GATE controls the palace. Per S0 歌訣 "驚開三四休臨九，傷杜還歸二八宮；
// 生死排來居第一，景門六七總相同" → 中5 is EXCLUDED (my earlier [2,5,8] was over-broad):
//   開/驚(金)→[3,4] · 生/死(土)→[1] · 休(水)→[9] · 傷/杜(木)→[2,8] · 景(火)→[6,7]
export function isMenPo(door: Door, p: PalaceIndex): boolean {
  if (p === 5) return false; // 中宮 handled by centrePalace convention, not 迫
  return controls(GATE_ELEM[door], PALACE_ELEM[p]); // gate 剋 palace
}
// 宮迫/宮制 (宮克門): the PALACE controls the gate. Computed → resulting palaces:
//   開/驚(金)→[9] · 生/死(土)→[3,4] · 休(水)→[2,8] · 傷/杜(木)→[6,7] · 景(火)→[1]
export function isGongPo(door: Door, p: PalaceIndex): boolean {
  if (p === 5) return false;
  return controls(PALACE_ELEM[p], GATE_ELEM[door]); // palace 剋 gate
}
// 門宮和義 (GENERATIVE, auspicious) — S0(p126): 門生宮="和"; 宮生門="義". Both good with a 吉門.
export function menGongRelation(door: Door, p: PalaceIndex): '迫'|'制'|'和'|'義'|'比和'|null {
  if (p === 5) return null;
  const g = GATE_ELEM[door], q = PALACE_ELEM[p];
  if (controls(g, q)) return '迫';   // 門克宮 — bad
  if (controls(q, g)) return '制';   // 宮克門 — dampen (凶不起 protective on 凶門)
  if (generates(g, q)) return '和';  // 門生宮 — auspicious
  if (generates(q, g)) return '義';  // 宮生門 — auspicious
  return '比和';                     // same element — harmonious/neutral
}
```

**Effect logic (per Joe & S0 — note 迫/制 are NOT symmetric, and 和/義 are auspicious):**

| Relation | 吉門 (開/休/生) | 凶門 (死/驚/傷) |
|---|---|---|
| **門迫** (門克宮) — *amplifies* | 吉事不吉 — good gate loses its good → downgrade toward `neutral` | 百事更凶 — bad gate gets worse → deepen one tier |
| **宮制/宮迫** (宮克門) — *dampens* | 吉事不吉 — good gate underdelivers → downgrade toward `neutral` | **凶不起** — bad gate *suppressed* → **mitigate** toward `neutral` (protective) |
| **和** (門生宮) — auspicious | 遇吉門凡事吉 → small boost | mildly eases a 凶門 |
| **義** (宮生門) — auspicious | 遇吉門凡事吉 → small boost | mildly eases a 凶門 |
| 比和 (同五行) | harmonious/neutral | neutral |

```ts
// Scoring hook. Apply AFTER base gate valence.
function applyMenGong(gate: GateEval, door: Door, p: PalaceIndex): GateEval {
  const good = ['開門','休門','生門'].includes(door);
  switch (menGongRelation(door, p)) {
    case '迫': return good ? toNeutral(gate) : deepen(gate);    // 門克宮
    case '制': return good ? toNeutral(gate) : mitigate(gate);  // 宮克門: 凶不起
    case '和':
    case '義': return good ? boostSmall(gate) : easeSmall(gate);// 生 relations, auspicious
    default:   return gate;                                     // 比和 / 中5
  }
}
```

The key non-obvious payoff remains: **宮制 on a 凶門 is a *good* sign** (凶不起) — surface it as its own badge so the day-panel can explain why a 死門/驚門 slot isn't as bad as it looks. And note the two *generative* relations (和/義) are quietly favourable — most pickers ignore them, but they nudge a 吉門 slot up. Source: S0(p126,p130); effect asymmetry confirmed by Joe.

### 7.5 空亡 (Void)  [CONSENSUS — and note the engine bug-fix]
Per architecture **Bug 3**: 時空 is computed from the **hour pillar's 旬** (the two branches outside the hour 旬's decade are void), NOT the day void. A void palace = "unreal / effort wasted / no substance" — strongly downgrades commitments, contracts, and anything needing to *materialise*; sometimes *desirable* for escaping a bad matter or lying low. Model as a per-palace flag + score modifier, not a veto. Source: architecture §4.3; S12, S18.

### 7.6 伏吟 (Stagnation) & 反吟 (Reversal)  [CONFIRMED & enriched — S0(p131)]
Three kinds each: 星伏吟/門伏吟/值符伏吟 (and the 反吟 equivalents). A key directional nuance the source adds — useful for your 主/客 (initiator vs responder) framing in competition/negotiation:

```ts
export const REPETITION_RULES = [
  { id:'fu-yin', name:'伏吟', tier:'inauspicious',
    // 星: 九星 in home palace · 門: 八門 in home palace · 值符: 甲加甲 (e.g. 甲子戊+甲子戊)
    interpretation:'利主不利客; 主遲/主慢 — things won\'t move; delay, repetition, grief. Favours the one who stays put (主/host/defender). Worst: 天蓬+天蓬, 死門+死門, 甲午辛+甲午辛.',
    guidance:{ favours:['secrecy','wealth'/*收斂/討債*/], avoid:['launch','travel','expansion','competition'] },
    exception:'天顯時 (§6 tianxian-shige, hour stem 甲): 伏吟 turns AUSPICIOUS — suppress the penalty.',
    source:'S0(p131)' },
  { id:'fan-yin', name:'反吟', tier:'inauspicious',
    // 星/門/值符 falls into the 沖 (opposite) palace; e.g. 天蓬 坎1→離9; 甲子戊 加 甲午辛 (子午沖)
    interpretation:'利客不利主; 主快; 主事反覆 — fast but unstable, reversal, half-done then abandoned. Favours the mover/challenger (客). 門反吟 worst; 三奇 or 吉門 partially rescues.',
    guidance:{ favours:['competition'/*fast strikes*/], avoid:['launch','contract','partnership','construction'] },
    source:'S0(p131)' },
];
// 主/客 hook: 伏吟利主, 反吟利客. In competition/negotiation presets, weight by whether the
// user is the initiator (客/mover) or the incumbent (主/holder). This is a genuinely useful
// distinction the reference app-tier pickers usually miss.
```
Both are called "最為凶" in the 煙波釣叟歌, but note the 天顯時 exception above. Source: S0(p131), S24.

### 7.7 時干入墓 (Hour-Stem Enters Tomb)  [NEW — S0(p130)]
Distinct from 三奇入墓 (§7.3): here the **hour pillar's stem** (on 天盤) sits in *its own* tomb palace. Strong "buried/powerless" signal for the acting hour — a meaningful avoid for time-selection. Uses the 陰陽干 tomb table:

```ts
// Full 十干墓庫 (阳干顺行/阴干逆行 长生 system). Palace = 墓 location.
export const STEM_TOMB: Record<Stem10, PalaceIndex> = {
  甲: 2 /*未坤*/, 乙: 6 /*戌乾*/, 丙: 6 /*戌乾*/, 丁: 8 /*丑艮*/, 戊: 6 /*戌乾*/,
  己: 8 /*丑艮*/, 庚: 8 /*丑艮*/, 辛: 4 /*辰巽*/, 壬: 4 /*辰巽*/, 癸: 2 /*未坤*/,
};
// 時干入墓: the hour pillar stem, placed on 天盤, is in STEM_TOMB[hourStem].
// S0 examples verified: 丙戌時→丙 in 乾6; 壬辰時→壬 in 巽4; 癸未時→癸 in 坤2;
//                       戊戌時→戊 in 乾6; 己丑時→己 in 艮8; 丁丑時→丁 in 艮8.
export function isHourStemTomb(hourStem: Stem10, palaceOfHourStem: PalaceIndex): boolean {
  return STEM_TOMB[hourStem] === palaceOfHourStem;
}
```
Effect: strong negative for the acting hour (powerlessness). Not an absolute veto, but exclude-by-default for launches/contracts. You may also add **日干入墓** (day stem in its tomb) as a softer, day-level flag using the same table. Source: S0(p130).

### 7.8 三奇受制 / 三奇受刑 (Wonder Controlled)  [NEW — S0(p130)]
A 奇 sitting where its element is 克ed — the wonder is shackled. "不可行動."

```ts
// 火入水鄉: 丙/丁(火) in 坎1宮 or over 壬/癸(水).
// 木入金鄉: 乙(木) in 乾6/兌7宮 or over 庚/辛(金).
export function isSanQiControlled(o: {stem:Stem, palace:PalaceIndex, diPanStem:Stem}): boolean {
  const fireWonderChecked = ['丙','丁'].includes(o.stem) && (o.palace===1 || ['壬','癸'].includes(o.diPanStem));
  const woodWonderChecked = o.stem==='乙' && ([6,7].includes(o.palace) || ['庚','辛'].includes(o.diPanStem));
  return fireWonderChecked || woodWonderChecked;
}
```
Effect: negates the wonder's benefit for that palace (treat the 奇 as absent/negative). Note overlap with named 凶格 (e.g. 乙+辛 龍逃走) — count once. Source: S0(p130).

### 7.9 悖格 (Chaos Formation — the 丙 family)  [NEW — S0(p132)]
The 丙 counterpart to the 庚 obstruction family. 丙 = 天威, volatile → disorder, things thrown into confusion. Conditional: 丙 is a 奇, so a 三吉門 can rescue it.

```ts
export const BEI_GE_RULES = [
  { id:'bei-fu',  name:'悖格(丙+值符)', when:'天盤丙 + 地盤值符(戊/甲)  OR  值符 + 地盤丙' , tier:'inauspicious' },
  { id:'bei-sui', name:'歲悖', when:'天盤丙 + 地盤年干', tier:'inauspicious' },
  { id:'bei-yue', name:'月悖', when:'天盤丙 + 地盤月干', tier:'inauspicious' },
  { id:'bei-ri',  name:'日悖', when:'天盤丙 + 地盤日干', tier:'inauspicious' },
  { id:'bei-shi', name:'時悖', when:'天盤丙 + 地盤時干', tier:'inauspicious' },
];
// 悖格: 多倒行逆施/綱紀紊亂/難達理想. avoid:['launch','partnership','contract'].
// RESCUE: if a 三吉門 shares the palace, do NOT read as pure 凶 (丙 is a 奇). Gate it like 迫/墓.
// Source: S0(p132).
```

### 7.10 Severity summary (which conditions block vs penalise)
```
ABSOLUTE VETO (blocked, unrescuable):   六儀擊刑
STRONG VETO (blocked for selection):    三奇入墓            (nullifying: 吉不吉/凶不凶)
STRONG DEFAULT-EXCLUDE (soft):          五不遇時, 時干入墓, 三奇受制
HEAVY PENALTY (score, not block):       反吟, 伏吟(unless 天顯時), 悖格, 空亡, 門迫(凶門)
MITIGATOR (positive on a 凶門):          宮制 (凶不起)
```
Everything else flows through the tier weights in §2. 天顯時 (§6) flips 伏吟 positive.

---

## 8. Application → formation mapping (drives your activity presets & search)

For each preset in §6.3/§10.1 of the architecture doc, the search ranks slots by score but should also **require/boost** the "favours" formations and **hard-exclude** the vetoes + the preset-specific avoids.

```ts
export const ACTIVITY_PRESETS = {
  開業_launch: {
    boost:  ['tian-dun','qinglong-fanshou','feiniao-diexue','di-dun','sanqi-shengdian','tianxian-shige','sanqi-zhiling','qiyou-luwei'],
    goodGates:['開門','生門'], goodSpirits:['值符','九天'],
    exclude:['fan-yin','fu-yin','taibai-ruying','huoru-jinxiang','bei-fu', /* + all vetoes */],
  },
  簽約_contract: {
    boost:['ren-dun','yunü-shoumen','qiyi-xiangzuo','qiyi-xianghe'],
    goodGates:['休門','生門'], goodSpirits:['六合','值符'],
    exclude:['zhuque-toujiang','tengshe-yaojiao','fan-yin','空亡', /* + vetoes */],
  },
  合夥談判_partnership: {
    boost:['ren-dun','san-zha-xiu','yunü-shoumen','qiyi-xianghe','huanyi'],
    goodGates:['休門'], goodSpirits:['六合','太陰'],
    exclude:['qinglong-taozou','baihu-changkuang','zhange-taibai-tonggong','fan-yin', /* + vetoes */],
  },
  求財投資_wealth: {
    boost:['ren-dun','feiniao-diexue','sanqi-shengdian','qiyou-luwei','tianxian-shige'],
    goodGates:['生門'], goodSpirits:['值符','九地'],
    exclude:['taibai-ruying','huoru-jinxiang','riqi-beixing','空亡', /* + vetoes */],
  },
  擴張遠圖_expansion: {
    boost:['qinglong-fanshou','tian-dun','shen-dun'],
    goodGates:['開門'], goodSpirits:['九天'],
    exclude:['fu-yin','geng-da-ge','tianwang-sizhang', /* + vetoes */],
  },
  競爭銷售_competition: {
    boost:['feiniao-diexue','san-zha-zhen','san-zha-zhong'],
    goodGates:['景門'/*offense*/], goodSpirits:['九天'],
    note:'太白入熒 favours the mover (客). 伏吟利主/反吟利客 (§7.6): weight by whether user is initiator or holder.',
    exclude:['fu-yin', /* + vetoes */],
  },
  出行執行_travel: {
    boost:['di-dun','tianxian-shige'], goodGates:['開門','休門','生門'],
    exclude:['geng-da-ge','geng-xiao-ge','baihu-changkuang','fan-yin','fu-yin', /* + vetoes */],
    note:'馬星 palace is a positive for travel/movement (add when 馬星 lands with a 吉門).',
  },
  上官赴任_career: {
    boost:['sanqi-shengdian','qiyou-luwei','tianxian-shige','tian-dun','huanyi'],
    goodGates:['開門','生門'], goodSpirits:['值符','九天'],
    exclude:['fan-yin','fu-yin','bei-fu', /* + vetoes */],
  },
  動土修造_construction: {
    boost:['di-dun','san-zha-zhong'], goodGates:['生門'], goodSpirits:['九地'],
    exclude:['fan-yin', /* + vetoes */],
  },
  婚姻和合_romance: {
    boost:['ren-dun','yunü-shoumen','san-zha-xiu'], goodGates:['休門'], goodSpirits:['六合','太陰'],
    exclude:['qinglong-taozou','baihu-changkuang','fan-yin', /* + vetoes */],
  },
} as const;
// VETOES (apply to EVERY preset): 六儀擊刑 (absolute) + 三奇入墓 (nullifying) → block.
// 五不遇時 + 時干入墓 + 三奇受制 → default-exclude/heavy penalty (see §7.10 / §9).
```

**Global "avoid this date/hour" rule of thumb** (the classical 擇時 filter, S15): a slot is usable when it is free of 五不遇時 / 三奇入墓 / 六儀擊刑 **and** carries at least one 三奇 or one 三吉門 (開/休/生). 奇+吉門 together is ideal; 吉門 without 奇 is still usable; 奇 without 吉門 is weak; neither = do not use. Layer the named 吉格/凶格 on top of that base filter.

---

## 9. Scoring guidance (feeds `scoring.ts`)

1. **Base**: sum intrinsic valences of the palace's gate + star + deity (§3).
2. **Formations**: add `TIER_WEIGHTS[tier]` for each matched §4–§6 pattern.
3. **Conditional pairs** (`tier:'conditional'`): resolve sign from the co-located gate, then apply.
4. **Structural modifiers**: apply 門迫 / 宮迫 (§7.4) — note 宮迫 on a 凶門 *mitigates* (凶不起); then 空亡/伏吟/反吟 penalties (§7.5–7.6).
5. **Vetoes (tiered, per §2):** 六儀擊刑 → absolute `blocked`. 三奇入墓 → `blocked` for selection (nullifying). 五不遇時 → default-exclude + heavy penalty, but a strongly-formed slot may surface with a warning. Also apply 時干入墓 (§7.7) and 三奇受制 (§7.8) as heavy penalties. Do NOT let boosts mask the first two.
6. **迫/墓/擊/刑 gating on supreme格**: 青龍返首 / 飛鳥跌穴 lose their bonus (and may invert) if the palace also carries 迫/墓/擊/刑 — evaluate that interaction explicitly (matches the classical caveat).

Keep every weight in the config table so tuning never touches algorithm code (architecture §5).

---

## 10. Status after 《神奇之门》 (S0) — nearly everything resolved

The uploaded source (张志春《神奇之门》, 中编) is now the **primary authority (S0)** and supersedes web sources on any conflict. It validated the spine of the spec and closed the open questions.

**✅ VALIDATED unchanged by S0:** 六儀擊刑 table (exact), 三奇入墓 乙:[2,6]/丙:[6]/丁:[8] (exact — S0 states 乙 tombs in *both* 乾6 and 坤2 verbatim), 五不遇時 table (exact, incl. 壬日戊申時), 三詐 sub-types (真/休/重 exact), 門迫=門克宮, 天網四張=癸+癸 only, 青龍返首/飛鳥跌穴 stem pairs, 天/地/人遁.

**✅ CORRECTED via S0:**
- **鬼遁** → 杜門(或開門)+丁+九地 (was wrongly 生門). (§5)
- **玉女守門** → 地盤丁 + 值使門 (was 天盤丁). (§6)
- **門迫 傷/杜 palaces** → [2,8], 中5 excluded per the 歌訣. (§7.4)
- **五不遇時** → downgraded from hard-veto to strong default-exclude ("不一定都凶"). (§7.1, §2)
- **三奇得使** → set to S0's 奇+值使門 (张志春). ⬅ **your one call to make** (see below).

**✅ ADDED from S0 (previously open):** full 九遁 (风/云/龙/虎 + corrected 神/鬼); 天顯時格 (= the 天輔時 I couldn't source — hour stem 甲, auspicious 伏吟); 奇游祿位; 三奇之靈; 歡怡; 奇儀相合; 五假 (天/地/人/神/鬼假); 時干入墓 (+full 十干墓 table); 三奇受制; 悖格 (丙 family); 奇格 (庚+乙/丙/丁); 門宮和義 (生 relations 和/義). 

**⏳ TWO things left for you:**
1. **三奇得使 label** — I set it to 张志春's 奇+值使門 (source-faithful). Your earlier "奇+三吉門" is kept as the §8 base-filter concept. If you'd rather the *app label* "三奇得使" mean 奇+任一吉門 (friendlier, but diverges from S0), it's a one-line `when` flip — tell me which you want.
2. **Full 十干克應 (81 combos)** — with S0 in hand I can now transcribe the complete table from this single authoritative source (it gives the 癸 row/column in §4.4 already; the rest are in the same chapter). Want the full 81 as a `tier:'conditional'` reference for palace pop-ups? Say the word.

*(八神 naming resolved earlier: default 白虎/玄武, toggle 勾陳/朱雀 — §3.3.)*

---

## 11. Sources

Consulted and cross-checked (paraphrased throughout; none reproduced verbatim). Chinese practitioner/encyclopedic sources unless noted.

- **S0 (PRIMARY)** 张志春《神奇之门》，中编「数理奇门的基础知识」第三节 奇门常用吉格 / 第四节 奇门常用凶格 (pp. 123–133). Uploaded by Joe. Authoritative for all formation definitions; supersedes web sources on conflict. Page refs given inline as S0(p###).
- **S2** 360doc — 十干克應與吉凶格 (兩名家 張志春/幺學聲 對照). http://www.360doc.com/content/24/0108/07/35000329_1110321271.shtml
- **S3** 知乎 — 奇門遁甲解盤十干克應. https://zhuanlan.zhihu.com/p/562685520
- **S4** 知乎 — 奇門遁甲之吉格與凶格(常用). https://zhuanlan.zhihu.com/p/608463078
- **S5** 國易360 — 十干克應(奇門遁甲高級). https://www.guoyi360.com/qmdj/gj/2876.html
- **S6** 知乎 — 必背知識 十干克應格局. https://zhuanlan.zhihu.com/p/681580436
- **S8** yxqm.net — 奇門十干克應 (full table; GBK-encoded). http://yxqm.net/sanshi/ShowArticle.asp?ArticleID=25
- **S9** 易師匯 — 十干克應解盤占斷. https://ly.yishihui.net/4938.htm
- **S11** 新浪博客(太白童子) — 奇門四害白話析解. https://blog.sina.com.cn/s/blog_af85ff5f0102z1nl.html
- **S12** 知乎 — 奇門四害：門迫/擊刑/空亡/入墓. https://zhuanlan.zhihu.com/p/680862039
- **S13** Destiny Asia — QMDJ Art of War syllabus (English formation names). https://masterfengshui.com/course/qi-men-dun-jia-course
- **S15** 台州府城隍廟 — 奇門遁甲基礎 (吉方判準；三奇入墓/六儀擊刑/天網四張 定義). https://lhchm.cn/奇門遁甲基礎/
- **S18** 易德軒 — 入墓與空亡/門迫與擊刑. https://qimen.yi958.com/qmdj/5213
- **S19** 新浪 — 時干入墓和五不遇時. https://k.sina.cn/article_7521489637_1c050d2e500100xulc.html
- **S20** 新浪新聞 — 什麼叫五不遇時. https://k.sina.cn/article_6495556892_1832a551c00100m7y5.html
- **S21** 新浪 — 五不遇時 (原文 45–46 句). https://k.sina.com.cn/article_7521489637_1c050d2e500100xulc.html
- **S23** 知乎 — 五不遇時. https://zhuanlan.zhihu.com/p/637365567
- **S24** 博客園 — 煙波釣叟歌 全文 (classic verse: 伏吟/反吟/六儀擊刑/三奇入墓/五不遇時). https://www.cnblogs.com/myphoebe/archive/2011/08/04/2127367.html
- **S25** 台州府城隍廟 — 三奇入墓(乙墓乾變體)/六儀擊刑/天網四張. https://lhchm.cn/奇門遁甲基礎/
- **S26** 乾坤國學院 — 人遁 (丁奇+休門+太陰). http://www.qkgxy.com/show.asp?id=115
- **S27** 易德軒 — 學習奇門吉凶格局整理表 (comprehensive 吉凶格 table). https://qimen.yi958.com/qmdj/5556
- **S30** 豆瓣 — 奇門遁甲九遁詳釋. https://www.douban.com/note/867355494/
- **S31** 百度百科 — 地遁 (開門+六乙+六己). https://baike.baidu.com/item/地遁/3925953
- **S32** 知乎 — 奇門遁甲九遁. https://zhuanlan.zhihu.com/p/644069257
- **S33** 知乎 — 九遁的真正奧秘 (天遁 丙/丁/生門). https://zhuanlan.zhihu.com/p/620317168
- **S35** Book of Changes Academy — What is Qimen Dunjia (English cross-check of 天/地/人遁, 青龍回首, 飛鳥跌穴). https://bookofchanges.academy/blog/what-is-qimen-dunjia
- **S36** Destiny Asia syllabus — English formation glossary. https://masterfengshui.com/course/qi-men-dun-jia-course

*Note on provenance: S8's full 81-combination table renders in GBK and could not be cleanly decoded in-session, so fixed-valence pairs were taken from the cleanly-rendered S3/S4/S5/S27 and cross-checked. If you want the complete 81, point me at one authoritative print source (e.g. a named 煙波釣叟歌 annotated edition) and I'll transcribe from that single source rather than merging web pages.*
