# 奇門遁甲 格局 Registry — v2
**Data & Rules Spec for 擇日擇時 (action-time selection)**

**Supersedes** `qmdj-formations-registry.md` (v1). Section numbering preserved so existing cross-references still resolve.

**What changed in v2, in one paragraph:** a **selection-vs-forecast triage rule** (§0.1) now governs what may be imported from S0 and what must be discarded; the **complete 十干克應 81-combination table** is transcribed from a single authority (§4); the **門宮 relation effects are corrected** — 生 relations amplify rather than mitigate (§7.4); **vitality (旺相休囚廢) is added as a first-class layer** with per-symbol-class rules (§7.11); the **usability ladder is tightened** to the strict reading (§8.1); **主客 becomes partly chart-computable** (§7.12); and the scoring pipeline is **reordered** so vitality modulates symbols, not formations (§9).

---

## 0. Accuracy statement, scope, confidence flags

奇門遁甲 is a traditional Chinese metaphysical system, not an empirically validated predictive science. Everything here is **faithful to the QMDJ textual tradition** as recorded by the primary source; that is the only sense in which it is "validated." It is not a claim that these formations forecast real-world outcomes.

Target school: **時家轉盤奇門** (hour-based, rotating-plate). 拆補/置閏/陰盤 share formation logic; only board construction differs.

Confidence flags on each rule:
- **[CONSENSUS]** — same definition across every source checked.
- **[VARIANT]** — sources genuinely disagree; the most common version is given and the alternative named. **Domain-expert confirmation needed before public launch.**
- **[DERIVED]** — computed from first principles because sources contained typos; deterministic, so trustworthy.
- **[S0-INTERNAL]** — *new in v2.* S0 states the rule two different ways in two different chapters. The chosen reading and the discarded one are both recorded.

### 0.1 ⚠️ The selection-vs-forecast triage rule — READ BEFORE IMPORTING ANYTHING

**This is the most important methodological rule in the registry.** S0 (张志春《神奇之门》) contains two kinds of chapter, and they must not be mixed:

| Chapter class | Pages (verified in hand) | Question it answers | What may be imported |
|---|---|---|---|
| **斷卦 / 預測 (forecast)** | 第三–五節 八門/九星/八神的信息特徵 (pp.100–109); 第五章第一節 十干克應 (pp.110–116); 第二節 八門克應 (p.117+); 第二節 奇門預測的幾種判斷方法 (pp.141–145) | *Given this hour, what is happening / will happen?* | The **格局 name**, its **valence sign**, and any **門吉則吉/門凶則凶 conditionality**. Nothing else. |
| **擇時擇方 (selection)** | 第四章第五節 擇時擇方 (pp.135–140); 第三節 擇時擇方必須綜合運用 (p.137); (三) 動靜先後分主客 (pp.138–139) | *Which hour and direction should I act in?* | Everything. **These statements outrank forecast-chapter statements wherever the two touch the same mechanism.** |

Operating rules for transcription:

1. **Do not import 斷 narrative as `guidance`.** 測婚為女逃男 · 生育母子俱傷 · 女人產嬰童 · 病者發凶或必死 · 測病亦大凶 are *answers to questions asked*, not warnings about actions taken. They belong in an optional `divination` field for palace pop-ups, never in `guidance.favours` / `guidance.avoid`, and never in scoring.
2. **Populate `guidance` only from 宜/忌 vocabulary** — 宜安營扎寨 · 不宜遠行 · 只宜安分守己 · 躲災避難方為吉 · 以守為好 · 妄動必凶. That register is action-selection.
3. **Where an entry carries no 宜/忌 clause, leave `guidance` empty.** Do not back-form it from a 測 statement.
4. **The bridge that licenses using forecast-chapter 格局 in selection at all** is S0(p136): 選擇吉方，應避開三奇入墓、六儀擊刑、年、月、日、時格…等凶格…如遇凶格，則不可用. The 格局 enter selection as **filters and valence**, not as narratives.

**Three consequences already applied in v2:**
- **八門克應 (p.117+) is deprioritised**, not elevated. Its content is almost entirely 斷 (主貴人寶物財喜 / 主破財失物難尋). It contributes little to action selection beyond what 門宮 relations already provide. See §10.4.
- **The apparent p.103 vs p.141 contradiction on 宮克門 dissolves.** p.141 quotes 《奇門遁甲秘籍大全》 (宮克門凶) inside a *forecast* chapter; p.103 and p.137 are the *selection* authority and both hold that 制 damps. No ruling needed — the conflict was a chapter-mixing artefact.
- **The old 值符/值使/時干 roll-up is not rescued by p.141.** 《奇門統宗》's 靜則只查值符、值使、時干 is 斷卦 guidance for static questions. It does not license an hour-level weighted average for selection. This strengthens the direction model's decision to abandon `值使×0.6 + outer-avg×0.4`.

---

## 1. Encoding conventions

```ts
type Stem   = '乙'|'丙'|'丁'|'戊'|'己'|'庚'|'辛'|'壬'|'癸'; // 甲 hidden (遁甲), shown as its 儀
type Stem10 = Stem | '甲';
type Jiaxun = '甲子'|'甲戌'|'甲申'|'甲午'|'甲辰'|'甲寅';
//   甲子→戊  甲戌→己  甲申→庚  甲午→辛  甲辰→壬  甲寅→癸

// Palaces by Luoshu number. Element in parentheses.
//  1 坎(水) · 2 坤(土) · 3 震(木) · 4 巽(木) · 5 中(土) · 6 乾(金) · 7 兌(金) · 8 艮(土) · 9 離(火)
type PalaceIndex = 1|2|3|4|5|6|7|8|9;
type Element = '木'|'火'|'土'|'金'|'水';

type Door   = '休門'|'生門'|'傷門'|'杜門'|'景門'|'死門'|'驚門'|'開門';
type Star   = '天蓬'|'天芮'|'天沖'|'天輔'|'天禽'|'天心'|'天柱'|'天任'|'天英';
type Spirit = '值符'|'螣蛇'|'太陰'|'六合'|'白虎'|'玄武'|'九地'|'九天';

// NEW in v2 — vitality. NOTE the fifth state differs by symbol class.
type GateVitality = '旺'|'相'|'休'|'囚'|'死';   // 八門 follow the standard 五行 states
type StarVitality = '旺'|'相'|'休'|'囚'|'廢';   // 九星 never 死 — S0(p107), see §7.11
type Vitality = GateVitality | StarVitality;

type Tier =
  | 'supreme-auspicious'    // 大吉
  | 'auspicious'            // 吉
  | 'minor-auspicious'      // 小吉
  | 'neutral'               // 平 / 中性
  | 'conditional'           // 門吉則吉、門凶則凶 — valence resolved from co-located gate
  | 'minor-inauspicious'    // 小凶
  | 'inauspicious'          // 凶
  | 'supreme-inauspicious'; // 大凶

interface PatternRule {
  id: string;
  name: string;             // 中文
  nameEn: string;
  tier: Tier;
  scope: 'palace' | 'chart';
  confidence: 'consensus' | 'variant' | 'derived' | 's0-internal';
  when: WhenClause;
  interpretation: string;   // plain-language, SELECTION framing only
  guidance: {               // populated ONLY from 宜/忌 language — see §0.1 rule 2
    favours: ApplicationTag[];
    avoid:   ApplicationTag[];
  };
  divination?: string;      // NEW in v2 — 斷卦 meaning, for palace pop-ups. NEVER scored.
  notes?: string;
  source: string;
}

type ApplicationTag =
  | 'launch' | 'contract' | 'partnership' | 'wealth' | 'expansion'
  | 'competition' | 'travel' | 'career' | 'construction'
  | 'romance' | 'secrecy' | 'study';
```

**Evaluator contract.** A `when` clause is an AND of the fields present. Multi-symbol clauses all refer to the **same palace**. `scope:'chart'` rules read whole-chart context and are evaluated once per chart.

---

## 2. Tier → score weights, and symbol-class weighting

```ts
export const TIER_WEIGHTS: Record<Tier, number> = {
  'supreme-auspicious':  +100,
  'auspicious':           +60,
  'minor-auspicious':     +30,
  'neutral':                0,
  'conditional':            0,   // resolved from co-located gate at eval time
  'minor-inauspicious':   -30,
  'inauspicious':         -60,
  'supreme-inauspicious':-100,
};
```

### 2.1 NEW — symbol-class weighting [CONSENSUS, S0(p137)]

S0 is explicit and this was missing from v1, which summed gate/star/spirit flat:

> 在門、星、神三者中，**吉門最重要**，吉星、三奇次之，吉神可起輔助作用。

Reinforced at p136: 如果只有吉門而沒有奇…也算吉利方位，可用。**可見吉門比三奇還重要。**

```ts
// Applied to BASE VALENCE only (§9 step 1). Not to formation tier weights.
export const CLASS_WEIGHT = {
  gate:   1.00,   // 八門 — dominant
  star:   0.60,   // 九星
  stem:   0.60,   // 三奇六儀 (奇 ranks with 星, both below 門)
  spirit: 0.30,   // 八神 — 輔助 only
} as const;
// The ORDERING is traditional (S0 p136-137). The exact ratios are engineering
// parameters — tune them, but never let spirit ≥ star, or star ≥ gate.
```

### 2.2 Severity tiers

- **Absolute veto** → `blocked=true`, unrescuable: **六儀擊刑** (極凶，即使六儀為值符也不可用). S0(p129).
- **Strong veto / nullifying** → `blocked=true` for selection: **三奇入墓** (百事不宜，謀事盡休 — it *nullifies* rather than harms: 吉的不吉，凶的不凶). S0(p133).
- **Chart-scope veto** → `chartBlocked=true`, the whole 時辰 is out: **五不遇時**. ✅ **RULING (Joe): upgraded from v1's "default-exclude with warning".** S0(p135), the *selection* chapter, is the governing statement — 要盡量避開五不遇時…所以主凶, and 正是奇門擇時最忌諱的五不遇時. The softer p133 wording (不一定都凶) sits in the 凶格 definitional chapter and is outranked per §0.1. **No formation rescues it** — not 青龍返首, not 天遁.
- **Palace-scope hard exclusion** → that *direction* is out, other directions in the same hour survive. S0(p136)'s explicit avoid-list for direction selection: **時干入墓, 年格/月格/日格/時格, 大格/上格/刑格, 飛干格, 伏宮格, 飛宮格**. Implemented as `assignBand()` step 0b (direction model §3.4).

---

## 3. Intrinsic symbol tables (base valence)

### 3.1 八門 — element + base valence [CONSENSUS, S0(p100)]

> 開、休、生三門吉，死、驚、傷三門凶，杜門、景門中平，**但運用時還必須看臨何宮以及旺相休囚**。 — S0(p100)

That trailing clause is the mandate for §7.11.

```ts
export const GATES = {
  開門: { element:'金', quality:'auspicious',   uses:['launch','career','wealth','travel','expansion'] },
  休門: { element:'水', quality:'auspicious',   uses:['partnership','romance','career','travel'] },
  生門: { element:'土', quality:'auspicious',   uses:['wealth','launch','construction','contract'] },
  傷門: { element:'木', quality:'inauspicious', uses:['competition'] },        // 討債/捕獵/競技 offense only
  杜門: { element:'木', quality:'neutral',      uses:['secrecy'] },            // 無事好逃藏 (p100 歌訣)
  景門: { element:'火', quality:'neutral',      uses:['study','competition'] },// 獻策籌謀/選士薦賢/拜職遣使 (p103)
  死門: { element:'土', quality:'inauspicious', uses:[] },                     // 只宜弔死送喪/刑戮爭戰/捕獵殺牲 (p103)
  驚門: { element:'金', quality:'inauspicious', uses:['competition'] },        // 鬥訟官司/掩捕盜賊/設疑伏兵 (p103)
} as const;
// 三吉門 = 開/休/生 · 三凶門 = 死/驚/傷 · 二平門 = 杜/景
// 景門 is 小吉，亦為中平 (p103) — keep at 'neutral', do not promote.
```

### 3.2 九星 — element + base valence [CONSENSUS, S0(p104,p106)]

> 天心星、天任星、天禽星、天輔星為四吉星，天沖星是次吉之星；天蓬星、天芮星、天柱星為三凶星；**天英星中平**。 — S0(p104)

**⚠️ CHANGE FROM v1: 天英 was `inauspicious`; corrected to `neutral`.** S0(p106) calls it 中平之星，或小凶之星 — the weaker reading is the one stated in the classification list at p104.

```ts
export const STARS = {
  天心: { element:'金', quality:'auspicious'      },  // 四吉星
  天任: { element:'土', quality:'auspicious'      },  // 四吉星 — 百事皆吉，四時皆宜 (p106)
  天輔: { element:'木', quality:'auspicious'      },  // 四吉星 — 文教/升學
  天禽: { element:'土', quality:'auspicious'      },  // 四吉星 — 中宮/公正
  天沖: { element:'木', quality:'minor-auspicious'},  // 次吉之星
  天蓬: { element:'水', quality:'inauspicious'    },  // 三凶星
  天芮: { element:'土', quality:'inauspicious'    },  // 三凶星 — 病星
  天柱: { element:'金', quality:'inauspicious'    },  // 三凶星
  天英: { element:'火', quality:'neutral'         },  // ⚠️ CORRECTED v1→v2: 中平
} as const;
```

### 3.3 八神 — base valence, and the 勾陳/朱雀 correction [CONSENSUS on valence, CORRECTED on structure]

**⚠️ MAJOR CHANGE FROM v1.** v1 modelled 白虎/玄武 vs 勾陳/朱雀 as an either/or **naming toggle**. S0(p108–109) says they are **nested, not alternate**:

> 白虎（下有勾陳）…白虎下隱有勾陳，勾陳具有地戶己土性質，己土長生於酉，故隱於白虎之下。
> 玄武（下有朱雀）…朱雀本來是南方火神，但北方玄武子水之位，正是丙火懷胎之地，所以朱雀隱於玄武之下，也管一些口舌是非之事。

They **co-exist**. Positions 5 and 6 carry a primary theme *and* a hidden secondary theme. There is no user setting; the `spiritNaming` toggle from v1 is **deleted**.

```ts
export const SPIRITS = {
  值符: { quality:'auspicious',   theme:'貴人/權威/主事 — 八神之領袖，所到之處百惡消散' },
  螣蛇: { quality:'inauspicious', theme:'虛詐/驚恐怪異/虛詐不實' },
  太陰: { quality:'auspicious',   theme:'蔭護/陰匿暗昧 — 可以密謀策劃、避難藏兵' },
  六合: { quality:'auspicious',   theme:'護衛/開朗平和 — 專管婚姻交易中介；利於談判、交易、婚姻嫁娶' },
  白虎: { quality:'inauspicious', theme:'凶煞/凶猛好鬥 — 行兵打仗、凶殺打鬥、疾病死傷、交通事故',
          hidden: { name:'勾陳', theme:'地戶己土 — 纏訟/田土是非/牽絆/遲滯' } },
  玄武: { quality:'inauspicious', theme:'奸讒小盜 — 專管盜賊、逃亡、口舌',
          hidden: { name:'朱雀', theme:'南方火神 — 文書/口舌是非/信息' } },
  九地: { quality:'auspicious',   theme:'坤土厚載/堅牢之神 — 利於屯兵固守、播種養殖' },
  九天: { quality:'auspicious',   theme:'乾金為天為父/威悍之神 — 揚兵布陣、行軍打仗、遠行出國' },
} as const;
```

**Two further rules from the same section, both new:**

```ts
// (a) 值符 SUPPRESSES 庚. S0(p108): 即使太白庚金這最凶的惡煞，臨於值符之下，
//     也力量大減，難以作惡。故古人又稱之為天乙之神。
//     → If 庚 shares a palace with 值符, damp every 庚-family penalty (§4.6, §7.9-adjacent).
export function zhifuSuppressesGeng(palace: PalaceEval): boolean {
  return palace.spirit === '值符' && palaceHoldsStem(palace, '庚');
}

// (b) PLATE CONVENTION. S0(p109): 隨天盤九星值符運行的叫天盤八神，隨地盤六甲值符
//     運行的叫地盤八神…為了簡化，我們只用天盤八神。
//     → Engine uses 天盤八神 for scoring. 地盤八神 may be DISPLAYED (see §10.5)
//       but must not be scored, or every 八神 rule fires twice.
export const SPIRIT_PLATE: 'tianpan' = 'tianpan';
```

> **This resolves architecture §10.6 ambiguity (b)** — the reference app's second, differently-rotated 八神 label in the palace-cell bottom-left is almost certainly the **地盤八神**. Confidence: high, but confirm against the screenshot before building.

---

## 4. 十干克應 — the complete 81-combination table [CONSENSUS, S0(pp.110–116)]

**v1 §10.2 open item is now closed.** The full table is transcribed below from a single authoritative source, as the v1 provenance note required. Read every pair as **天盤(over) / 地盤(under)**. 甲 is hidden and represented by its 儀 (戊=甲子, 己=甲戌, 庚=甲申, 辛=甲午, 壬=甲辰, 癸=甲寅).

Per §0.1, each entry carries only: **name, tier, conditionality, and selection guidance where 宜/忌 language exists.** Forecast narrative is quarantined in `divination`.

```ts
interface KeYingEntry {
  name: string;
  tier: Tier;
  conditional?: boolean;   // 門吉則吉、門凶則凶 — resolve sign from co-located gate
  gateRescue?: boolean;    // 門吉有救 — a 三吉門 partially redeems
  favours?: ApplicationTag[];
  avoid?: ApplicationTag[];
  ref?: string;            // page
}
// Key format: '天盤/地盤'
export const SHI_GAN_KE_YING: Record<string, KeYingEntry> = { /* below */ };
```

### 4.1 天盤 戊 (甲子) — S0(p110)

| pair | 格名 | tier | notes |
|---|---|---|---|
| 戊/戊 | 伏吟 | inauspicious | 凡事不利，道路閉塞，**以守為好** → `avoid:[launch,travel,expansion]`, `favours:[secrecy]` |
| 戊/乙 | 青龍和會 | conditional | 門吉事也吉，門凶事也凶 |
| 戊/丙 | **青龍返首** | supreme-auspicious | 大吉大利。**若逢迫墓擊刑，吉事成凶** → §9.6 gating |
| 戊/丁 | 青龍耀明 | auspicious | 宜見上級領導、貴人、求功名 → `favours:[career,study,partnership]`. 若值墓迫，招惹是非 |
| 戊/己 | 貴人入獄 | inauspicious | 公私皆不利 → `avoid:[launch,career,contract]` |
| 戊/庚 | 值符飛宮 | inauspicious | 吉事不吉，凶事更凶，求財沒利益 → `avoid:[wealth,launch,career]` |
| 戊/辛 | 青龍折足 | conditional | 吉門有生助尚能謀事；若逢凶門主招災失財 — `gateRescue:true` |
| 戊/壬 | 青龍入天牢 | inauspicious | 凡陰陽事皆不吉利 → `avoid:[launch,contract,partnership]` |
| 戊/癸 | 青龍華蓋 | conditional | 戊癸相合。逢吉門為吉可招福臨門；逢凶門者事多不利 |

### 4.2 天盤 乙 (日奇) — S0(p111)

| pair | 格名 | tier | notes |
|---|---|---|---|
| 乙/戊 | 陰害陽門 | conditional | 利陰人陰事，不利陽人陽事。門吉尚可謀為；**門凶、門迫則破財傷人** |
| 乙/乙 | 日奇伏吟 | minor-inauspicious | 不宜見上層領導貴人，不宜求名求利，**只宜安分守己為吉** → `avoid:[career,launch]` |
| 乙/丙 | 奇儀順遂 | conditional | 吉星遷官晉職；凶星夫妻反目 — resolved by **star**, not gate |
| 乙/丁 | 奇儀相佐 | auspicious | **最利文書、考試，百事可為** → `favours:[study,contract,career]` |
| 乙/己 | 日奇入墓 | inauspicious | 被土暗昧，門凶事必凶。**得生、開二吉門為地遁** → see §5 |
| 乙/庚 | 日奇被刑 | inauspicious | 爭訟財產 → `avoid:[partnership,contract,wealth]`. Interaction with 奇儀相合, §6 |
| 乙/辛 | **青龍逃走** | inauspicious | 人亡財破，奴僕拐帶 → `avoid:[partnership,contract,wealth,launch]`. 主克客 → 應為主 (§7.12) |
| 乙/壬 | 日奇入地 | inauspicious | 尊卑悖亂，官訟是非 → `avoid:[contract,partnership,career]` |
| 乙/癸 | 華蓋逢星 | conditional | **遁跡修道，隱匿藏形，躲災避難為吉** → `favours:[secrecy]`, `avoid:[launch,expansion]` |

### 4.3 天盤 丙 (月奇) — S0(p112)

| pair | 格名 | tier | notes |
|---|---|---|---|
| 丙/戊 | **鳥跌穴 (飛鳥跌穴)** | supreme-auspicious | 百事吉，事業可為，**可謀大事** → `favours:[competition,wealth,launch,partnership,expansion]`. 迫墓擊刑 gating per §9.6 |
| 丙/乙 | 日月並行 | auspicious | **公謀私為皆為吉** |
| 丙/丙 | 月奇悖師 | inauspicious | 文書逼迫，破耗遺失 → `avoid:[contract,study]` |
| 丙/丁 | 星奇朱雀 | auspicious | 貴人文書吉利。**得三吉門為天遁** → see §5 |
| 丙/己 | 火悖入刑 | conditional | 文書不行。**吉門得吉，凶門轉凶** |
| 丙/庚 | 熒入太白 | inauspicious | 門戶破敗，盜賊耗失，事業亦凶 → `avoid:[wealth,launch,partnership]` |
| 丙/辛 | 干合 (丙辛合) | auspicious | **謀事能成** → `favours:[partnership,contract]`. Part of 奇儀相合, §6 |
| 丙/壬 | 火入天羅 | inauspicious | **為客不利**，是非頗多 → penalise when `role==='mover'` (§7.12) |
| 丙/癸 | 華蓋悖師 | inauspicious | 災禍頻生 → `avoid:[launch,partnership]` |

### 4.4 天盤 丁 (星奇) — S0(pp.112–113)

| pair | 格名 | tier | notes |
|---|---|---|---|
| 丁/戊 | 青龍轉光 | auspicious | 官人升遷，常人威昌 → `favours:[career,launch]` |
| 丁/乙 | **人遁吉格** | auspicious | 貴人加官晉爵；常人婚姻財帛有喜 → `favours:[career,romance,wealth]`. **[S0-INTERNAL]** — conflicts with §5's 人遁. See §5.1 |
| 丁/丙 | 星隨月轉 | auspicious | 貴人越級高升。常人樂極生悲，**要忍** → `favours:[career]` |
| 丁/丁 | 星奇入太陰 | auspicious | 文書證件即至，喜事從心，萬事如意 → `favours:[contract,study]` |
| 丁/己 | 火入勾陳 | inauspicious | 奸私仇冤 → `avoid:[partnership,romance]` |
| 丁/庚 | 文書阻隔 | inauspicious | 庚為阻隔之神 → `avoid:[contract,study,travel]` |
| 丁/辛 | 朱雀入獄 | conditional | 罪人釋囚，官人失位 → `avoid:[career]` |
| 丁/壬 | 干合 (丁壬合) | auspicious | 主貴人恩詔，訟獄公平 → `favours:[career,contract]`. Part of 奇儀相合, §6 |
| 丁/癸 | **朱雀投江** | inauspicious | 文書口舌是非，經官動府，詞訟不利 → `avoid:[contract,study,partnership]`. 主克客 → 應為主 (§7.12) |

### 4.5 天盤 己 (甲戌) — S0(p113)

| pair | 格名 | tier | notes |
|---|---|---|---|
| 己/戊 | 犬遇青龍 | conditional | 門吉為謀望遂意，上人見喜；**若門凶枉費心機** |
| 己/乙 | 墓神不明 / 地戶逢星 | conditional | **宜遁跡隱形為利** → `favours:[secrecy]` |
| 己/丙 | 火悖地戶 | inauspicious | → `avoid:[partnership,romance]` |
| 己/丁 | 朱雀入墓 | minor-inauspicious | 文書詞訟，**先曲後直** → `avoid:[contract]` (delay, not defeat) |
| 己/己 | 地戶逢鬼 | supreme-inauspicious | 百事不遂，**暫不謀為，謀為則凶** → `avoid:[all]` |
| 己/庚 | 刑格返名 | inauspicious | **詞訟先動者不利** → penalise `role==='mover'` (§7.12) |
| 己/辛 | 遊魂入墓 | inauspicious | → `avoid:[launch,construction]` |
| 己/壬 | 地網高張 | inauspicious | 凶 → `avoid:[launch,partnership,romance]` |
| 己/癸 | 地刑玄武 | inauspicious | 有囚獄詞訟之災 → `avoid:[contract,competition]` |

### 4.6 天盤 庚 (甲申) — the obstruction family — S0(p114)

庚 = 阻隔之神 / 道路. This row is the backbone of *avoidance*.

| pair | 格名 | tier | notes |
|---|---|---|---|
| 庚/戊 | 天乙伏宮 | supreme-inauspicious | **百事不可謀，大凶** → `avoid:[all]` |
| 庚/乙 | 太白逢星 | inauspicious | **退吉進凶，謀為不利** → ⚠️ v1 had this as `conditional` "合格". **CORRECTED — S0 offers no gate rescue.** See §4.9 |
| 庚/丙 | 太白入熒 | inauspicious | **為客進利，為主破財** → sign flips on `role`; see §7.12 |
| 庚/丁 | **亭亭之格** | conditional | 起官司是非。**門吉有救，門凶事必凶** → ⚠️ v1 had "破格", `inauspicious`. **CORRECTED — name and conditionality both.** `gateRescue:true` |
| 庚/己 | 官符刑格 | inauspicious | 主有官司口舌 → `avoid:[contract,partnership,launch]` |
| 庚/庚 | 太白同宮 / 戰格 | inauspicious | 官災橫禍，兄弟或同輩朋友相衝撞，**不利為事** → `avoid:[partnership,contract,launch]` |
| 庚/辛 | **白虎干格** | inauspicious | **不宜遠行**，遠行車折馬傷，求財更為大凶 → `avoid:[travel,wealth]`. ⚠️ **NEW — absent from v1 entirely** |
| 庚/壬 | **上格** | inauspicious | 遠行道路迷失，男女音信難通 → `avoid:[travel,contract]`. ⚠️ v1 named this "小格". **CORRECTED to S0.** See §4.9 |
| 庚/癸 | **大格** | supreme-inauspicious | 多主車禍，行人不至，官事不止，**大凶** → `avoid:[travel,launch,partnership,contract]` |

**Chart-context 庚 格 (evaluated against pillars, not static pairs)** — retained from v1, reconfirmed by S0(p136)'s avoid-list:

```ts
export const GENG_OBSTRUCTION_RULES = [
  { id:'sui-ge',    name:'歲格',        when:'天盤庚 over 地盤 = 年干', tier:'inauspicious' },
  { id:'yue-ge',    name:'月格',        when:'天盤庚 over 地盤 = 月干', tier:'inauspicious' },
  { id:'ri-ge',     name:'日格',        when:'天盤庚 over 地盤 = 日干', tier:'inauspicious' },
  { id:'shi-ge',    name:'時格',        when:'天盤庚 over 地盤 = 時干', tier:'inauspicious' },
  { id:'fugong-ge', name:'伏宮格',      when:'天盤庚 over 地盤 = 值符本儀(旬首)', tier:'inauspicious' },
  { id:'feigan-ge', name:'飛干格',      when:'日干 over 地盤庚', tier:'inauspicious' },
  { id:'feigong-ge',name:'飛宮格',      when:'值符(甲/戊) over 地盤庚', tier:'inauspicious' },
] as const;
// All: avoid:['launch','travel','contract','partnership'].
// MITIGATOR: if 值符 shares the palace, damp — S0(p108), §3.3(a).
```

### 4.7 天盤 辛 (甲午) — S0(pp.114–115)

| pair | 格名 | tier | notes |
|---|---|---|---|
| 辛/戊 | 困龍被傷 | inauspicious | **屈抑守分尚可，妄動則帶來禍殃** → `favours:[secrecy]`, `avoid:[launch,expansion,travel]` |
| 辛/乙 | **白虎猖狂** | inauspicious | 家敗人亡，**遠行多災殃** → `avoid:[partnership,contract,travel,launch]`. 客克主 → 利客 (§7.12) |
| 辛/丙 | 干合悖師 | conditional | **門吉則事吉，門凶則事凶** |
| 辛/丁 | 獄神得奇 | auspicious | **經商求財獲利倍增**，囚人逢天赦釋免 → `favours:[wealth,competition]` |
| 辛/己 | 入獄自刑 | inauspicious | 奴僕背主，有苦訴訟難伸 → `avoid:[partnership,contract]` |
| 辛/庚 | 白虎出力 | inauspicious | 刀刃相交，主客相殘。**遜讓退步稍可，強進血濺衣衫** → `avoid:[competition,launch]`; strongly penalise `role==='mover'` |
| 辛/辛 | 伏吟天庭 | inauspicious | 公廢私就，訟獄自罹罪名 → `avoid:[launch,career]` |
| 辛/壬 | 凶蛇入獄 | inauspicious | 訟獄不息，**先動失理** → penalise `role==='mover'` |
| 辛/癸 | 天牢華蓋 | inauspicious | 日月失明，誤入天網，**動止乖張** → `avoid:[launch,travel,contract]` |

### 4.8 天盤 壬 (甲辰) — S0(pp.115–116)

| pair | 格名 | tier | notes |
|---|---|---|---|
| 壬/戊 | 小蛇化龍 | auspicious | 男人發達 → `favours:[career,launch]` |
| 壬/乙 | 小蛇得勢 | auspicious | 男人通達，**祿馬光華** → `favours:[career,travel,wealth]` |
| 壬/丙 | 水蛇入火 | inauspicious | 主官災刑禁，絡繹不絕 → `avoid:[contract,competition]` |
| 壬/丁 | 干合蛇刑 | conditional | 丁壬相合。文書牽連，貴人匆匆 → `avoid:[contract]` |
| 壬/己 | 反吟蛇刑 | inauspicious | 主官訟敗訴。**順守可吉，妄動必凶** → `favours:[secrecy]`, `avoid:[launch,competition,expansion]` |
| 壬/庚 | 太白擒蛇 | auspicious | **刑獄公平，立剖邪正** → `favours:[competition]` (litigation/adjudication) |
| 壬/辛 | 螣蛇相纏 | inauspicious | **縱得吉門亦不能安寧**，若有謀望被人欺瞞 → `avoid:[partnership,contract]`. NB: explicitly *not* rescuable by a 吉門 |
| 壬/壬 | 蛇入地羅 | inauspicious | 外人纏繞，內事索索。**吉門吉星庶免蹉跎** → `gateRescue:true` |
| 壬/癸 | 幼女奸淫 | inauspicious | **門吉星凶，易反福為禍** → `avoid:[romance,partnership]` |

### 4.9 天盤 癸 (甲寅) — S0(p116)

| pair | 格名 | tier | notes |
|---|---|---|---|
| 癸/戊 | 天乙會合 | conditional | 戊癸相合。**吉門宜求財，婚姻喜美，吉人贊助成合；若門凶迫制，反禍官非** → `favours:[wealth,romance,partnership]` when gate is 吉 |
| 癸/乙 | 華蓋逢星 | conditional | 貴人祿位，常人平安。**門吉則吉，門凶則凶** |
| 癸/丙 | 華蓋悖師 | inauspicious | 貴賤逢之皆不利，惟上人見喜 → `avoid:[launch,wealth]` |
| 癸/丁 | **螣蛇夭矯** | inauspicious | 文書官司，火焚也逃不掉 → `avoid:[contract,partnership,wealth]`. ✅ **Confirms the v1 §4.4 丙/丁 typo correction — drop the ⚠️** |
| 癸/己 | 華蓋地戶 | conditional | 音信皆阻。**此格躲災避難方為吉** → `favours:[secrecy]`, `avoid:[contract,travel]` |
| 癸/庚 | 太白入網 | inauspicious | 主以暴力爭訟，自罹罪責 → `avoid:[competition,contract]` |
| 癸/辛 | **網蓋天牢** | inauspicious | 主官司敗訴，死罪難逃 → `avoid:[contract,partnership,competition]` |
| 癸/壬 | 復見螣蛇 | inauspicious | → `avoid:[romance,partnership]` |
| 癸/癸 | **天網四張** | supreme-inauspicious | 主行人失伴，病訟皆傷 → `avoid:[launch,travel,contract,partnership,competition]` |

**Internal consistency check passed.** The 癸 row and column here match v1 §4.4's `GUI_OVER` / `OVER_GUI` tables (transcribed independently from S0 p132) on all 16 overlapping entries. Two independent transcriptions of the same book agreeing is a genuine check, not a coincidence — treat the 癸 rows as high-confidence.

### 4.10 v1 → v2 divergences requiring a note

| Pair | v1 (from S27, a web source) | v2 (from S0, primary) | Resolution |
|---|---|---|---|
| 庚/壬 | 小格 | **上格** | S0 wins. "小格" may be a real term elsewhere in the 大/小/刑格 family (S0 p136 lists all three) but S0 does not attach it to 庚/壬. Keep 上格; leave 小格 unmapped. |
| 庚/丁 | 破格, `inauspicious`, 出行用兵大凶 | **亭亭之格**, `conditional`, 門吉有救 | S0 wins on both name and tier. v1's "奇格 = 庚加三奇" framing (S0 p128) still holds as a *family label*; the per-pair tiers come from pp.110–116. |
| 庚/乙 | 合格, `conditional` (乙庚合 rescue) | **太白逢星**, `inauspicious`, no rescue | ⚠️ **[S0-INTERNAL]** — S0(p128) does treat 庚加乙 as 合格 within 奇格; S0(p114) gives 太白逢星 退吉進凶. Reconciliation: the 合 is real but does **not** neutralise the 庚 obstruction. **Ruling applied: `inauspicious`, with the §6 `qiyi-xianghe` rule able to lift it to `conditional` only when a 三吉門 is present.** Reversible in one line. |

---

## 5. 九遁 — the Nine Concealments [CONSENSUS on the set; S0-INTERNAL on three triggers]

```ts
export const PATTERNS_CONCEALMENT: PatternRule[] = [
  {
    id:'tian-dun', name:'天遁', nameEn:'Heaven Concealment',
    tier:'supreme-auspicious', scope:'palace', confidence:'consensus',
    when:{ door:'生門', tianPanStem:'丙', diPanStem:'丁' },
    // ✅ RULING N1 (Joe): follow p123 — NARROW trigger, 生門 only.
    //    S0(p112) 十干克應 says 丙加丁…得三吉門為天遁 (any 三吉門). NOT used.
    //    Rationale: p123 is the 格局 (selection) chapter; p112 is 十干克應 (forecast).
    //    Per §0.1 the selection chapter governs. This is also the stricter reading.
    interpretation:'月精之蔽. 二奇並生門, 二火生艮土 — obstacles dissolve, 百事生旺.',
    guidance:{ favours:['launch','career','wealth','partnership','expansion'], avoid:[] },
    source:'S0(p123)',
  },
  {
    id:'di-dun', name:'地遁', nameEn:'Earth Concealment',
    tier:'supreme-auspicious', scope:'palace', confidence:'consensus',
    when:{ door:'開門', tianPanStem:'乙', diPanStem:'己' },
    // ✅ RULING N1 (Joe): follow p123 — NARROW trigger, 開門 only.
    //    S0(p111) 十干克應 allows 生門 or 開門. NOT used, same rationale as 天遁.
    interpretation:'日精之蔽 (己=地戶, 開門得日精). Cover for hidden/foundational work.',
    guidance:{ favours:['construction','secrecy','launch','wealth'], avoid:[] },
    notes:'NB the underlying pair 乙/己 is 日奇入墓 (§4.2, 凶). The 吉門 is what converts it. Without 生/開門 it reads 凶.',
    source:'S0(p111,p123)',
  },
  {
    id:'ren-dun', name:'人遁', nameEn:'Human Concealment',
    tier:'supreme-auspicious', scope:'palace', confidence:'consensus',
    when:{ door:'休門', tianPanStem:'丁', spirit:'太陰' },
    interpretation:'星精之蔽. 探密/伏藏/和談/求賢/結婚/交易.',
    guidance:{ favours:['wealth','partnership','romance','career','secrecy'], avoid:[] },
    source:'S0(p123)',
  },
  {
    id:'ren-dun-jige', name:'人遁吉格', nameEn:'Human Concealment (stem form)',
    tier:'auspicious', scope:'palace', confidence:'s0-internal',
    when:{ tianPanStem:'丁', diPanStem:'乙' },
    // ⚠️ NEW in v2. S0(p112) names 丁加乙 "人遁吉格" outright, with no gate or deity.
    //    Kept SEPARATE from ren-dun rather than merged: the two triggers share no field.
    interpretation:'貴人加官晉爵；常人婚姻財帛有喜.',
    guidance:{ favours:['career','romance','wealth'], avoid:[] },
    notes:'De-dupe with ren-dun in scoring: if both fire on one palace, count the higher once.',
    source:'S0(p112)',
  },
  {
    id:'shen-dun', name:'神遁', tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ door:'生門', tianPanStem:'丙', spirit:'九天' },
    interpretation:'宜攻虛/開路/造像/教化 — bold, high-visibility advance.',
    guidance:{ favours:['expansion','launch','career'], avoid:[] }, source:'S0(p123)',
  },
  {
    id:'gui-dun', name:'鬼遁', tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ any:[{door:'杜門',tianPanStem:'丁',spirit:'九地'},
                {door:'開門',tianPanStem:'丁',spirit:'九地'}] },
    interpretation:'宜偷營劫寨/設偽伏虛 — covert ops, feints.',
    guidance:{ favours:['secrecy','competition'], avoid:[] }, source:'S0(p123-124)',
  },
  // Four 乙-奇 concealments — unchanged from v1; rare in a business calendar.
  { id:'feng-dun', name:'風遁', tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'乙', door:['開門','休門','生門'], palaceIndex:4 },
    guidance:{ favours:['travel','competition','launch'], avoid:[] }, source:'S0(p123)' },
  { id:'yun-dun', name:'雲遁', tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'乙', door:['開門','休門','生門'], diPanStem:'辛' },
    guidance:{ favours:['construction','secrecy'], avoid:[] }, source:'S0(p123)' },
  { id:'long-dun', name:'龍遁', tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ tianPanStem:'乙', door:['開門','休門','生門'], any:[{palaceIndex:1},{diPanStem:'癸'}] },
    guidance:{ favours:['construction','competition'], avoid:[] }, source:'S0(p123)' },
  { id:'hu-dun', name:'虎遁', tier:'auspicious', scope:'palace', confidence:'consensus',
    when:{ any:[{tianPanStem:'乙',door:['休門','生門'],diPanStem:'辛',palaceIndex:8},
                {tianPanStem:'庚',door:'開門',palaceIndex:7}] },
    guidance:{ favours:['construction','secrecy'], avoid:[] }, source:'S0(p123)' },
];
```

### 5.1 ⚠️ The 九遁 internal-conflict ruling

S0 describes 天/地/人遁 in **two chapters with different triggers**. This is not OCR noise — it is two levels of description in the same book.

| | 第四章 格局 chapter, p.123 (v1's source) | 第五章 十干克應, pp.111–112 |
|---|---|---|
| 天遁 | 生門 + 丙 + 丁 | 丙加丁 + **any 三吉門** |
| 地遁 | 開門 + 乙 + 己 | 乙加己 + **生門 or 開門** |
| 人遁 | 休門 + 丁 + 太陰 | **丁加乙** (no gate, no deity) |

**✅ RULING N1 (Joe, resolved): follow p123. Narrow triggers throughout.**

天遁 = 生門 + 丙 + 丁. 地遁 = 開門 + 乙 + 己. Both encoded above. The 十干克應 broadenings (any 三吉門 / 生門-or-開門) are **recorded but not used**.

This is the triage rule of §0.1 applied consistently: p.123 sits in the 格局 chapter that feeds selection; pp.111–112 sit in 十干克應, which is forecast material from which only names, valences and conditionality may be imported. Where the two give different *triggers* for the same 格, the selection chapter governs. It is also the stricter reading, which is the right default for a tool whose promise is accuracy.

**人遁 remains a special case.** 丁加乙 (p112) and 休門+丁+太陰 (p123) share no field, so they cannot be merged. Under N1 the p123 form is the canonical 人遁; the p112 form is retained as a **separate, lower-tier** rule (`ren-dun-jige`, `auspicious` rather than `supreme-auspicious`) because it is a genuine named 吉格 in its own right — 貴人加官晉爵 — not merely a loose restatement. De-dupe in scoring: if both fire on one palace, count the higher once. If you would rather drop `ren-dun-jige` entirely for strict consistency with N1, delete the rule object — nothing else references it.

---

## 6. 三奇 auspicious structures

Unchanged from v1 except where noted. Retained: `sanqi-shengdian` (乙→3/丙→9/丁→7), `qiyou-luwei` (乙→3/丙→4/丁→9 + 三吉門), `yunü-shoumen` (地盤丁 + 值使門), `sanqi-deshi` (奇 + 值使門), `san-zha-zhen/zhong/xiu` (三吉門+三奇+太陰/九地/六合), `sanqi-zhiling`, `huanyi`, `tianxian-shige` (hour stem 甲 → suppresses 伏吟).

**Updated — `qiyi-xianghe` (奇儀相合)** [CONSENSUS, now with a second citation]. S0(p137) restates it inside the *selection* chapter, which raises its confidence and fixes the pair list:

> 天盤乙奇臨地盤六庚，乙庚合；天盤丙奇臨地盤六辛，丙辛合；天盤丁奇臨地盤六壬，丁壬合；天盤值符（甲子戊）臨地盤六己，甲己合；天盤六戊臨地盤六癸，戊癸合，則成和解之象。如果打仗，雙方可能議和，比賽成平局，詞訟可能私下了結。

```ts
{
  id:'qiyi-xianghe', name:'奇儀相合', tier:'conditional', scope:'palace', confidence:'consensus',
  when:{ stemPairIsHe:true, alsoDoor:['開門','休門','生門'] },
  interpretation:'乙庚 · 丙辛 · 丁壬 · 甲己 · 戊癸 — 成和解之象. 議和/平局/私下了結. Settlement, splitting the difference, closing out.',
  guidance:{ favours:['partnership','contract','romance'], avoid:[] },
  notes:'INTERACTIONS: (a) 乙/庚 is also 日奇被刑 (§4.2) AND 太白逢星 (§4.6) — with a 三吉門 read the 合; without, the 凶 dominates. (b) 丙/辛, 丁/壬, 戊/癸 already carry positive entries in §4 — count once, do not stack. (c) 和解 is a CLOSING energy: it favours settlement, NOT launch or expansion.',
  source:'S0(p126,p137)',
}
```

**Unchanged: 五假 (§6.1)** — 天/地/人/神/鬼假, all `tier:'conditional'`, all void if the palace is 門迫 or 入墓 (五假忌迫墓). Do not boost these in business presets.

---

## 7. Structural conditions

### 7.1 五不遇時 — CHART-SCOPE VETO [CONSENSUS; severity ruled by Joe]

時干剋日干, same polarity (陽剋陽/陰剋陰). S0(p135), *selection chapter*: 從時間選擇上，要盡量避開五不遇時和時干入墓的方位…所謂五不遇時，就是時干剋日干的時辰，而且是陽剋陽、陰剋陰，所以主凶.

```ts
export const WU_BU_YU_TABLE = {
  甲:'庚午時', 乙:'辛巳時', 丙:'壬辰時', 丁:'癸卯時', 戊:'甲寅時',
  己:'乙丑時', 庚:'丙子時', 辛:'丁酉時', 壬:'戊申時', 癸:'己未時',
} as const;
// ✅ Table now confirmed verbatim TWICE in S0 (p133 and p135), including 壬日戊申時.
// This validates the original 五鼠遁 derivation over the S19 web typo (戊午時).
```
**✅ Modelling ruling (Joe): `chartBlocked = true`. The entire 時辰 is unusable.** All nine palaces return `blocked`, the hour is excluded from search results, and no 吉格 lifts it.

Justification under §0.1: p133 (不一定都凶) is the 凶格 *definitional* chapter; p135 is the *selection* chapter and is unambiguous — 要盡量避開…所以主凶 and 正是奇門擇時最忌諱的五不遇時. Selection governs. S0's own worked example (p135–136) is a 1995 satellite launch scheduled in a 丁日癸卯時 五不遇時, from which he called failure; the launch exploded. That is the source treating it as disqualifying, not as a caution.

**Frequency check for the implementation:** each 日干 has **exactly one** 五不遇 hour, so this removes precisely **1 時辰 in 12 (8.3%)**. If your distribution run shows materially more or fewer, the polarity test is wrong.

### 7.2 六儀擊刑 — ABSOLUTE VETO [CONSENSUS]

```ts
export const LIU_YI_JI_XING: Record<Jiaxun, PalaceIndex> = {
  甲子:3, 甲戌:2, 甲申:8, 甲午:9, 甲辰:4, 甲寅:4,
}; // 戊→3震(子刑卯) · 己→2坤(戌刑未) · 庚→8艮(申刑寅) · 辛→9離(午自刑) · 壬→4巽(辰自刑) · 癸→4巽(寅刑巳)
```
Unchanged. Reconfirmed in S0(p136)'s direction avoid-list.

### 7.3 三奇入墓 — STRONG VETO [CONFIRMED — Joe]

```ts
export const SANQI_RUMU: Record<'乙'|'丙'|'丁', PalaceIndex[]> = {
  乙: [2, 6],  // 坤(未) AND 乾(戌) — both valid per domain-expert ruling
  丙: [6],     // 乾(戌)
  丁: [8],     // 艮(丑)
};
```
Unchanged from v1. **Corroborated in v2** by S0(p137): 乙奇…如臨乾六宮，不僅受乾金之剋，而且入戌墓，乙奇自然也就不奇了 — the 乾6 tomb for 乙 is stated in the *selection* chapter, which is the stronger register.

### 7.4 ⚠️ 門宮關係 — CORRECTED. 生 relations AMPLIFY, they do not mitigate.

**This is the largest correction in v2.** v1's effect table had 和/義 "mildly easing a 凶門." S0 says the opposite, in the same passage that defines the terms:

> 古人又把門生宮稱作「和」，宮生門稱作「義」。門宮相生，對於吉門來說自然為好，等於好上加好；**但是對於凶門來說，如果受生，更加旺相，那就凶上加凶了**。所以，不能一般認為，相生就好，相剋就不好，必須具體情況具體分析，而且還要根據季節論其旺相休囚。 — S0(p103)

The complete specification is the 歌訣 S0 gives verbatim at p100 and glosses at p103:

> 吉門被剋吉不就，凶門被剋凶不起；吉門相生有大利，凶門得生禍難避；吉門剋宮吉不就，凶門剋宮事更凶。

**Every case adjusts magnitude or pushes toward negative. No case flips a sign.**

```ts
const PALACE_ELEM: Record<PalaceIndex, Element> =
  {1:'水',2:'土',3:'木',4:'木',5:'土',6:'金',7:'金',8:'土',9:'火'};
const GATE_ELEM: Record<Door, Element> =
  {休門:'水',生門:'土',傷門:'木',杜門:'木',景門:'火',死門:'土',驚門:'金',開門:'金'};

export function menGongRelation(door: Door, p: PalaceIndex): MenGongRelation | null {
  if (p === 5) return null;                       // 中宮 by convention, not 迫
  const g = GATE_ELEM[door], q = PALACE_ELEM[p];
  if (controls(g, q))   return '迫';   // 門剋宮
  if (controls(q, g))   return '制';   // 宮剋門
  if (generates(g, q))  return '和';   // 門生宮
  if (generates(q, g))  return '義';   // 宮生門
  return '比和';
}
// Resulting palace sets (computed, retained from v1 — 中5 excluded per the 歌訣
// "驚開三四休臨九，傷杜還歸二八宮；生死排來居第一，景門六七總相同"):
//   門迫 (門剋宮): 開/驚(金)→[3,4] · 生/死(土)→[1] · 休(水)→[9] · 傷/杜(木)→[2,8] · 景(火)→[6,7]
//   宮制 (宮剋門): 開/驚(金)→[9] · 生/死(土)→[3,4] · 休(水)→[2,8] · 傷/杜(木)→[6,7] · 景(火)→[1]
```

**Corrected effect table:**

| Relation | 歌訣 line | 吉門 | 凶門 | Operation |
|---|---|---|---|---|
| **和** (門生宮) | 吉門相生有大利 / **凶門得生禍難避** | good → better | bad → **worse** | `v * (1 + k_sheng)` — **amplify magnitude, preserve sign** |
| **義** (宮生門) | same | good → better | bad → **worse** | same as 和 |
| **制** (宮剋門) | 吉門被剋吉不就 / 凶門被剋凶不起 | good → muted | bad → **suppressed (protective)** | `v * (1 - k_zhi)` — **damp magnitude, preserve sign** |
| **迫** (門剋宮) | 吉門剋宮吉不就 / 凶門剋宮事更凶 | good → muted | bad → **worse** | asymmetric: `v>0 ? v*(1-k_po) : v*(1+k_po)` — **pushes negative both ways** |
| **比和** | — | neutral | neutral | unchanged |

```ts
function applyMenGong(v: number, rel: MenGongRelation | null): number {
  switch (rel) {
    case '和':
    case '義': return v * (1 + K_SHENG);                  // amplify |v|, sign preserved
    case '制': return v * (1 - K_ZHI);                    // damp |v|, sign preserved
    case '迫': return v > 0 ? v * (1 - K_PO) : v * (1 + K_PO); // toward negative
    default:   return v;
  }
}
// K_SHENG, K_ZHI, K_PO are ENGINEERING PARAMETERS in scoring.ts.
// The DIRECTION of each is traditional; the magnitude is not.
```

**The valuable non-obvious payoff is unchanged and now better grounded: 宮制 on a 凶門 is a *good* sign** (凶不起). Surface it as its own badge so the day panel can explain why a 死門/驚門 direction isn't as bad as it looks.

**Discarded reading, recorded for audit:** S0(p141) quotes 《奇門遁甲秘籍大全》 as 凡門生宮、宮生門吉，門剋宮、宮剋門凶 — i.e. *any* 剋 is bad, including 宮剋門. That is a **forecast-chapter** quotation of a *different* text. Zhang's own selection-chapter commentary (p103, p137) governs. No ruling needed.

### 7.5 空亡 (Void) [CONSENSUS]

時空 computed from the **hour pillar's 旬** (architecture Bug 3), not the day void. A void palace = 不實/徒勞 — strongly downgrades anything that must materialise (contracts, launches); sometimes *desirable* for escaping a bad matter or lying low. Per-palace flag + score modifier, not a veto.

### 7.6 伏吟 / 反吟 [CONSENSUS, reinforced S0(pp.131,139)]

```ts
export const REPETITION_RULES = [
  { id:'fu-yin', name:'伏吟', tier:'inauspicious',
    interpretation:'利主不利客; 主遲/主慢. S0(p139) selection chapter: 伏吟格，就應按兵不動，以逸待勞.',
    guidance:{ favours:['secrecy'], avoid:['launch','travel','expansion','competition'] },
    exception:'天顯時 (§6 tianxian-shige, hour stem 甲): suppress the penalty entirely.',
    source:'S0(p131,p139)' },
  { id:'fan-yin', name:'反吟', tier:'inauspicious',
    interpretation:'利客不利主; 主快; 主事反覆. S0(p139): 反吟格，就應主動出擊.',
    guidance:{ favours:['competition'], avoid:['launch','contract','partnership','construction'] },
    source:'S0(p131,p139)' },
];
```
**Upgraded in v2:** the 主/客 hook is no longer an inference — S0(p139) states both prescriptions in the *selection* chapter. See §7.12.

### 7.7 時干入墓 [CONSENSUS, reconfirmed S0(p135)]

S0(p135), selection chapter, with worked examples: 丙戌時，時干丙落入六宮戌墓之方；丁丑時，時干丁落入8宮丑墓之方；壬辰時，時干壬落入4宮辰墓之方；癸未時，時干癸落入2宮未墓之方.

```ts
export const STEM_TOMB: Record<Stem10, PalaceIndex> = {
  甲:2, 乙:6, 丙:6, 丁:8, 戊:6, 己:8, 庚:8, 辛:4, 壬:4, 癸:2,
};
```
Verified against all four S0 examples. **Palace-scope hard exclusion** (§2.2), not a chart-scope one. S0 calls it a **方位** problem — 時干入墓方位 — which fits the per-palace model exactly: it disqualifies *that direction*, and the other eight directions in the same hour remain available. Contrast 五不遇時 (§7.1), which takes the whole hour.

### 7.8 ⚠️ 三奇受制 — EXTENDED with a gate axis

v1 tested palace element and 地盤干 only. S0(p137) adds the **gate** as a controlling agent, and describes compounding:

> 乙奇屬木，宜遇休門（屬水）及臨坎、震、巽3宮，這樣水能生木或同類比和…乙奇能夠發揮它的作用；**如果遇開門，則受金之剋**，如臨乾六宮，**不僅受乾金之剋，而且入戌墓**，乙奇自然也就不奇了，不能發揮它的作用了。

```ts
const STEM_ELEM: Record<Stem, Element> =
  { 乙:'木', 丙:'火', 丁:'火', 戊:'土', 己:'土', 庚:'金', 辛:'金', 壬:'水', 癸:'水' };

export function sanQiControlled(o: {stem:Stem; palace:PalaceIndex; diPanStem:Stem; door:Door}) {
  if (!['乙','丙','丁'].includes(o.stem)) return { controlled:false, nullified:false };
  const e = STEM_ELEM[o.stem];
  const byPalace = controls(PALACE_ELEM[o.palace], e);
  const byStem   = controls(STEM_ELEM[o.diPanStem], e);
  const byGate   = controls(GATE_ELEM[o.door], e);        // ⚠️ NEW AXIS in v2
  const inTomb   = SANQI_RUMU[o.stem]?.includes(o.palace) ?? false;
  const count    = [byPalace, byStem, byGate].filter(Boolean).length;
  return {
    controlled: count > 0,
    // COMPOUNDING: 受剋 + 入墓 reads as full nullification (奇也就不奇了),
    // NOT two additive penalties. S0(p137).
    nullified: (count > 0 && inTomb) || count >= 2,
  };
}
// When nullified: treat the 奇 as ABSENT for the base filter (§8.1) — the palace
// does not count as 得奇 — and zero any 奇-dependent formation bonus in that palace.
// De-dupe with named 凶格 (e.g. 乙/辛 青龍逃走) — count the 凶格 once, not twice.
```

**Corollary, also new:** the positive case is stated too — 乙奇 with 休門 or in 坎1/震3/巽4 is **empowered**. Worth a small positive modifier, symmetric with the negative. Same logic extends to 丙/丁 (火) with 景門 or in 震3/巽4/離9.

### 7.9 悖格 (the 丙 family) — unchanged from v1

丙 = 天威, volatile. 悖格(丙+值符/年干/月干/日干/時干) → 多倒行逆施/綱紀紊亂. **Rescue:** a 三吉門 in the palace prevents the pure-凶 reading (丙 is a 奇). Now cross-confirmed by §4.3's 丙/丙 月奇悖師 and 丙/癸 華蓋悖師.

### 7.10 Severity summary

```
CHART-SCOPE VETO (whole 時辰 out):       五不遇時                      ⬅ ruled by Joe
ABSOLUTE VETO (palace blocked):         六儀擊刑
STRONG VETO (palace blocked):           三奇入墓                      (nullifying)
HARD EXCLUSION (palace, S0 p136 list):  時干入墓, 三奇受制(nullified),
                                        年/月/日/時格, 大格/上格/刑格,
                                        飛干格, 伏宮格, 飛宮格
HEAVY PENALTY (score, not block):       反吟, 伏吟(unless 天顯時), 悖格, 空亡, 門迫(凶門)
MITIGATOR (positive on a 凶門):          宮制 (凶不起) · 值符同宮 damps 庚 (§3.3a)
AMPLIFIER (negative on a 凶門):          和/義 (凶門得生禍難避) ⚠️ CORRECTED v2
```

### 7.11 ⭐ NEW — 旺相休囚 (vitality). Mandated, not optional.

S0 makes this a **requirement** of selection, not a refinement:

> 但運用時還必須看臨何宮以及旺相休囚。 — p100
> 擇時擇方必須綜合運用，門、奇、星、儀是吉是凶，還必須結合節令和所臨宮位看其旺相休囚。 — p137

**The governing principle (selection chapter, p137) — magnitude scaling, never sign flip:**

> 生門…**得時又得地，為旺相，才是真正的吉**。如果生門臨震3宮、巽4宮，木來剋土，生門受制，或臨冬十月、十一月，秋七月、八月，土逢休囚之時，**則吉門也就不吉了**。
> 相反，**凶門如果得時得地則為真正的凶**，如逢休囚死衰之時之地，**則凶門也就不能逞凶了**。
> 九星旺相時節，稱為有氣，吉者為吉，凶者為凶；如果逢休囚衰廢季節，則無氣，**吉凶程度都大大減低**。

**Two axes, both required.** 得時 (vs 月令) and 得地 (vs 宮位). S0's worked example: 生門 is 得地 in 艮8/坤2/離9 (土宮, or 火生土) and 得時 in 立春→春分前45天 or 四季月 (辰/未/戌/丑 土旺之月).

```ts
// ── 八門 / 三奇六儀: standard 五行 relation on BOTH axes ────────────────
//    生我 or 比和 → 得 ;  剋我 or 我剋(洩) → 不得
//    得時 + 得地 → 旺 · one only → 相 · neither, 洩 → 休 · 剋我 one axis → 囚 · both → 死

// ── 九星: NON-STANDARD relation set. S0(p106) verbatim: ─────────────────
//    "九星的旺相休囚與五行的旺相休囚不一致。九星是：我生之月最旺，
//     與我五行相同的月份為相（次旺），我剋月建五行時為休，
//     月建五行生助我的時候為廢，月建五行剋我時為囚。"
export const STAR_VITALITY: Record<Relation, StarVitality> = {
  'I-generate':      '旺',   // 我生月令 — most powerful
  'same':            '相',   // 比和 — 次旺
  'I-control':       '休',   // 我剋月令 — 休於財
  'generates-me':    '廢',   // 月令生我 — 廢於父母
  'controls-me':     '囚',   // 月令剋我 — 囚於鬼
};
// ⚠️ THE FIFTH STATE IS 廢, NOT 死. S0(p107) is emphatic:
//    "九星卻叫旺、相、休、囚、廢，即它們最多不起作用，而絕對不會『死』,
//     因為九星一直在天上運行" — a star can be inert; it cannot die.
//    Use StarVitality, not GateVitality, for 九星. Do not share one enum.

// ── 八神: NO vitality. 第五節 gives them no 五行旺衰 treatment. Carry null.
```

**Amplitude — one column, applied to |valence|, sign preserved:**

```ts
export const AMPLITUDE: Record<Vitality, number> = {
  旺: 1.30,  相: 1.15,  休: 0.80,  囚: 0.60,  死: 0.45,  廢: 0.45,
};
// STRONG 吉 = 真正的吉 · STRONG 凶 = 真正的凶
// WEAK   吉 = 吉門也就不吉了 · WEAK 凶 = 凶門也就不能逞凶了
// ⚠️ v1's palace-direction-model had a TWO-column table with 旺 → ×0.55 on the
//    inauspicious row ("strong 凶 is less bad"). That is INVERTED and is deleted.
//    Direction is traditional (S0 p137); the curve is an engineering parameter.
```

**✅ RULING R7-b (Joe, resolved): follow the book. 九星 vitality is judged on 月令 only — ONE axis.**

The book states one rule for stars and states it once, at p106, in terms of 月建 (the month): 我生之月最旺…與我五行相同的月份為相…我剋月建五行時為休…月建五行生助我的時候為廢…月建五行剋我時為囚. Every worked example in the surrounding passage is month-driven (天蓬水星 相 in 亥/子 水月; 旺 in 正/二月 木旺; 廢 in 七/八月 金旺; 囚 in 辰未戌丑 土月). p107's "對地盤宮的影響" framing is the book's *explanation* of why the rule takes that shape, and in the same paragraph it explicitly equates the two — 它們處在被地盤宮五行生助的時候，**即季節月令五行生助它們的時候**. It is one variable described two ways, not two axes.

The palace-driven star readings (天芮落乾兌為旺 etc., pp.104–107) sit in the forecast chapter and are excluded by §0.1 anyway.

```ts
// 九星: ONE axis — 月令. Non-standard relation set, per S0(p106).
export function starVitality(star: Star, monthElement: Element): StarVitality {
  return STAR_VITALITY[relation(STAR_ELEM[star], monthElement)];
}
// 八門 / 三奇六儀: TWO axes — 得時 (月令) AND 得地 (宮位), standard 五行 relation,
// per S0(p137)'s explicit 生門 worked example. Unchanged.
```

**Where the palace still matters for a star — and it does — the book gives it a different home.** 星宮生剋 is stated plainly at S0(p139) as a **主客** rule, not a vitality rule: 天盤星生地盤宮則利主…宮剋星則利主. That is already implemented in §7.12. So the star–palace relation is not lost; it is routed to the mechanism the book actually assigns it to, instead of being duplicated as an invented second vitality axis.

*Reading flagged: "follow the book" could alternatively have meant applying the p106 relation set to both axes, on the strength of p137's blanket 結合節令和所臨宮位看其旺相休囚. I have read it as "implement only what the text states," which for 九星 is the single 月令 rule. If you meant the two-axis version, it is a one-line change in `starVitality()`.*

**Explicitly excluded from v2 for methodological reasons:** the 天芮落乾兌為旺「不能治」 passage (pp.104–107). That is a 斷病 statement — it says a *diagnosed illness is incurable*, not that the *hour is worse to act in*. Per §0.1 it must not set a selection multiplier. The vitality direction above rests entirely on p137, which is selection-chapter and unambiguous.

### 7.12 ⭐ NEW — 主客 (initiator vs holder). Partly chart-computable.

The date-search plan has `role: 'host' | 'mover'` as pure user input. S0(pp.138–139), *selection chapter*, makes much of it derivable.

```ts
// (1) 定義 — S0(p138): 五條原則
//   動者為客，靜者為主 · 先動者為客，後動者為主 · 積極主動為客，消極固守為主
//   天盤為客，地盤為主 · 遠者為客，近者為主

// (2) 以時辰而論 — S0(p139). CHART-DERIVED, no user input needed:
//   五陽時 (甲乙丙丁戊) → 利客: 打仗宜主動出擊；日常適宜遠行、求財、上任、遷徙、嫁娶、起造
//   五陰時 (己庚辛壬癸) → 利主: 宜按兵不動，後發制人；商戰宜採取守勢，等待時機
export function roleFavouredByHour(hourStem: Stem10): 'mover' | 'host' {
  return ['甲','乙','丙','丁','戊'].includes(hourStem) ? 'mover' : 'host';
}

// (3) 按格局 — S0(p139):
//   白虎猖狂 (辛/乙), 螣蛇夭矯 (癸/丁)  → 客剋主 → 不利主而利客
//   青龍逃走 (乙/辛), 朱雀投江 (丁/癸)  → 主剋客 → 雖為凶格卻是為主不害，應該為主
//   伏吟格 → 按兵不動，以逸待勞 (host)   ·  反吟格 → 主動出擊 (mover)
//   太白入熒 (庚/丙) → 為客進利，為主破財 (S0 p114)
export const ROLE_FAVOURED_BY_FORMATION: Record<string, 'mover'|'host'> = {
  'baihu-changkuang':'mover', 'tengshe-yaojiao':'mover',
  'qinglong-taozou':'host',   'zhuque-toujiang':'host',
  'fu-yin':'host',            'fan-yin':'mover',
  'taibai-ruying':'mover',
};

// (4) 星宮生剋 — S0(p139). ⚠️ ENTIRELY NEW — no 星–宮 relation existed in v1.
//   天盤星生地盤宮 → 利主 · 地盤宮生天盤星 → 利客
//   星剋宮        → 利客 · 宮剋星        → 利主
export function roleFavouredByStarPalace(star: Star, p: PalaceIndex): 'mover'|'host'|null {
  const s = STAR_ELEM[star], q = PALACE_ELEM[p];
  if (generates(s, q)) return 'host';
  if (generates(q, s)) return 'mover';
  if (controls(s, q))  return 'mover';
  if (controls(q, s))  return 'host';
  return null; // 比和 — 做事對雙方都有利
}
```

**Product consequence, and it is a real one:** a slot carrying 青龍逃走 or 朱雀投江 is **not simply unusable** — S0 says 為主不害，應該為主. A binary block/allow model discards that. The direction model should surface such cells as *conditionally usable in the host role* rather than hiding them.

### 7.13 ⭐ NEW — 急則從神 (the emergency direction rule) [S0(p135)]

> 《煙波釣叟歌》中曰：「急則從神緩從門」…如逢急難，宜從值符方下而行…事情危難緊急，沒有選擇三奇和吉門的充裕時間，便可從**天盤值符所在之宮或地盤值符所在之宮**而去，就會比較吉利，沒有什麼大的危險。

```ts
// Cheap to implement, and it is a DIRECTION rule — fits the palace model exactly.
export function emergencyDirections(chart: ChartResult): PalaceIndex[] {
  return [chart.tianPanZhiFuPalace, chart.diPanZhiFuPalace];
}
// UI: an "urgent" toggle that bypasses the whole scoring pipeline and returns these two.
```

### 7.14 ⭐ NEW — 神盤 tactical direction map [S0(p136)]

> 九天所臨之宮宜於為客，可以主動出擊，先發制人；九地所臨之宮宜於為主，可以屯兵固守，以逸待勞；太陰所臨之宮適宜埋伏軍隊，不易被敵人發現；六合所臨之宮，對於逃亡退卻有利。

```ts
export const SPIRIT_TACTICAL: Partial<Record<Spirit, { role:'mover'|'host'; use:string }>> = {
  九天: { role:'mover', use:'主動出擊/先發制人 — initiate, go public, strike first' },
  九地: { role:'host',  use:'屯兵固守/以逸待勞 — hold, consolidate, defend' },
  太陰: { role:'host',  use:'埋伏/不易被發現 — position unseen, prepare quietly' },
  六合: { role:'host',  use:'逃亡退卻有利 — exit, withdraw, disengage cleanly' },
};
// Renders as per-palace guidance text in the direction UI. Also feeds the role weighting.
```

### 7.15 ⭐ NEW — 大事看星 [S0(p140)]

> 凡遇重大事情與行動，除選擇吉利的時間和方位、分清利主利客以外，還必須看九星的吉凶狀態。

Product rule: when the user flags a decision as high-stakes, **raise `CLASS_WEIGHT.star`** and surface star vitality prominently. Not a scoring constant — a mode.

---

## 8. Base filter and activity presets

### 8.1 ⚠️ The usability ladder — TIGHTENED to the strict reading [S0(p136)]

v1 §8's rule-of-thumb was softer than the source. S0 states the ladder explicitly, in the selection chapter:

> 選擇吉方，應避開三奇入墓、六儀擊刑、年、月、日、時格和大、小、刑格及飛干格、伏宮格、飛宮格等凶格，選擇乙、丙、丁三奇與開、休、生三吉門相會的方位，這是最佳的方位。
> 如果只有奇而沒有吉門，這叫**得奇不得門，還不能算吉利方位**。
> 如果只有吉門而沒有奇，叫作**得門不得奇，也算吉利方位，可用。可見吉門比三奇還重要**。
> 如果不得奇又不得吉門，那就不是吉利方向，**但如果逢吉格，也可用；如遇凶格，則不可用**。

```ts
type BaseFilterResult = '吉方' | 'usable' | 'not-auspicious' | '凶方';

export function baseFilter(p: PalaceEval): BaseFilterResult {
  // 五不遇時 is handled upstream as a CHART-SCOPE VETO — the hour never reaches here.
  // Palace-scope preconditions: 三奇入墓 / 六儀擊刑 /
  // 年月日時格 / 大·上·刑格 / 飛干格 / 伏宮格 / 飛宮格
  const hasQi   = p.hasSanQi && !p.sanQiNullified;   // §7.8 nullification applies here
  const hasGate = ['開門','休門','生門'].includes(p.door);

  if (hasQi && hasGate)   return '吉方';            // 最佳
  if (hasGate && !hasQi)  return 'usable';          // 得門不得奇 — 可用
  if (hasQi && !hasGate)  return 'not-auspicious';  // ⚠️ 得奇不得門 — 還不能算吉利方位
  if (p.hasJiGe)          return 'usable';          // ⚠️ NEW 4th rung — 逢吉格也可用
  if (p.hasXiongGe)       return '凶方';
  return '凶方';
}
```

**Two changes from v1**, both material:
1. **得奇不得門 is NOT an auspicious direction.** v1 called it "weak"; S0 says 還不能算吉利方位. This resolves direction-model ruling **R1 in favour of the strict reading**. It shrinks usable inventory — that is the intended, source-faithful behaviour.
2. **A fourth rung exists that v1 omitted:** neither 奇 nor 吉門, **but a 吉格 present → still usable**. A 凶格 present → not.

Both are consistent with §2.1's 吉門比三奇還重要 weighting.

### 8.2 Activity presets

Retained from v1 unchanged in structure (`boost` / `goodGates` / `goodSpirits` / `exclude` per activity, with global vetoes applied to every preset). Three amendments:

- Add to **every** preset's `exclude`: the S0(p136) list — `sui-ge, yue-ge, ri-ge, shi-ge, geng-da-ge, geng-shang-ge, geng-xing-ge, feigan-ge, fugong-ge, feigong-ge`.
- `競爭銷售_competition` and `出行執行_travel` gain a `roleAware: true` flag — §7.12 weighting applies.
- 出行執行_travel gains `avoid:['geng-baihu-gange']` (庚/辛 白虎干格, 不宜遠行) — new in §4.6.

---

## 9. Scoring pipeline — REORDERED

**⚠️ Order change from v1 §9 and from the direction model §3.** Vitality must modulate **symbols**, not formations. S0(p137) applies 旺相休囚 to 門、奇、星、儀 — symbol classes. 格局 are gated by 迫墓擊刑 instead (§9.6), which is a different mechanism.

```
1. BASE VALENCE      gate + star + spirit + stems, weighted by CLASS_WEIGHT   §2.1, §3
2. VITALITY          × AMPLITUDE[level], per symbol class, sign preserved     §7.11
3. MEN-GONG          和/義 amplify · 制 damps · 迫 → negative                  §7.4
4. FORMATIONS        + TIER_WEIGHTS[tier] per matched rule (UNSCALED by 2–3)  §4–§6
                     resolve tier:'conditional' from co-located gate
5. STRUCTURAL        空亡, 伏吟, 反吟, 時干入墓, 三奇受制, 悖格                §7.5–7.9
6. VETO              六儀擊刑 → blocked (absolute)
                     三奇入墓 → blocked (nullifying)
7. SUPREME-GATE      void 青龍返首 / 飛鳥跌穴 if 迫/墓/擊/刑                   §9.6
8. ROLE              apply 主/客 weighting if role is set                     §7.12
9. PROFILE           purpose-mode 用神 weighting                              direction-model §4.2
10. BAND             thresholds → Band
```

**Why steps 2–3 precede 4:** a 旺 生門 in a 和 palace is a *stronger gate*, and the gate's strength is what 天遁 is built on — but 天遁 itself is a named 格 whose weight the tradition states flatly, gated only by 迫墓擊刑. Scaling the formation weight by vitality too would double-count the gate.

**Why 6 must be last-but-three:** nothing may mask a veto. Boosts cannot rescue 六儀擊刑 or 三奇入墓.

---

## 10. Status and remaining open items

### 10.1 ✅ Closed in v2
- Full 十干克應 81 combinations transcribed from a single authority (§4). *v1 §10.2 closed.*
- 門宮 生 relations corrected to amplify (§7.4).
- Vitality layer specified with per-class relation sets and the 廢/死 distinction (§7.11).
- Usability ladder tightened; 4th rung added (§8.1). *Direction-model R1 resolved.*
- 八神 勾陳/朱雀 modelled as nested, toggle deleted (§3.3).
- 天英 downgraded to 中平 (§3.2).
- Symbol-class weighting 門 > 星/奇 > 神 added (§2.1).
- 主客 partly chart-derived; 星宮 relation added (§7.12).
- 急則從神, 神盤 tactical map, 大事看星 added (§7.13–7.15).
- 三奇受制 gains gate axis + compounding nullification (§7.8).
- p.103 vs p.141 apparent contradiction resolved as a chapter-mixing artefact (§0.1).
- 癸 row/column cross-validated against v1's independent transcription of S0 p132.

### 10.2 ✅ Resolved by ruling (2026-07)
- **N1 — 九遁 trigger breadth (§5.1).** Follow p123. Narrow triggers: 天遁 = 生門+丙+丁, 地遁 = 開門+乙+己. 十干克應 broadenings recorded, not used.
- **五不遇時 severity (§7.1, §2.2, §7.10).** Chart-scope veto — the whole 時辰 is unusable, unrescuable. Upgraded from "default-exclude with warning".
- **R7-b — 九星 vitality axis (§7.11).** Follow the book. 月令 only, one axis, p106 relation set. Star–palace relation routed to 主客 (§7.12), where S0(p139) actually assigns it.

### 10.3 ⏳ Still open — needs Joe
1. **庚/乙 (§4.10).** 太白逢星 `inauspicious` applied, with a 吉門-gated lift to `conditional` via 奇儀相合. S0 states both readings in different chapters (p114 vs p128). Lower stakes than N1 — it affects one pair.
2. **人遁 duplication (§5.1).** `ren-dun` (p123, supreme) and `ren-dun-jige` (p112, auspicious) coexist, de-duped in scoring. Keep both, or drop the p112 form for strict N1 consistency?

### 10.4 ⏸ Deliberately deprioritised
**八門克應 (S0 p117+)** — 門加門 (64) + 門加干 (80) + 門加宮. Per §0.1 this is a 斷卦 registry (主貴人寶物財喜 / 主破財失物難尋). It contributes little beyond 門宮 relations for action selection. **Downgraded from v1's assessment.** Revisit only if a 斷卦/reading feature is ever built.

### 10.5 Display-only, never scored
地盤八神 (§3.3b) — may be rendered in the palace cell per architecture §10.6, must not enter scoring.

### 10.6 Pages not yet seen
101–102, 105, 118–134. The individual 開/休/生/傷/杜門 entries and the bulk of 八門克應 sit there. Only relevant if §10.4 is revisited.

---

## 11. Sources

- **S0 (PRIMARY)** 张志春《神奇之门》，中编「数理奇门的基础知识」. Pages verified in hand for v2: **100, 103, 104, 106–117, 135–141, 144–145**; plus pp.123–133 from the v1 pass. Page refs inline as S0(p###). Authoritative; supersedes web sources on conflict. **Chapter class matters — see §0.1.**
- S2–S36 as listed in v1 §11 (retained). Where a v1 entry sourced only to a web reference now conflicts with S0, S0 governs and the divergence is recorded in §4.10.

*Provenance note: v2's §4 table was transcribed from page images of S0 pp.110–116. Portions of pp.113–116 are partly obscured by hand/shadow in the source images; where a clause was illegible it was omitted rather than reconstructed. The 格局 names and tier-bearing clauses were legible throughout. Independent cross-check: the 癸 row and column agree with the v1 transcription of S0 p132 on all 16 overlapping entries.*
