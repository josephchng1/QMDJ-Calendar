/**
 * Reference fixtures transcribed from ten screenshots of a professional
 * 时家奇门(转盘) app (folder: Qimen Charts), method label "[9置闰]",
 * plus the exact solar-term times those screenshots display.
 * Palace fixture: [palace, spirit, gate, stars, tianPanStems, diPanStem]
 * (stars/stems order-insensitive).
 */

export interface PalaceFixture { p: number; spirit: string; gate: string; stars: string[]; tian: string[]; di: string; }

export interface ChartFixture {
  id: string;
  y: number; m: number; d: number; hh: number; mm: number;
  pillars: string;            // 年 月 日 时
  dun: 'yang' | 'yin'; ju: number;
  zhiFuStar: string; zhiFuPalace: number;
  zhiShiGate: string; zhiShiPalace: number;
  xunShou: string; xunShouYi: string;
  dayKong: string; hourKong: string;
  spiritVariant?: boolean;
  palaces: PalaceFixture[];
}

export const CHARTS: ChartFixture[] = [
  {
    id: 'IMG_8392', y: 2026, m: 3, d: 17, hh: 10, mm: 6,
    pillars: '丙午 辛卯 庚寅 辛巳', dun: 'yang', ju: 4,
    zhiFuStar: '天禽', zhiFuPalace: 7, zhiShiGate: '死门', zhiShiPalace: 3,
    xunShou: '甲戌', xunShouYi: '己', dayKong: '午未', hourKong: '申酉',
    palaces: [
      { p: 4, spirit: '玄武', gate: '惊门', stars: ['天冲'], tian: ['乙'], di: '戊' },
      { p: 9, spirit: '九地', gate: '开门', stars: ['天辅'], tian: ['戊'], di: '癸' },
      { p: 2, spirit: '九天', gate: '休门', stars: ['天英'], tian: ['癸'], di: '丙' },
      { p: 3, spirit: '白虎', gate: '死门', stars: ['天任'], tian: ['壬'], di: '乙' },
      { p: 7, spirit: '值符', gate: '生门', stars: ['天芮', '天禽'], tian: ['丙', '己'], di: '辛' },
      { p: 8, spirit: '六合', gate: '景门', stars: ['天蓬'], tian: ['丁'], di: '壬' },
      { p: 1, spirit: '太阴', gate: '杜门', stars: ['天心'], tian: ['庚'], di: '丁' },
      { p: 6, spirit: '腾蛇', gate: '伤门', stars: ['天柱'], tian: ['辛'], di: '庚' }
    ]
  },
  {
    id: 'IMG_8393', y: 2026, m: 3, d: 18, hh: 8, mm: 6,
    pillars: '丙午 辛卯 辛卯 壬辰', dun: 'yang', ju: 4,
    zhiFuStar: '天心', zhiFuPalace: 8, zhiShiGate: '开门', zhiShiPalace: 5,
    xunShou: '甲申', xunShouYi: '庚', dayKong: '午未', hourKong: '午未',
    palaces: [
      { p: 4, spirit: '太阴', gate: '死门', stars: ['天任'], tian: ['壬'], di: '戊' },
      { p: 9, spirit: '六合', gate: '惊门', stars: ['天冲'], tian: ['乙'], di: '癸' },
      { p: 2, spirit: '白虎', gate: '开门', stars: ['天辅'], tian: ['戊'], di: '丙' },
      { p: 3, spirit: '腾蛇', gate: '景门', stars: ['天蓬'], tian: ['丁'], di: '乙' },
      { p: 7, spirit: '玄武', gate: '休门', stars: ['天英'], tian: ['癸'], di: '辛' },
      { p: 8, spirit: '值符', gate: '杜门', stars: ['天心'], tian: ['庚'], di: '壬' },
      { p: 1, spirit: '九天', gate: '伤门', stars: ['天柱'], tian: ['辛'], di: '丁' },
      { p: 6, spirit: '九地', gate: '生门', stars: ['天芮', '天禽'], tian: ['丙', '己'], di: '庚' }
    ]
  },
  {
    id: 'IMG_8394', y: 2026, m: 3, d: 18, hh: 10, mm: 6,
    pillars: '丙午 辛卯 辛卯 癸巳', dun: 'yang', ju: 4,
    zhiFuStar: '天心', zhiFuPalace: 9, zhiShiGate: '开门', zhiShiPalace: 6,
    xunShou: '甲申', xunShouYi: '庚', dayKong: '午未', hourKong: '午未',
    palaces: [
      { p: 4, spirit: '九天', gate: '杜门', stars: ['天柱'], tian: ['辛'], di: '戊' },
      { p: 9, spirit: '值符', gate: '景门', stars: ['天心'], tian: ['庚'], di: '癸' },
      { p: 2, spirit: '腾蛇', gate: '死门', stars: ['天蓬'], tian: ['丁'], di: '丙' },
      { p: 3, spirit: '九地', gate: '伤门', stars: ['天芮', '天禽'], tian: ['丙', '己'], di: '乙' },
      { p: 7, spirit: '太阴', gate: '惊门', stars: ['天任'], tian: ['壬'], di: '辛' },
      { p: 8, spirit: '玄武', gate: '生门', stars: ['天英'], tian: ['癸'], di: '壬' },
      { p: 1, spirit: '白虎', gate: '休门', stars: ['天辅'], tian: ['戊'], di: '丁' },
      { p: 6, spirit: '六合', gate: '开门', stars: ['天冲'], tian: ['乙'], di: '庚' }
    ]
  },
  {
    id: 'IMG_8415', y: 2025, m: 12, d: 25, hh: 12, mm: 46,
    pillars: '乙巳 戊子 戊辰 戊午', dun: 'yang', ju: 1,
    zhiFuStar: '天心', zhiFuPalace: 1, zhiShiGate: '开门', zhiShiPalace: 1,
    xunShou: '甲寅', xunShouYi: '癸', dayKong: '戌亥', hourKong: '子丑',
    palaces: [
      { p: 4, spirit: '六合', gate: '伤门', stars: ['天冲'], tian: ['庚'], di: '辛' },
      { p: 9, spirit: '白虎', gate: '杜门', stars: ['天辅'], tian: ['辛'], di: '乙' },
      { p: 2, spirit: '玄武', gate: '景门', stars: ['天英'], tian: ['乙'], di: '己' },
      { p: 3, spirit: '太阴', gate: '生门', stars: ['天任'], tian: ['丙'], di: '庚' },
      { p: 7, spirit: '九地', gate: '死门', stars: ['天芮', '天禽'], tian: ['己', '壬'], di: '丁' },
      { p: 8, spirit: '腾蛇', gate: '休门', stars: ['天蓬'], tian: ['戊'], di: '丙' },
      { p: 1, spirit: '值符', gate: '开门', stars: ['天心'], tian: ['癸'], di: '戊' },
      { p: 6, spirit: '九天', gate: '惊门', stars: ['天柱'], tian: ['丁'], di: '癸' }
    ]
  },
  {
    id: 'IMG_8416', y: 2025, m: 12, d: 25, hh: 16, mm: 46,
    pillars: '乙巳 戊子 戊辰 庚申', dun: 'yang', ju: 1,
    zhiFuStar: '天心', zhiFuPalace: 3, zhiShiGate: '开门', zhiShiPalace: 3,
    xunShou: '甲寅', xunShouYi: '癸', dayKong: '戌亥', hourKong: '子丑',
    palaces: [
      { p: 4, spirit: '腾蛇', gate: '休门', stars: ['天蓬'], tian: ['戊'], di: '辛' },
      { p: 9, spirit: '太阴', gate: '生门', stars: ['天任'], tian: ['丙'], di: '乙' },
      { p: 2, spirit: '六合', gate: '伤门', stars: ['天冲'], tian: ['庚'], di: '己' },
      { p: 3, spirit: '值符', gate: '开门', stars: ['天心'], tian: ['癸'], di: '庚' },
      { p: 7, spirit: '白虎', gate: '杜门', stars: ['天辅'], tian: ['辛'], di: '丁' },
      { p: 8, spirit: '九天', gate: '惊门', stars: ['天柱'], tian: ['丁'], di: '丙' },
      { p: 1, spirit: '九地', gate: '死门', stars: ['天芮', '天禽'], tian: ['己', '壬'], di: '戊' },
      { p: 6, spirit: '玄武', gate: '景门', stars: ['天英'], tian: ['乙'], di: '癸' }
    ]
  },
  {
    id: 'IMG_8579', y: 2026, m: 1, d: 22, hh: 14, mm: 0,
    pillars: '乙巳 己丑 丙申 乙未', dun: 'yang', ju: 3,
    zhiFuStar: '天心', zhiFuPalace: 2, zhiShiGate: '开门', zhiShiPalace: 7,
    xunShou: '甲午', xunShouYi: '辛', dayKong: '辰巳', hourKong: '辰巳',
    spiritVariant: true,
    palaces: [
      { p: 4, spirit: '九地', gate: '景门', stars: ['天芮', '天禽'], tian: ['乙', '庚'], di: '己' },
      { p: 9, spirit: '九天', gate: '死门', stars: ['天柱'], tian: ['壬'], di: '丁' },
      { p: 2, spirit: '值符', gate: '惊门', stars: ['天心'], tian: ['辛'], di: '乙' },
      { p: 3, spirit: '朱雀', gate: '杜门', stars: ['天英'], tian: ['丁'], di: '戊' },
      { p: 7, spirit: '腾蛇', gate: '开门', stars: ['天蓬'], tian: ['丙'], di: '壬' },
      { p: 8, spirit: '勾陈', gate: '伤门', stars: ['天辅'], tian: ['己'], di: '癸' },
      { p: 1, spirit: '六合', gate: '生门', stars: ['天冲'], tian: ['戊'], di: '丙' },
      { p: 6, spirit: '太阴', gate: '休门', stars: ['天任'], tian: ['癸'], di: '辛' }
    ]
  },
  {
    id: 'IMG_8834 (晚子时)', y: 2026, m: 2, d: 5, hh: 23, mm: 22,
    pillars: '丙午 庚寅 辛亥 戊子', dun: 'yang', ju: 8,
    zhiFuStar: '天蓬', zhiFuPalace: 8, zhiShiGate: '休门', zhiShiPalace: 5,
    xunShou: '甲申', xunShouYi: '庚', dayKong: '寅卯', hourKong: '午未',
    palaces: [
      { p: 4, spirit: '太阴', gate: '惊门', stars: ['天冲'], tian: ['壬'], di: '癸' },
      { p: 9, spirit: '六合', gate: '开门', stars: ['天辅'], tian: ['癸'], di: '己' },
      { p: 2, spirit: '白虎', gate: '休门', stars: ['天英'], tian: ['己'], di: '辛' },
      { p: 3, spirit: '腾蛇', gate: '死门', stars: ['天任'], tian: ['戊'], di: '壬' },
      { p: 7, spirit: '玄武', gate: '生门', stars: ['天芮', '天禽'], tian: ['辛', '丁'], di: '乙' },
      { p: 8, spirit: '值符', gate: '景门', stars: ['天蓬'], tian: ['庚'], di: '戊' },
      { p: 1, spirit: '九天', gate: '杜门', stars: ['天心'], tian: ['丙'], di: '庚' },
      { p: 6, spirit: '九地', gate: '伤门', stars: ['天柱'], tian: ['乙'], di: '丙' }
    ]
  },
  {
    id: 'IMG_9027', y: 2026, m: 2, d: 20, hh: 14, mm: 39,
    pillars: '丙午 庚寅 乙丑 癸未', dun: 'yang', ju: 9,
    zhiFuStar: '天蓬', zhiFuPalace: 5, zhiShiGate: '休门', zhiShiPalace: 1,
    xunShou: '甲戌', xunShouYi: '己', dayKong: '戌亥', hourKong: '申酉',
    palaces: [
      { p: 4, spirit: '九地', gate: '杜门', stars: ['天柱'], tian: ['丙'], di: '壬' },
      { p: 9, spirit: '九天', gate: '景门', stars: ['天心'], tian: ['丁'], di: '戊' },
      { p: 2, spirit: '值符', gate: '死门', stars: ['天蓬'], tian: ['己'], di: '庚' },
      { p: 3, spirit: '玄武', gate: '伤门', stars: ['天芮', '天禽'], tian: ['庚', '癸'], di: '辛' },
      { p: 7, spirit: '腾蛇', gate: '惊门', stars: ['天任'], tian: ['乙'], di: '丙' },
      { p: 8, spirit: '白虎', gate: '生门', stars: ['天英'], tian: ['戊'], di: '乙' },
      { p: 1, spirit: '六合', gate: '休门', stars: ['天辅'], tian: ['壬'], di: '己' },
      { p: 6, spirit: '太阴', gate: '开门', stars: ['天冲'], tian: ['辛'], di: '丁' }
    ]
  },
  {
    id: 'IMG_9076 (2019 接气)', y: 2019, m: 12, d: 26, hh: 9, mm: 37,
    pillars: '己亥 丙子 丁酉 乙巳', dun: 'yang', ju: 1,
    zhiFuStar: '天禽', zhiFuPalace: 9, zhiShiGate: '死门', zhiShiPalace: 6,
    xunShou: '甲辰', xunShouYi: '壬', dayKong: '辰巳', hourKong: '寅卯',
    palaces: [
      { p: 4, spirit: '九天', gate: '生门', stars: ['天英'], tian: ['乙'], di: '辛' },
      { p: 9, spirit: '值符', gate: '伤门', stars: ['天芮', '天禽'], tian: ['己', '壬'], di: '乙' },
      { p: 2, spirit: '腾蛇', gate: '杜门', stars: ['天柱'], tian: ['丁'], di: '己' },
      { p: 3, spirit: '九地', gate: '休门', stars: ['天辅'], tian: ['辛'], di: '庚' },
      { p: 7, spirit: '太阴', gate: '景门', stars: ['天心'], tian: ['癸'], di: '丁' },
      { p: 8, spirit: '玄武', gate: '开门', stars: ['天冲'], tian: ['庚'], di: '丙' },
      { p: 1, spirit: '白虎', gate: '惊门', stars: ['天任'], tian: ['丙'], di: '戊' },
      { p: 6, spirit: '六合', gate: '死门', stars: ['天蓬'], tian: ['戊'], di: '癸' }
    ]
  },
  {
    id: 'IMG_0068 (阴遁)', y: 2026, m: 7, d: 8, hh: 17, mm: 34,
    pillars: '丙午 乙未 癸未 辛酉', dun: 'yin', ju: 8,
    zhiFuStar: '天冲', zhiFuPalace: 5, zhiShiGate: '伤门', zhiShiPalace: 5,
    xunShou: '甲寅', xunShouYi: '癸', dayKong: '申酉', hourKong: '子丑',
    palaces: [
      { p: 4, spirit: '太阴', gate: '休门', stars: ['天蓬'], tian: ['丙'], di: '壬' },
      { p: 9, spirit: '腾蛇', gate: '生门', stars: ['天任'], tian: ['戊'], di: '乙' },
      { p: 2, spirit: '值符', gate: '伤门', stars: ['天冲'], tian: ['癸'], di: '丁' },
      { p: 3, spirit: '六合', gate: '开门', stars: ['天心'], tian: ['庚'], di: '癸' },
      { p: 7, spirit: '九天', gate: '杜门', stars: ['天辅'], tian: ['壬'], di: '己' },
      { p: 8, spirit: '白虎', gate: '惊门', stars: ['天柱'], tian: ['己'], di: '戊' },
      { p: 1, spirit: '玄武', gate: '死门', stars: ['天芮', '天禽'], tian: ['丁', '辛'], di: '丙' },
      { p: 6, spirit: '九地', gate: '景门', stars: ['天英'], tian: ['乙'], di: '庚' }
    ]
  }
];

/** exact solar-term times shown by the reference app (Beijing/SGT, minute precision) */
export const TERM_TIMES: { name: string; y: number; m: number; d: number; hh: number; mm: number }[] = [
  { name: '大雪', y: 2025, m: 12, d: 7, hh: 5, mm: 4 },
  { name: '冬至', y: 2025, m: 12, d: 21, hh: 23, mm: 2 },
  { name: '小寒', y: 2026, m: 1, d: 5, hh: 16, mm: 22 },
  { name: '大寒', y: 2026, m: 1, d: 20, hh: 9, mm: 44 },
  { name: '立春', y: 2026, m: 2, d: 4, hh: 4, mm: 1 },
  { name: '雨水', y: 2026, m: 2, d: 18, hh: 23, mm: 51 },
  { name: '惊蛰', y: 2026, m: 3, d: 5, hh: 21, mm: 58 },
  { name: '春分', y: 2026, m: 3, d: 20, hh: 22, mm: 45 },
  { name: '小暑', y: 2026, m: 7, d: 7, hh: 9, mm: 56 },
  { name: '大暑', y: 2026, m: 7, d: 23, hh: 3, mm: 12 },
  { name: '大雪', y: 2019, m: 12, d: 7, hh: 18, mm: 18 },
  { name: '冬至', y: 2019, m: 12, d: 22, hh: 12, mm: 19 }
];
