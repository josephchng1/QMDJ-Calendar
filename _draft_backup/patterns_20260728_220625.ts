// ─────────────────────────────────────────────────────────────────────────────
// 格局 REGISTRY — authoritative pattern data for date/time selection.
//
// Transcribed from `qmdj-formations-registry.md` (§3–§6), which is itself sourced
// to 张志春《神奇之门》(S0) and cross-checked. This file is DATA ONLY — the `when`
// clauses are interpreted by evaluator.ts (Phase 1); the structural "harm"
// predicates (六仪击刑 / 三奇入墓 / 门迫 …) live in structural.ts.
//
// TOKENS ARE SIMPLIFIED to match the vendored engine's board vocabulary exactly:
//   gates  休门 生门 伤门 杜门 景门 死门 惊门 开门
//   stars  天蓬 天芮 天冲 天辅 天禽 天心 天柱 天任 天英
//   gods   值符 腾蛇 太阴 六合 白虎 玄武 九地 九天   (variant: 勾陈 朱雀)
//   stems  甲乙丙丁戊己庚辛壬癸   (甲 never on the plate — 戊 doubles as hidden 甲)
// The registry doc is written in TRADITIONAL forms; every token below is the
// simplified equivalent the engine actually emits (see board.ts / qmdata.ts).
// ─────────────────────────────────────────────────────────────────────────────

export type Stem = '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type Wonder = '乙' | '丙' | '丁'; // 三奇
export type PalaceIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Door = '休门' | '生门' | '伤门' | '杜门' | '景门' | '死门' | '惊门' | '开门';
export type Star =
  | '天蓬' | '天芮' | '天冲' | '天辅' | '天禽' | '天心' | '天柱' | '天任' | '天英';
export type Spirit =
  | '值符' | '腾蛇' | '太阴' | '六合' | '白虎' | '玄武' | '九地' | '九天'
  | '勾陈' | '朱雀';

export type Tier =
  | 'supreme-auspicious'   // 大吉
  | 'auspicious'           // 吉
  | 'minor-auspicious'     // 小吉
  | 'neutral'              // 平 / 中性
  | 'conditional'          // 门吉则吉、门凶则凶 — resolved by the co-located gate
  | 'minor-inauspicious'   // 小凶
  | 'inauspicious'         // 凶
  | 'supreme-inauspicious';// 大凶

export type Confidence = 'consensus' | 'variant' | 'derived';

// Activity presets (§6.3 / §8). A slot "favours" or must "avoid" an activity.
export type ApplicationTag =
  | 'launch' | 'contract' | 'partnership' | 'wealth' | 'expansion'
  | 'competition' | 'travel' | 'career' | 'construction' | 'romance'
  | 'secrecy' | 'study';

// A `when` clause is an AND of the fields present; multi-symbol clauses all refer
// to the SAME palace. `scope:'chart'` rules read whole-chart context. `any` is an
// OR of sub-clauses ANDed with the sibling scalar fields. Interpreted by Phase 1.
export interface WhenClause {
  tianPanStem?: Stem;
  diPanStem?: Stem;
  anyStem?: Stem[];                                  // any of these on the 天盘 (wonder presence)
  door?: Door | Door[];
  star?: Star | Star[];
  spirit?: Spirit | Spirit[];
  palaceIndex?: PalaceIndex | PalaceIndex[];
  isZhiFu?: boolean;                                 // palace holds 值符
  isZhiShiGate?: boolean;                            // palace holds 值使门
  sanqiInPalace?: Partial<Record<Wonder, PalaceIndex>>; // a 奇 seated in its throne/salary palace
  stemPairIsHe?: boolean;                            // 天/地 stems form a 合 pair
  hourStemIs?: Stem | '甲';                          // chart-scope: hour pillar stem
  any?: WhenClause[];
}

export interface PatternRule {
  id: string;
  name: string;      // 中文 (simplified)
  nameEn: string;
  tier: Tier;
  scope: 'palace' | 'chart';
  confidence: Confidence;
  when: WhenClause;
  interpretation: string;
  guidance: { favours: ApplicationTag[]; avoid: ApplicationTag[] };
  notes?: string;
  source: string;
}

// ─── §2 tier → score weights (config; tune freely, algorithm never changes) ───
export const TIER_WEIGHTS: Record<Tier, number> = {
  'supreme-auspicious': +100,
  'auspicious': +60,
  'minor-auspicious': +30,
  'neutral': 0,
  'conditional': 0,        // resolved from the co-located gate at eval time
  'minor-inauspicious': -30,
  'inauspicious': -60,
  'supreme-inauspicious': -100,
};

// ─── §3 intrinsic symbol tables (base valence + element + activity uses) ───
export type Element = '木' | '火' | '土' | '金' | '水';
export type Quality =
  | 'auspicious' | 'minor-auspicious' | 'neutral' | 'inauspicious';

export const GATES: Record<Door, { element: Element; quality: Quality; uses: ApplicationTag[] }> = {
  开门: { element: '金', quality: 'auspicious', uses: ['launch', 'career', 'wealth', 'travel', 'expansion'] },
  休门: { element: '水', quality: 'auspicious', uses: ['partnership', 'romance', 'career', 'travel'] },
  生门: { element: '土', quality: 'auspicious', uses: ['wealth', 'launch', 'construction', 'contract'] },
  伤门: { element: '木', quality: 'inauspicious', uses: ['competition'] },
  杜门: { element: '木', quality: 'neutral', uses: ['secrecy'] },
  景门: { element: '火', quality: 'neutral', uses: ['study', 'competition'] },
  死门: { element: '土', quality: 'inauspicious', uses: [] },
  惊门: { element: '金', quality: 'inauspicious', uses: ['competition'] },
};
export const GOOD_GATES: Door[] = ['开门', '休门', '生门']; // 三吉门

export const STARS: Record<Star, { element: Element; quality: Quality }> = {
  天心: { element: '金', quality: 'auspicious' },
  天任: { element: '土', quality: 'auspicious' },
  天辅: { element: '木', quality: 'auspicious' },
  天禽: { element: '土', quality: 'auspicious' },
  天冲: { element: '木', quality: 'minor-auspicious' },
  天蓬: { element: '水', quality: 'inauspicious' },
  天芮: { element: '土', quality: 'inauspicious' },
  天柱: { element: '金', quality: 'inauspicious' },
  天英: { element: '火', quality: 'inauspicious' },
};

export const SPIRITS: Record<Spirit, { quality: Quality; theme: string }> = {
  值符: { quality: 'auspicious', theme: '贵人/权威/主事' },
  太阴: { quality: 'auspicious', theme: '暗助/庇护/谋划/隐密' },
  六合: { quality: 'auspicious', theme: '合作/婚姻/中介/和合' },
  九天: { quality: 'auspicious', theme: '高远/扩张/宣扬/主动进取' },
  九地: { quality: 'auspicious', theme: '稳固/防守/田产/潜藏' },
  腾蛇: { quality: 'inauspicious', theme: '虚惊/缠绕/怪异/反覆' },
  白虎: { quality: 'inauspicious', theme: '伤灾/争斗/疾病/道路' },
  玄武: { quality: 'inauspicious', theme: '盗窃/欺瞒/暗昧/失脱' },
  勾陈: { quality: 'inauspicious', theme: '缠讼/田土是非/牵绊/迟滞' }, // variant of 白虎 position
  朱雀: { quality: 'inauspicious', theme: '文书/口舌/官司/信息' },     // variant of 玄武 position
};

// ─────────────────────────────────────────────────────────────────────────────
// §4.1 吉格 — auspicious 天盘干/地盘干 stem-pairs
// ─────────────────────────────────────────────────────────────────────────────
export const PATTERNS_AUSPICIOUS: PatternRule[] = [
  {
    id: 'qinglong-fanshou', name: '青龙返首', nameEn: 'Dragon Turns Its Head',
    tier: 'supreme-auspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '戊', diPanStem: '丙' },
    interpretation: '戊(甲) 加 丙 — top-tier "everything goes your way"; strong for bold, far-reaching moves. 吉事变凶 if 门迫 OR palace=震3 (子卯相刑).',
    guidance: { favours: ['launch', 'expansion', 'wealth', 'career', 'competition'], avoid: [] },
    notes: 'Void/invert if 门迫 or palace=3震, or generic 墓/击/刑. Source: S0(p123).',
    source: 'S0(p123),S3,S5',
  },
  {
    id: 'feiniao-diexue', name: '飞鸟跌穴', nameEn: 'Flying Bird Falls into the Nest',
    tier: 'supreme-auspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '丙', diPanStem: '戊' },
    interpretation: '丙 加 戊(甲) — "a hundred battles, a hundred victories"; excellent for winning contests, closing, decisive execution. Same 迫/墓/击/刑 caveat as 青龙返首.',
    guidance: { favours: ['competition', 'wealth', 'launch', 'partnership'], avoid: [] },
    source: 'S5,S13,S27',
  },
  {
    id: 'qinglong-yaoming', name: '青龙耀明', nameEn: 'Dragon Shines Bright',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '戊', diPanStem: '丁' },
    interpretation: '戊 加 丁 — favourable for meeting VIPs, seeking rank/reputation. Guard against gossip if the palace is in 墓/迫.',
    guidance: { favours: ['career', 'study', 'partnership'], avoid: [] },
    source: 'S5,S8',
  },
  {
    id: 'qiyi-xiangzuo', name: '奇仪相佐', nameEn: 'Wonder & Instrument Assist',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '乙', diPanStem: '丁' },
    interpretation: '乙 加 丁 — best for documents, examinations, applications; "a hundred things doable."',
    guidance: { favours: ['study', 'contract', 'career'], avoid: [] },
    source: 'S5',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// §4.2 凶格 — inauspicious stem-pairs
// ─────────────────────────────────────────────────────────────────────────────
export const PATTERNS_INAUSPICIOUS: PatternRule[] = [
  {
    id: 'qinglong-taozou', name: '青龙逃走', nameEn: 'Dragon Flees',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '乙', diPanStem: '辛' },
    interpretation: '乙 加 辛 — loss through subordinates/partners; theft, desertion, things slipping away.',
    guidance: { favours: [], avoid: ['partnership', 'contract', 'wealth', 'launch'] },
    source: 'S4,S5,S27',
  },
  {
    id: 'baihu-changkuang', name: '白虎猖狂', nameEn: 'White Tiger Runs Wild',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '辛', diPanStem: '乙' },
    interpretation: '辛 加 乙 — aggression, breakdown, road/injury risk, ruptured relations; the mirror of 青龙逃走.',
    guidance: { favours: [], avoid: ['partnership', 'contract', 'travel', 'launch'] },
    source: 'S4,S27',
  },
  {
    id: 'zhuque-toujiang', name: '朱雀投江', nameEn: 'Vermilion Bird Dives into the River',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '丁', diPanStem: '癸' },
    interpretation: '丁 加 癸 — documents/messages go wrong; disputes, retractions, sunk communications.',
    guidance: { favours: [], avoid: ['contract', 'study', 'partnership'] },
    source: 'S4,S27',
  },
  {
    id: 'tengshe-yaojiao', name: '腾蛇夭矫', nameEn: 'Flying Snake Writhes',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '癸', diPanStem: '丁' },
    interpretation: '癸 加 丁 — entanglement, anxiety, strange reversals, deception around agreements.',
    guidance: { favours: [], avoid: ['contract', 'partnership', 'wealth'] },
    source: 'S4,S27',
  },
  {
    id: 'taibai-ruying', name: '太白入荧', nameEn: 'Venus into Mars',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '庚', diPanStem: '丙' },
    interpretation: '庚 加 丙 — MORE 凶 than the reverse; expect an incoming raid, defend/hold (固守为吉). Favours the mover (客) against a holder.',
    guidance: { favours: ['competition'], avoid: ['wealth', 'launch', 'partnership'] },
    notes: '比荧入白更凶. Source: S0(p127).',
    source: 'S0(p127)',
  },
  {
    id: 'huoru-jinxiang', name: '荧入太白', nameEn: 'Fire Enters Metal',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '丙', diPanStem: '庚' },
    interpretation: '丙 加 庚 — 火入金乡「贼即去」: the raider departs; less severe than 太白入荧. Still a loss/backfire for the initiator.',
    guidance: { favours: [], avoid: ['wealth', 'launch', 'partnership'] },
    source: 'S0(p127)',
  },
  {
    id: 'geng-da-ge', name: '大格', nameEn: 'Great Obstruction',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '庚', diPanStem: '癸' },
    interpretation: '庚 加 癸 — roads blocked, matters stall, no reply, people fail to arrive.',
    guidance: { favours: [], avoid: ['travel', 'launch', 'partnership', 'contract'] },
    source: 'S27',
  },
  {
    id: 'geng-xing-ge', name: '刑格', nameEn: 'Punishment Obstruction',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '庚', diPanStem: '己' },
    interpretation: '庚 加 己 — friction, penalties, legal snags.',
    guidance: { favours: [], avoid: ['contract', 'partnership', 'launch'] },
    source: 'S27',
  },
  {
    id: 'geng-xiao-ge', name: '小格', nameEn: 'Lesser Obstruction',
    tier: 'minor-inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '庚', diPanStem: '壬' },
    interpretation: '庚 加 壬 — smaller-scale blockage and delay.',
    guidance: { favours: [], avoid: ['travel', 'launch'] },
    source: 'S27',
  },
  {
    id: 'zhange-taibai-tonggong', name: '战格', nameEn: 'Battle Formation',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '庚', diPanStem: '庚' },
    interpretation: '庚 加 庚 (太白同宫) — direct conflict, confrontation, values in collision.',
    guidance: { favours: [], avoid: ['partnership', 'contract', 'launch'] },
    source: 'S27',
  },
  {
    id: 'tianwang-sizhang', name: '天网四张', nameEn: 'Heaven Net Spread Fourfold',
    tier: 'supreme-inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '癸', diPanStem: '癸' },
    interpretation: '癸 加 癸 — everything netted/trapped; do not act. ONLY 癸+癸 qualifies (S0 p132). The net high/low escapability rule is disputed — not encoded.',
    guidance: { favours: [], avoid: ['launch', 'travel', 'contract', 'partnership', 'competition'] },
    source: 'S0(p132),S25',
  },
  {
    id: 'wangdai-tianlao', name: '网盖天牢', nameEn: 'Net Covers the Heavenly Prison',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '癸', diPanStem: '辛' },
    interpretation: '癸 加 辛 — litigation lost, confinement, entrapment; especially bad for disputes.',
    guidance: { favours: [], avoid: ['contract', 'partnership', 'competition'] },
    source: 'S6',
  },
  {
    id: 'riqi-rumu', name: '日奇入墓', nameEn: 'Day-Wonder Enters Tomb (乙+己)',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '乙', diPanStem: '己' },
    interpretation: '乙 加 己 — prospects unclear, buried potential; with a bad gate the matter is definitely bad. (Distinct from palace-based 三奇入墓, structural.ts.)',
    guidance: { favours: [], avoid: ['launch', 'career', 'partnership'] },
    source: 'S5',
  },
  {
    id: 'riqi-beixing', name: '日奇被刑', nameEn: 'Day-Wonder Punished (乙+庚)',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '乙', diPanStem: '庚' },
    interpretation: '乙 加 庚 — lawsuits, financial loss, partners with private agendas. WITH a 吉门 present this instead reads as 奇仪相合/和解 — gate the sign on 吉门 presence.',
    guidance: { favours: [], avoid: ['partnership', 'contract', 'wealth'] },
    notes: 'Interacts with qiyi-xianghe (§6): 吉门 present → read the 合 (和解) meaning. Source: S5,S0(p126).',
    source: 'S5,S0(p126)',
  },
  {
    id: 'hege-geng-yi', name: '合格', nameEn: 'Binding (庚+乙, part of 奇格)',
    tier: 'conditional', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '庚', diPanStem: '乙' },
    interpretation: '庚 加 乙 (乙庚合). 出行用兵 → 凶; but the 合 can mean binding/agreement WITH a 吉门. Context-dependent.',
    guidance: { favours: [], avoid: ['travel', 'competition'] },
    source: 'S0(p128)',
  },
  {
    id: 'poge-geng-ding', name: '破格', nameEn: 'Rupture (庚+丁, part of 奇格)',
    tier: 'inauspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '庚', diPanStem: '丁' },
    interpretation: '庚 加 丁 (丁火克庚金) — rupture, breakage; 出行用兵大凶.',
    guidance: { favours: [], avoid: ['travel', 'launch', 'competition', 'partnership'] },
    source: 'S0(p128)',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// §5 九遁 — the Nine Concealments (蔽 = shielding: wonder+gate(+deity/plate))
// ─────────────────────────────────────────────────────────────────────────────
export const PATTERNS_CONCEALMENT: PatternRule[] = [
  {
    id: 'tian-dun', name: '天遁', nameEn: 'Heaven Concealment',
    tier: 'supreme-auspicious', scope: 'palace', confidence: 'consensus',
    when: { door: '生门', tianPanStem: '丙', diPanStem: '丁' },
    interpretation: '月精之蔽. 二奇并生门 — obstacles dissolve, 百事生旺. Prime for launches, advancement, seeking office, trade, marriage.',
    guidance: { favours: ['launch', 'career', 'wealth', 'partnership', 'expansion'], avoid: [] },
    source: 'S0(p123),S31,S35',
  },
  {
    id: 'di-dun', name: '地遁', nameEn: 'Earth Concealment',
    tier: 'supreme-auspicious', scope: 'palace', confidence: 'consensus',
    when: { door: '开门', tianPanStem: '乙', diPanStem: '己' },
    interpretation: '日精之蔽 (己=地户, 开门得日精). Cover for hidden/foundational work — positioning, groundwork, ambush, construction.',
    guidance: { favours: ['construction', 'secrecy', 'launch', 'wealth'], avoid: [] },
    source: 'S0(p123),S31,S35',
  },
  {
    id: 'ren-dun', name: '人遁', nameEn: 'Human Concealment',
    tier: 'supreme-auspicious', scope: 'palace', confidence: 'consensus',
    when: { door: '休门', tianPanStem: '丁', spirit: '太阴' },
    interpretation: '星精之蔽. Best for 探密/伏藏/和谈/求贤/结婚/交易 — money, reconciliation, marriage, negotiation, recruiting.',
    guidance: { favours: ['wealth', 'partnership', 'romance', 'career', 'secrecy'], avoid: [] },
    source: 'S0(p123),S26,S35',
  },
  {
    id: 'shen-dun', name: '神遁', nameEn: 'Spirit Concealment',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { door: '生门', tianPanStem: '丙', spirit: '九天' },
    interpretation: '宜攻虚/开路/塞河/造像/教化 — bold, high-visibility advance; publicity, opening new ground.',
    guidance: { favours: ['expansion', 'launch', 'career'], avoid: [] },
    source: 'S0(p123)',
  },
  {
    id: 'gui-dun', name: '鬼遁', nameEn: 'Ghost Concealment',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { any: [
      { door: '杜门', tianPanStem: '丁', spirit: '九地' },
      { door: '开门', tianPanStem: '丁', spirit: '九地' },
    ] },
    interpretation: '宜偷营劫寨/设伪伏虚 — covert ops, moving unseen, feints. 杜门(或开门) + 丁 + 九地.',
    guidance: { favours: ['secrecy', 'competition'], avoid: [] },
    source: 'S0(p123-124)',
  },
  {
    id: 'feng-dun', name: '风遁', nameEn: 'Wind Concealment',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '乙', door: ['开门', '休门', '生门'], palaceIndex: 4 },
    interpretation: '巽木主风 + 乙奇 + 吉门. Wind-aided moves; broadly a 乙奇+吉门 utility slot.',
    guidance: { favours: ['travel', 'competition', 'launch'], avoid: [] },
    source: 'S0(p123)',
  },
  {
    id: 'yun-dun', name: '云遁', nameEn: 'Cloud Concealment',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '乙', door: ['开门', '休门', '生门'], diPanStem: '辛' },
    interpretation: '云精之蔽. 宜求雨/立营寨/造军械 — concealment via cloud cover; setup and provisioning.',
    guidance: { favours: ['construction', 'secrecy'], avoid: [] },
    source: 'S0(p123)',
  },
  {
    id: 'long-dun', name: '龙遁', nameEn: 'Dragon Concealment',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { tianPanStem: '乙', door: ['开门', '休门', '生门'], any: [{ palaceIndex: 1 }, { diPanStem: '癸' }] },
    interpretation: '水中有龙. 宜掩捕/水战/修桥/穿井 — water-related works, ambush by water. 乙 + 吉门 + 坎1宫 或 癸.',
    guidance: { favours: ['construction', 'competition'], avoid: [] },
    source: 'S0(p123)',
  },
  {
    id: 'hu-dun', name: '虎遁', nameEn: 'Tiger Concealment',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { any: [
      { tianPanStem: '乙', door: ['休门', '生门'], diPanStem: '辛', palaceIndex: 8 },
      { tianPanStem: '庚', door: '开门', palaceIndex: 7 },
    ] },
    interpretation: '宜安营扎寨/设隐埋伏/修筑建造 — fortifying, laying ambush, building.',
    guidance: { favours: ['construction', 'secrecy'], avoid: [] },
    source: 'S0(p123)',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// §6 三奇 auspicious structures (+ 天显时 chart-scope 伏吟 exception)
// ─────────────────────────────────────────────────────────────────────────────
export const PATTERNS_SANQI: PatternRule[] = [
  {
    id: 'sanqi-shengdian', name: '三奇贵人升殿', nameEn: 'Wonder Ascends the Throne',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { sanqiInPalace: { 乙: 3, 丙: 9, 丁: 7 } },
    interpretation: '乙震/丙离/丁兑 (帝旺 or 长生 seat). 贵人升正殿, 百事可为.',
    guidance: { favours: ['launch', 'career', 'wealth', 'study'], avoid: [] },
    source: 'S0(p125)',
  },
  {
    id: 'qiyou-luwei', name: '奇游禄位', nameEn: 'Wonder Roams to Its Salary Seat',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { sanqiInPalace: { 乙: 3, 丙: 4, 丁: 9 }, door: ['开门', '休门', '生门'] },
    interpretation: '乙到震(卯禄)/丙到巽(巳禄)/丁到离(午禄) = 本禄之位; with a 三吉门, 宜上官赴任/求财祈福. NOTE the palace map differs from 升殿.',
    guidance: { favours: ['career', 'wealth', 'launch'], avoid: [] },
    source: 'S0(p126)',
  },
  {
    id: 'yunü-shoumen', name: '玉女守门', nameEn: 'Jade Maiden Guards the Gate',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { diPanStem: '丁', isZhiShiGate: true },
    interpretation: '值使门宫 遇 地盘丁奇 (丁 = 玉女). 利宴会喜乐/婚姻 — goodwill, romance, celebrations, requests, mediation, PR.',
    guidance: { favours: ['romance', 'partnership', 'career', 'contract'], avoid: [] },
    notes: '地盘丁 (not 天盘). Engine resolves the 值使门 palace via isZhiShi. Source: S0(p124).',
    source: 'S0(p124)',
  },
  {
    id: 'sanqi-deshi', name: '三奇得使', nameEn: 'Wonder Obtains Its Envoy',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { anyStem: ['乙', '丙', '丁'], isZhiShiGate: true },
    interpretation: 'A 三奇 sharing the palace with the 值使门. 得使可以用事. Per 张志春 this rescues the otherwise-凶 奇⇢仪 pairings (乙+己/乙+辛/丙+庚/丁+癸): if 值使门 present, do not read them as 凶.',
    guidance: { favours: ['launch', 'career', 'partnership', 'wealth', 'contract'], avoid: [] },
    notes: 'OPEN (§10.1): source-faithful 奇+值使门. To label 奇+任一吉门 as 三奇得使 instead, flip `when` to door:[开/休/生] — diverges from S0. Source: S0(p124).',
    source: 'S0(p124)',
  },
  {
    id: 'san-zha-zhen', name: '真诈', nameEn: 'True Deceit',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { door: ['开门', '休门', '生门'], anyStem: ['乙', '丙', '丁'], spirit: '太阴' },
    interpretation: '三吉门 + 三奇 + 太阴 → covert planning, quiet positioning, protected moves.',
    guidance: { favours: ['secrecy', 'partnership', 'competition'], avoid: [] },
    source: 'Joe; cf. S4,S36',
  },
  {
    id: 'san-zha-zhong', name: '重诈', nameEn: 'Heavy Deceit',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { door: ['开门', '休门', '生门'], anyStem: ['乙', '丙', '丁'], spirit: '九地' },
    interpretation: '三吉门 + 三奇 + 九地 → ambush, defensive positioning, groundwork that must hold.',
    guidance: { favours: ['secrecy', 'construction', 'competition'], avoid: [] },
    source: 'Joe; cf. S4,S36',
  },
  {
    id: 'san-zha-xiu', name: '休诈', nameEn: 'Rest Deceit',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { door: ['开门', '休门', '生门'], anyStem: ['乙', '丙', '丁'], spirit: '六合' },
    interpretation: '三吉门 + 三奇 + 六合 → negotiation, alliances, mediation, deals via a go-between.',
    guidance: { favours: ['partnership', 'contract', 'romance'], avoid: [] },
    source: 'Joe; cf. S0(p125),S4',
  },
  {
    id: 'sanqi-zhiling', name: '三奇之灵', nameEn: 'Numinous Wonder',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { anyStem: ['乙', '丙', '丁'], door: ['开门', '休门', '生门'], spirit: ['太阴', '六合', '九地', '九天'] },
    interpretation: '一奇 + 一三吉门 + 一四吉神(太阴/六合/九地/九天) → 吉道清灵, 用事俱吉. Umbrella super-combo (三诈 is its 太阴/六合/九地 subset; also admits 九天).',
    guidance: { favours: ['launch', 'career', 'wealth', 'partnership', 'expansion'], avoid: [] },
    notes: 'De-dupe with 三诈 in scoring: same palace → count the bonus once, prefer the 三诈 label. Source: S0(p126).',
    source: 'S0(p126)',
  },
  {
    id: 'huanyi', name: '欢怡', nameEn: 'Joyful Harmony',
    tier: 'auspicious', scope: 'palace', confidence: 'consensus',
    when: { anyStem: ['乙', '丙', '丁'], spirit: '值符' },
    interpretation: '三奇 临 值符之宫. 凡事谋皆有利, 抚恤将士, 众情悦服 — morale, rallying people, team goodwill.',
    guidance: { favours: ['partnership', 'career', 'launch'], avoid: [] },
    source: 'S0(p126)',
  },
  {
    id: 'qiyi-xianghe', name: '奇仪相合', nameEn: 'Stems in Union',
    tier: 'conditional', scope: 'palace', confidence: 'consensus',
    when: { stemPairIsHe: true, door: ['开门', '休门', '生门'] },
    interpretation: '天/地 stems form a 合 pair — 乙庚·丙辛·丁壬 (奇合) or 戊癸·甲己 (仪合) — WITH a 吉门: 主和解/了结/平局/平分.',
    guidance: { favours: ['partnership', 'contract', 'romance'], avoid: [] },
    notes: '乙+庚 is ALSO 日奇被刑 (凶). WITH a 吉门 read the 合 (和解); without, the 被刑 (凶) dominates. Source: S0(p126).',
    source: 'S0(p126)',
  },
  {
    id: 'tianxian-shige', name: '天显时格', nameEn: 'Heaven-Revealed Hour',
    tier: 'auspicious', scope: 'chart', confidence: 'consensus',
    when: { hourStemIs: '甲' },
    interpretation: 'Hour pillar stem is 甲 (旬首/六甲大将透出): the 值符 六甲 emerges. Though technically 伏吟, it is NOT 凶 — it turns auspicious. 宜行兵/上官/参谒/求财/远行.',
    guidance: { favours: ['career', 'wealth', 'travel', 'launch', 'partnership'], avoid: [] },
    notes: 'When it fires, SUPPRESS the 伏吟 penalty for that slot (structural.ts isTianXianShi). Source: S0(p125,p131).',
    source: 'S0(p125,p131)',
  },
];

// The full firm registry, in one array for the evaluator to sweep.
export const ALL_PATTERNS: PatternRule[] = [
  ...PATTERNS_AUSPICIOUS,
  ...PATTERNS_INAUSPICIOUS,
  ...PATTERNS_CONCEALMENT,
  ...PATTERNS_SANQI,
];

export const PATTERNS_BY_ID: Record<string, PatternRule> = Object.fromEntries(
  ALL_PATTERNS.map((p) => [p.id, p]),
);
