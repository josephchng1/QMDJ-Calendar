// ─────────────────────────────────────────────────────────────────────────────
// Activity presets (§8) — named filter bundles that steer the date search toward
// the 格局 that favour a given 用事 and away from the ones that ruin it.
//
// `boost` / `exclude*` reference PatternRule ids (patterns.ts). `excludeWarnings`
// references the structural warning labels emitted by scoreHour (伏吟/反吟/五不遇时/
// 时干入墓). The two absolute/nullifying vetoes (六仪击刑, 三奇入墓) already set
// `blocked` in scoring, so they are excluded from every search regardless — no need
// to list them here. Tokens are the engine's simplified forms.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApplicationTag, Door, Spirit } from './patterns.ts';

export interface ActivityPreset {
  label: string;              // 中文, for the picker
  boost: string[];            // formation ids to reward
  goodGates: Door[];          // favoured gate in the acting (值使) palace
  goodSpirits: Spirit[];      // favoured deity in the acting palace
  excludeFormations: string[];// formation ids that disqualify a slot
  excludeWarnings: string[];  // structural warnings that disqualify a slot
  roleAware?: boolean;        // 主/客 (伏吟利主 / 反吟利客) matters
}

export const ACTIVITY_PRESETS: Record<ApplicationTag, ActivityPreset> = {
  launch: {
    label: '开业开张',
    boost: ['tian-dun', 'qinglong-fanshou', 'feiniao-diexue', 'di-dun', 'sanqi-shengdian', 'tianxian-shige', 'sanqi-zhiling', 'qiyou-luwei'],
    goodGates: ['开门', '生门'], goodSpirits: ['值符', '九天'],
    excludeFormations: ['taibai-ruying', 'huoru-jinxiang', 'geng-da-ge', 'zhange-taibai-tonggong'],
    excludeWarnings: ['反吟', '伏吟'],
  },
  contract: {
    label: '签约合作',
    boost: ['ren-dun', 'yunü-shoumen', 'qiyi-xiangzuo', 'qiyi-xianghe'],
    goodGates: ['休门', '生门'], goodSpirits: ['六合', '值符'],
    excludeFormations: ['zhuque-toujiang', 'tengshe-yaojiao', 'poge-geng-ding', 'wangdai-tianlao'],
    excludeWarnings: ['反吟'],
  },
  partnership: {
    label: '合夥谈判',
    boost: ['ren-dun', 'san-zha-xiu', 'yunü-shoumen', 'qiyi-xianghe', 'huanyi'],
    goodGates: ['休门'], goodSpirits: ['六合', '太阴'],
    excludeFormations: ['qinglong-taozou', 'baihu-changkuang', 'zhange-taibai-tonggong'],
    excludeWarnings: ['反吟'],
  },
  wealth: {
    label: '求财投资',
    boost: ['ren-dun', 'feiniao-diexue', 'sanqi-shengdian', 'qiyou-luwei', 'tianxian-shige'],
    goodGates: ['生门'], goodSpirits: ['值符', '九地'],
    excludeFormations: ['taibai-ruying', 'huoru-jinxiang', 'riqi-beixing'],
    excludeWarnings: [],
  },
  expansion: {
    label: '扩张远图',
    boost: ['qinglong-fanshou', 'tian-dun', 'shen-dun'],
    goodGates: ['开门'], goodSpirits: ['九天'],
    excludeFormations: ['geng-da-ge', 'tianwang-sizhang'],
    excludeWarnings: ['伏吟'],
  },
  competition: {
    label: '竞争销售',
    boost: ['feiniao-diexue', 'san-zha-zhen', 'san-zha-zhong'],
    goodGates: ['景门'], goodSpirits: ['九天'],
    excludeFormations: [],
    excludeWarnings: ['伏吟'],
    roleAware: true,
  },
  travel: {
    label: '出行执行',
    boost: ['di-dun', 'tianxian-shige'],
    goodGates: ['开门', '休门', '生门'], goodSpirits: [],
    excludeFormations: ['geng-da-ge', 'geng-xiao-ge', 'baihu-changkuang'],
    excludeWarnings: ['反吟', '伏吟'],
    roleAware: true,
  },
  career: {
    label: '上官赴任',
    boost: ['sanqi-shengdian', 'qiyou-luwei', 'tianxian-shige', 'tian-dun', 'huanyi'],
    goodGates: ['开门', '生门'], goodSpirits: ['值符', '九天'],
    excludeFormations: [],
    excludeWarnings: ['反吟', '伏吟'],
  },
  construction: {
    label: '动土修造',
    boost: ['di-dun', 'san-zha-zhong'],
    goodGates: ['生门'], goodSpirits: ['九地'],
    excludeFormations: [],
    excludeWarnings: ['反吟'],
  },
  romance: {
    label: '婚姻和合',
    boost: ['ren-dun', 'yunü-shoumen', 'san-zha-xiu'],
    goodGates: ['休门'], goodSpirits: ['六合', '太阴'],
    excludeFormations: ['qinglong-taozou', 'baihu-changkuang'],
    excludeWarnings: ['反吟'],
  },
  secrecy: {
    label: '谋略布局',
    boost: ['san-zha-zhen', 'san-zha-zhong', 'gui-dun', 'ren-dun'],
    goodGates: ['杜门', '休门'], goodSpirits: ['太阴', '九地'],
    excludeFormations: [],
    excludeWarnings: ['反吟'],
  },
  study: {
    label: '考试文书',
    boost: ['qiyi-xiangzuo', 'sanqi-shengdian'],
    goodGates: ['景门', '开门'], goodSpirits: ['值符'],
    excludeFormations: ['zhuque-toujiang'],
    excludeWarnings: [],
  },
};

export const ACTIVITY_ORDER = Object.keys(ACTIVITY_PRESETS) as ApplicationTag[];
export const activityLabel = (t: ApplicationTag): string => ACTIVITY_PRESETS[t].label;
