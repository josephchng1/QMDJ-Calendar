/**
 * Second batch of reference fixtures (folder "Qimen Charts - Zhi Run",
 * added 2025-07-19): 20 unique charts, Sep 2024 – Sep 2025.
 * IMG_7631 is an exact duplicate of IMG_7626 and is not repeated.
 *
 * This batch includes genuine 置闰-vs-拆补 divergence windows:
 *  - IMG_4836/4838 (超神 ~7 days: 置闰 serves 寒露 while term is 秋分)
 *  - IMG_5145..5151 (超神 ~9 days before 闰大雪 2024: serves 立冬 while term is 霜降)
 *  - IMG_6605 (serves 春分下 while term is 清明)
 * The main 局数 in every screenshot matches 置闰法, confirming the app's
 * "[9置闰]" display is the intercalation method.
 *
 * Note on IMG_7530 (2025-09-07 16:00): the app already shows month 乙酉
 * although 白露's exact moment is 16:51 — the app switches the month pillar at
 * day granularity. This engine switches at the exact term moment (classical
 * rule and the behaviour Joe's spec asks for), so the expected month here is
 * 甲申; the fixture encodes the engine-correct value and the difference is
 * documented in the README.
 */
import type { ChartFixture } from './references.ts';

export const CHARTS2: ChartFixture[] = [
  {
    id: 'IMG_4836 (超神7天: 置闰寒露 vs 拆补秋分)', y: 2024, m: 9, d: 30, hh: 19, mm: 21,
    pillars: '甲辰 癸酉 丁酉 庚戌', dun: 'yin', ju: 6,
    zhiFuStar: '天芮', zhiFuPalace: 4, zhiShiGate: '死门', zhiShiPalace: 5,
    xunShou: '甲辰', xunShouYi: '壬', dayKong: '辰巳', hourKong: '寅卯',
    palaces: [
      { p: 4, spirit: '值符', gate: '杜门', stars: ['天芮', '天禽'], tian: ['壬', '己'], di: '庚' },
      { p: 9, spirit: '九天', gate: '景门', stars: ['天柱'], tian: ['乙'], di: '丁' },
      { p: 2, spirit: '九地', gate: '死门', stars: ['天心'], tian: ['戊'], di: '壬' },
      { p: 3, spirit: '腾蛇', gate: '伤门', stars: ['天英'], tian: ['丁'], di: '辛' },
      { p: 7, spirit: '玄武', gate: '惊门', stars: ['天蓬'], tian: ['癸'], di: '乙' },
      { p: 8, spirit: '太阴', gate: '生门', stars: ['天辅'], tian: ['庚'], di: '丙' },
      { p: 1, spirit: '六合', gate: '休门', stars: ['天冲'], tian: ['辛'], di: '癸' },
      { p: 6, spirit: '白虎', gate: '开门', stars: ['天任'], tian: ['丙'], di: '戊' }
    ]
  },
  {
    id: 'IMG_4838', y: 2024, m: 10, d: 1, hh: 13, mm: 3,
    pillars: '甲辰 癸酉 戊戌 己未', dun: 'yin', ju: 6,
    zhiFuStar: '天蓬', zhiFuPalace: 5, zhiShiGate: '休门', zhiShiPalace: 5,
    xunShou: '甲寅', xunShouYi: '癸', dayKong: '辰巳', hourKong: '子丑',
    palaces: [
      { p: 4, spirit: '太阴', gate: '惊门', stars: ['天柱'], tian: ['乙'], di: '庚' },
      { p: 9, spirit: '腾蛇', gate: '开门', stars: ['天心'], tian: ['戊'], di: '丁' },
      { p: 2, spirit: '值符', gate: '休门', stars: ['天蓬'], tian: ['癸'], di: '壬' },
      { p: 3, spirit: '六合', gate: '死门', stars: ['天芮', '天禽'], tian: ['壬', '己'], di: '辛' },
      { p: 7, spirit: '九天', gate: '生门', stars: ['天任'], tian: ['丙'], di: '乙' },
      { p: 8, spirit: '白虎', gate: '景门', stars: ['天英'], tian: ['丁'], di: '丙' },
      { p: 1, spirit: '玄武', gate: '杜门', stars: ['天辅'], tian: ['庚'], di: '癸' },
      { p: 6, spirit: '九地', gate: '伤门', stars: ['天冲'], tian: ['辛'], di: '戊' }
    ]
  },
  {
    id: 'IMG_5145 (超神: 置闰立冬 vs 拆补霜降)', y: 2024, m: 11, d: 1, hh: 18, mm: 27,
    pillars: '甲辰 甲戌 己巳 癸酉', dun: 'yin', ju: 9,
    zhiFuStar: '天英', zhiFuPalace: 4, zhiShiGate: '景门', zhiShiPalace: 9,
    xunShou: '甲子', xunShouYi: '戊', dayKong: '戌亥', hourKong: '戌亥',
    palaces: [
      { p: 4, spirit: '值符', gate: '杜门', stars: ['天英'], tian: ['戊'], di: '癸' },
      { p: 9, spirit: '九天', gate: '景门', stars: ['天芮', '天禽'], tian: ['丙', '壬'], di: '戊' },
      { p: 2, spirit: '九地', gate: '死门', stars: ['天柱'], tian: ['庚'], di: '丙' },
      { p: 3, spirit: '腾蛇', gate: '伤门', stars: ['天辅'], tian: ['癸'], di: '丁' },
      { p: 7, spirit: '玄武', gate: '惊门', stars: ['天心'], tian: ['辛'], di: '庚' },
      { p: 8, spirit: '太阴', gate: '生门', stars: ['天冲'], tian: ['丁'], di: '己' },
      { p: 1, spirit: '六合', gate: '休门', stars: ['天任'], tian: ['己'], di: '乙' },
      { p: 6, spirit: '白虎', gate: '开门', stars: ['天蓬'], tian: ['乙'], di: '辛' }
    ]
  },
  {
    id: 'IMG_5146', y: 2024, m: 11, d: 4, hh: 6, mm: 27,
    pillars: '甲辰 甲戌 壬申 癸卯', dun: 'yin', ju: 9,
    zhiFuStar: '天心', zhiFuPalace: 4, zhiShiGate: '开门', zhiShiPalace: 6,
    xunShou: '甲午', xunShouYi: '辛', dayKong: '戌亥', hourKong: '辰巳',
    palaces: [
      { p: 4, spirit: '值符', gate: '杜门', stars: ['天心'], tian: ['辛'], di: '癸' },
      { p: 9, spirit: '九天', gate: '景门', stars: ['天蓬'], tian: ['乙'], di: '戊' },
      { p: 2, spirit: '九地', gate: '死门', stars: ['天任'], tian: ['己'], di: '丙' },
      { p: 3, spirit: '腾蛇', gate: '伤门', stars: ['天柱'], tian: ['庚'], di: '丁' },
      { p: 7, spirit: '玄武', gate: '惊门', stars: ['天冲'], tian: ['丁'], di: '庚' },
      { p: 8, spirit: '太阴', gate: '生门', stars: ['天芮', '天禽'], tian: ['壬', '丙'], di: '己' },
      { p: 1, spirit: '六合', gate: '休门', stars: ['天英'], tian: ['戊'], di: '乙' },
      { p: 6, spirit: '白虎', gate: '开门', stars: ['天辅'], tian: ['癸'], di: '辛' }
    ]
  },
  {
    id: 'IMG_5147', y: 2024, m: 11, d: 4, hh: 10, mm: 27,
    pillars: '甲辰 甲戌 壬申 乙巳', dun: 'yin', ju: 9,
    zhiFuStar: '天禽', zhiFuPalace: 1, zhiShiGate: '死门', zhiShiPalace: 4,
    xunShou: '甲辰', xunShouYi: '壬', dayKong: '戌亥', hourKong: '寅卯',
    palaces: [
      { p: 4, spirit: '玄武', gate: '死门', stars: ['天蓬'], tian: ['乙'], di: '癸' },
      { p: 9, spirit: '白虎', gate: '惊门', stars: ['天任'], tian: ['己'], di: '戊' },
      { p: 2, spirit: '六合', gate: '开门', stars: ['天冲'], tian: ['丁'], di: '丙' },
      { p: 3, spirit: '九地', gate: '景门', stars: ['天心'], tian: ['辛'], di: '丁' },
      { p: 7, spirit: '太阴', gate: '休门', stars: ['天辅'], tian: ['癸'], di: '庚' },
      { p: 8, spirit: '九天', gate: '杜门', stars: ['天柱'], tian: ['庚'], di: '己' },
      { p: 1, spirit: '值符', gate: '伤门', stars: ['天芮', '天禽'], tian: ['丙', '壬'], di: '乙' },
      { p: 6, spirit: '腾蛇', gate: '生门', stars: ['天英'], tian: ['戊'], di: '辛' }
    ]
  },
  {
    id: 'IMG_5148', y: 2024, m: 11, d: 4, hh: 14, mm: 27,
    pillars: '甲辰 甲戌 壬申 丁未', dun: 'yin', ju: 9,
    zhiFuStar: '天禽', zhiFuPalace: 3, zhiShiGate: '死门', zhiShiPalace: 2,
    xunShou: '甲辰', xunShouYi: '壬', dayKong: '戌亥', hourKong: '寅卯',
    palaces: [
      { p: 4, spirit: '九天', gate: '杜门', stars: ['天柱'], tian: ['庚'], di: '癸' },
      { p: 9, spirit: '九地', gate: '景门', stars: ['天心'], tian: ['辛'], di: '戊' },
      { p: 2, spirit: '玄武', gate: '死门', stars: ['天蓬'], tian: ['乙'], di: '丙' },
      { p: 3, spirit: '值符', gate: '伤门', stars: ['天芮', '天禽'], tian: ['丙', '壬'], di: '丁' },
      { p: 7, spirit: '白虎', gate: '惊门', stars: ['天任'], tian: ['己'], di: '庚' },
      { p: 8, spirit: '腾蛇', gate: '生门', stars: ['天英'], tian: ['戊'], di: '己' },
      { p: 1, spirit: '太阴', gate: '休门', stars: ['天辅'], tian: ['癸'], di: '乙' },
      { p: 6, spirit: '六合', gate: '开门', stars: ['天冲'], tian: ['丁'], di: '辛' }
    ]
  },
  {
    id: 'IMG_5150', y: 2024, m: 11, d: 4, hh: 20, mm: 27,
    pillars: '甲辰 甲戌 壬申 庚戌', dun: 'yin', ju: 9,
    zhiFuStar: '天禽', zhiFuPalace: 7, zhiShiGate: '死门', zhiShiPalace: 8,
    xunShou: '甲辰', xunShouYi: '壬', dayKong: '戌亥', hourKong: '寅卯',
    palaces: [
      { p: 4, spirit: '六合', gate: '开门', stars: ['天冲'], tian: ['丁'], di: '癸' },
      { p: 9, spirit: '太阴', gate: '休门', stars: ['天辅'], tian: ['癸'], di: '戊' },
      { p: 2, spirit: '腾蛇', gate: '生门', stars: ['天英'], tian: ['戊'], di: '丙' },
      { p: 3, spirit: '白虎', gate: '惊门', stars: ['天任'], tian: ['己'], di: '丁' },
      { p: 7, spirit: '值符', gate: '伤门', stars: ['天芮', '天禽'], tian: ['丙', '壬'], di: '庚' },
      { p: 8, spirit: '玄武', gate: '死门', stars: ['天蓬'], tian: ['乙'], di: '己' },
      { p: 1, spirit: '九地', gate: '景门', stars: ['天心'], tian: ['辛'], di: '乙' },
      { p: 6, spirit: '九天', gate: '杜门', stars: ['天柱'], tian: ['庚'], di: '辛' }
    ]
  },
  {
    id: 'IMG_5151', y: 2024, m: 11, d: 5, hh: 6, mm: 27,
    pillars: '甲辰 甲戌 癸酉 乙卯', dun: 'yin', ju: 9,
    zhiFuStar: '天辅', zhiFuPalace: 1, zhiShiGate: '杜门', zhiShiPalace: 3,
    xunShou: '甲寅', xunShouYi: '癸', dayKong: '戌亥', hourKong: '子丑',
    palaces: [
      { p: 4, spirit: '玄武', gate: '景门', stars: ['天柱'], tian: ['庚'], di: '癸' },
      { p: 9, spirit: '白虎', gate: '死门', stars: ['天心'], tian: ['辛'], di: '戊' },
      { p: 2, spirit: '六合', gate: '惊门', stars: ['天蓬'], tian: ['乙'], di: '丙' },
      { p: 3, spirit: '九地', gate: '杜门', stars: ['天芮', '天禽'], tian: ['丙', '壬'], di: '丁' },
      { p: 7, spirit: '太阴', gate: '开门', stars: ['天任'], tian: ['己'], di: '庚' },
      { p: 8, spirit: '九天', gate: '伤门', stars: ['天英'], tian: ['戊'], di: '己' },
      { p: 1, spirit: '值符', gate: '生门', stars: ['天辅'], tian: ['癸'], di: '乙' },
      { p: 6, spirit: '腾蛇', gate: '休门', stars: ['天冲'], tian: ['丁'], di: '辛' }
    ]
  },
  {
    id: 'IMG_5811 (立春前: 年月未换)', y: 2025, m: 2, d: 3, hh: 12, mm: 32,
    pillars: '甲辰 丁丑 癸卯 戊午', dun: 'yang', ju: 9,
    zhiFuStar: '天禽', zhiFuPalace: 9, zhiShiGate: '死门', zhiShiPalace: 9,
    xunShou: '甲寅', xunShouYi: '癸', dayKong: '辰巳', hourKong: '子丑',
    palaces: [
      { p: 4, spirit: '九天', gate: '景门', stars: ['天英'], tian: ['戊'], di: '壬' },
      { p: 9, spirit: '值符', gate: '死门', stars: ['天芮', '天禽'], tian: ['庚', '癸'], di: '戊' },
      { p: 2, spirit: '腾蛇', gate: '惊门', stars: ['天柱'], tian: ['丙'], di: '庚' },
      { p: 3, spirit: '九地', gate: '杜门', stars: ['天辅'], tian: ['壬'], di: '辛' },
      { p: 7, spirit: '太阴', gate: '开门', stars: ['天心'], tian: ['丁'], di: '丙' },
      { p: 8, spirit: '玄武', gate: '伤门', stars: ['天冲'], tian: ['辛'], di: '乙' },
      { p: 1, spirit: '白虎', gate: '生门', stars: ['天任'], tian: ['乙'], di: '己' },
      { p: 6, spirit: '六合', gate: '休门', stars: ['天蓬'], tian: ['己'], di: '丁' }
    ]
  },
  {
    id: 'IMG_6367', y: 2025, m: 3, d: 12, hh: 14, mm: 6,
    pillars: '乙巳 己卯 庚辰 癸未', dun: 'yang', ju: 1,
    zhiFuStar: '天芮', zhiFuPalace: 6, zhiShiGate: '死门', zhiShiPalace: 2,
    xunShou: '甲戌', xunShouYi: '己', dayKong: '申酉', hourKong: '申酉',
    palaces: [
      { p: 4, spirit: '白虎', gate: '杜门', stars: ['天任'], tian: ['丙'], di: '辛' },
      { p: 9, spirit: '玄武', gate: '景门', stars: ['天冲'], tian: ['庚'], di: '乙' },
      { p: 2, spirit: '九地', gate: '死门', stars: ['天辅'], tian: ['辛'], di: '己' },
      { p: 3, spirit: '六合', gate: '伤门', stars: ['天蓬'], tian: ['戊'], di: '庚' },
      { p: 7, spirit: '九天', gate: '惊门', stars: ['天英'], tian: ['乙'], di: '丁' },
      { p: 8, spirit: '太阴', gate: '生门', stars: ['天心'], tian: ['癸'], di: '丙' },
      { p: 1, spirit: '腾蛇', gate: '休门', stars: ['天柱'], tian: ['丁'], di: '戊' },
      { p: 6, spirit: '值符', gate: '开门', stars: ['天芮', '天禽'], tian: ['己', '壬'], di: '癸' }
    ]
  },
  {
    id: 'IMG_6605 (置闰春分下 vs 拆补清明下)', y: 2025, m: 4, d: 6, hh: 18, mm: 1,
    pillars: '乙巳 庚辰 乙巳 乙酉', dun: 'yang', ju: 6,
    zhiFuStar: '天任', zhiFuPalace: 5, zhiShiGate: '生门', zhiShiPalace: 9,
    xunShou: '甲申', xunShouYi: '庚', dayKong: '寅卯', hourKong: '午未',
    palaces: [
      { p: 4, spirit: '九地', gate: '休门', stars: ['天心'], tian: ['戊'], di: '丙' },
      { p: 9, spirit: '九天', gate: '生门', stars: ['天蓬'], tian: ['壬'], di: '辛' },
      { p: 2, spirit: '值符', gate: '伤门', stars: ['天任'], tian: ['庚'], di: '癸' },
      { p: 3, spirit: '玄武', gate: '开门', stars: ['天柱'], tian: ['己'], di: '丁' },
      { p: 7, spirit: '腾蛇', gate: '杜门', stars: ['天冲'], tian: ['丁'], di: '己' },
      { p: 8, spirit: '白虎', gate: '惊门', stars: ['天芮', '天禽'], tian: ['癸', '乙'], di: '庚' },
      { p: 1, spirit: '六合', gate: '死门', stars: ['天英'], tian: ['辛'], di: '壬' },
      { p: 6, spirit: '太阴', gate: '景门', stars: ['天辅'], tian: ['丙'], di: '戊' }
    ]
  },
  {
    id: 'IMG_7045', y: 2025, m: 6, d: 2, hh: 21, mm: 24,
    pillars: '乙巳 辛巳 壬寅 辛亥', dun: 'yang', ju: 2,
    zhiFuStar: '天心', zhiFuPalace: 5, zhiShiGate: '开门', zhiShiPalace: 4,
    xunShou: '甲辰', xunShouYi: '壬', dayKong: '辰巳', hourKong: '寅卯',
    palaces: [
      { p: 4, spirit: '九地', gate: '开门', stars: ['天芮', '天禽'], tian: ['戊', '辛'], di: '庚' },
      { p: 9, spirit: '九天', gate: '休门', stars: ['天柱'], tian: ['癸'], di: '丙' },
      { p: 2, spirit: '值符', gate: '生门', stars: ['天心'], tian: ['壬'], di: '戊' },
      { p: 3, spirit: '玄武', gate: '惊门', stars: ['天英'], tian: ['丙'], di: '己' },
      { p: 7, spirit: '腾蛇', gate: '伤门', stars: ['天蓬'], tian: ['乙'], di: '癸' },
      { p: 8, spirit: '白虎', gate: '死门', stars: ['天辅'], tian: ['庚'], di: '丁' },
      { p: 1, spirit: '六合', gate: '景门', stars: ['天冲'], tian: ['己'], di: '乙' },
      { p: 6, spirit: '太阴', gate: '杜门', stars: ['天任'], tian: ['丁'], di: '壬' }
    ]
  },
  {
    id: 'IMG_7482', y: 2025, m: 8, d: 22, hh: 20, mm: 32,
    pillars: '乙巳 甲申 癸亥 壬戌', dun: 'yin', ju: 8,
    zhiFuStar: '天冲', zhiFuPalace: 4, zhiShiGate: '伤门', zhiShiPalace: 4,
    xunShou: '甲寅', xunShouYi: '癸', dayKong: '子丑', hourKong: '子丑',
    palaces: [
      { p: 4, spirit: '值符', gate: '伤门', stars: ['天冲'], tian: ['癸'], di: '壬' },
      { p: 9, spirit: '九天', gate: '杜门', stars: ['天辅'], tian: ['壬'], di: '乙' },
      { p: 2, spirit: '九地', gate: '景门', stars: ['天英'], tian: ['乙'], di: '丁' },
      { p: 3, spirit: '腾蛇', gate: '生门', stars: ['天任'], tian: ['戊'], di: '癸' },
      { p: 7, spirit: '玄武', gate: '死门', stars: ['天芮', '天禽'], tian: ['丁', '辛'], di: '己' },
      { p: 8, spirit: '太阴', gate: '休门', stars: ['天蓬'], tian: ['丙'], di: '戊' },
      { p: 1, spirit: '六合', gate: '开门', stars: ['天心'], tian: ['庚'], di: '丙' },
      { p: 6, spirit: '白虎', gate: '惊门', stars: ['天柱'], tian: ['己'], di: '庚' }
    ]
  },
  {
    id: 'IMG_7530 (白露日 16:00, 精确交节 16:51 前)', y: 2025, m: 9, d: 7, hh: 16, mm: 0,
    // engine-correct month is 甲申 (before the exact 白露 moment); the app
    // displays 乙酉 because it switches the month pillar per day.
    pillars: '乙巳 甲申 己卯 壬申', dun: 'yin', ju: 9,
    zhiFuStar: '天英', zhiFuPalace: 5, zhiShiGate: '景门', zhiShiPalace: 1,
    xunShou: '甲子', xunShouYi: '戊', dayKong: '申酉', hourKong: '戌亥',
    palaces: [
      { p: 4, spirit: '太阴', gate: '开门', stars: ['天冲'], tian: ['丁'], di: '癸' },
      { p: 9, spirit: '腾蛇', gate: '休门', stars: ['天辅'], tian: ['癸'], di: '戊' },
      { p: 2, spirit: '值符', gate: '生门', stars: ['天英'], tian: ['戊'], di: '丙' },
      { p: 3, spirit: '六合', gate: '惊门', stars: ['天任'], tian: ['己'], di: '丁' },
      { p: 7, spirit: '九天', gate: '伤门', stars: ['天芮', '天禽'], tian: ['丙', '壬'], di: '庚' },
      { p: 8, spirit: '白虎', gate: '死门', stars: ['天蓬'], tian: ['乙'], di: '己' },
      { p: 1, spirit: '玄武', gate: '景门', stars: ['天心'], tian: ['辛'], di: '乙' },
      { p: 6, spirit: '九地', gate: '杜门', stars: ['天柱'], tian: ['庚'], di: '辛' }
    ]
  },
  {
    id: 'IMG_7531', y: 2025, m: 8, d: 30, hh: 10, mm: 0,
    pillars: '乙巳 甲申 辛未 癸巳', dun: 'yin', ju: 4,
    zhiFuStar: '天芮', zhiFuPalace: 8, zhiShiGate: '死门', zhiShiPalace: 2,
    xunShou: '甲申', xunShouYi: '庚', dayKong: '戌亥', hourKong: '午未',
    palaces: [
      { p: 4, spirit: '九地', gate: '杜门', stars: ['天心'], tian: ['丙'], di: '戊' },
      { p: 9, spirit: '玄武', gate: '景门', stars: ['天蓬'], tian: ['辛'], di: '壬' },
      { p: 2, spirit: '白虎', gate: '死门', stars: ['天任'], tian: ['癸'], di: '庚' },
      { p: 3, spirit: '九天', gate: '伤门', stars: ['天柱'], tian: ['丁'], di: '己' },
      { p: 7, spirit: '六合', gate: '惊门', stars: ['天冲'], tian: ['己'], di: '丁' },
      { p: 8, spirit: '值符', gate: '生门', stars: ['天芮', '天禽'], tian: ['庚', '乙'], di: '癸' },
      { p: 1, spirit: '腾蛇', gate: '休门', stars: ['天英'], tian: ['壬'], di: '辛' },
      { p: 6, spirit: '太阴', gate: '开门', stars: ['天辅'], tian: ['戊'], di: '丙' }
    ]
  },
  {
    id: 'IMG_7532', y: 2025, m: 9, d: 3, hh: 8, mm: 0,
    pillars: '乙巳 甲申 乙亥 庚辰', dun: 'yin', ju: 7,
    zhiFuStar: '天心', zhiFuPalace: 5, zhiShiGate: '开门', zhiShiPalace: 9,
    xunShou: '甲戌', xunShouYi: '己', dayKong: '申酉', hourKong: '申酉',
    palaces: [
      { p: 4, spirit: '太阴', gate: '惊门', stars: ['天芮', '天禽'], tian: ['癸', '庚'], di: '辛' },
      { p: 9, spirit: '腾蛇', gate: '开门', stars: ['天柱'], tian: ['戊'], di: '丙' },
      { p: 2, spirit: '值符', gate: '休门', stars: ['天心'], tian: ['己'], di: '癸' },
      { p: 3, spirit: '六合', gate: '死门', stars: ['天英'], tian: ['丙'], di: '壬' },
      { p: 7, spirit: '九天', gate: '生门', stars: ['天蓬'], tian: ['丁'], di: '戊' },
      { p: 8, spirit: '白虎', gate: '景门', stars: ['天辅'], tian: ['辛'], di: '乙' },
      { p: 1, spirit: '玄武', gate: '杜门', stars: ['天冲'], tian: ['壬'], di: '丁' },
      { p: 6, spirit: '九地', gate: '伤门', stars: ['天任'], tian: ['乙'], di: '己' }
    ]
  },
  {
    id: 'IMG_7625', y: 2025, m: 9, d: 9, hh: 14, mm: 0,
    pillars: '乙巳 乙酉 辛巳 乙未', dun: 'yin', ju: 9,
    zhiFuStar: '天心', zhiFuPalace: 1, zhiShiGate: '开门', zhiShiPalace: 5,
    xunShou: '甲午', xunShouYi: '辛', dayKong: '申酉', hourKong: '辰巳',
    palaces: [
      { p: 4, spirit: '玄武', gate: '死门', stars: ['天冲'], tian: ['丁'], di: '癸' },
      { p: 9, spirit: '白虎', gate: '惊门', stars: ['天辅'], tian: ['癸'], di: '戊' },
      { p: 2, spirit: '六合', gate: '开门', stars: ['天英'], tian: ['戊'], di: '丙' },
      { p: 3, spirit: '九地', gate: '景门', stars: ['天任'], tian: ['己'], di: '丁' },
      { p: 7, spirit: '太阴', gate: '休门', stars: ['天芮', '天禽'], tian: ['丙', '壬'], di: '庚' },
      { p: 8, spirit: '九天', gate: '杜门', stars: ['天蓬'], tian: ['乙'], di: '己' },
      { p: 1, spirit: '值符', gate: '伤门', stars: ['天心'], tian: ['辛'], di: '乙' },
      { p: 6, spirit: '腾蛇', gate: '生门', stars: ['天柱'], tian: ['庚'], di: '辛' }
    ]
  },
  {
    id: 'IMG_7626', y: 2025, m: 9, d: 13, hh: 20, mm: 0,
    pillars: '乙巳 乙酉 乙酉 丙戌', dun: 'yin', ju: 3,
    zhiFuStar: '天蓬', zhiFuPalace: 5, zhiShiGate: '休门', zhiShiPalace: 8,
    xunShou: '甲申', xunShouYi: '庚', dayKong: '午未', hourKong: '午未',
    palaces: [
      { p: 4, spirit: '太阴', gate: '伤门', stars: ['天柱'], tian: ['癸'], di: '乙' },
      { p: 9, spirit: '腾蛇', gate: '杜门', stars: ['天心'], tian: ['丁'], di: '辛' },
      { p: 2, spirit: '值符', gate: '景门', stars: ['天蓬'], tian: ['庚'], di: '己' },
      { p: 3, spirit: '六合', gate: '生门', stars: ['天芮', '天禽'], tian: ['己', '丙'], di: '戊' },
      { p: 7, spirit: '九天', gate: '死门', stars: ['天任'], tian: ['壬'], di: '癸' },
      { p: 8, spirit: '白虎', gate: '休门', stars: ['天英'], tian: ['辛'], di: '壬' },
      { p: 1, spirit: '玄武', gate: '开门', stars: ['天辅'], tian: ['乙'], di: '庚' },
      { p: 6, spirit: '九地', gate: '惊门', stars: ['天冲'], tian: ['戊'], di: '丁' }
    ]
  },
  {
    id: 'IMG_7629', y: 2025, m: 9, d: 15, hh: 20, mm: 0,
    pillars: '乙巳 乙酉 丁亥 庚戌', dun: 'yin', ju: 3,
    zhiFuStar: '天任', zhiFuPalace: 1, zhiShiGate: '生门', zhiShiPalace: 2,
    xunShou: '甲辰', xunShouYi: '壬', dayKong: '午未', hourKong: '寅卯',
    palaces: [
      { p: 4, spirit: '玄武', gate: '开门', stars: ['天英'], tian: ['辛'], di: '乙' },
      { p: 9, spirit: '白虎', gate: '休门', stars: ['天芮', '天禽'], tian: ['己', '丙'], di: '辛' },
      { p: 2, spirit: '六合', gate: '生门', stars: ['天柱'], tian: ['癸'], di: '己' },
      { p: 3, spirit: '九地', gate: '惊门', stars: ['天辅'], tian: ['乙'], di: '戊' },
      { p: 7, spirit: '太阴', gate: '伤门', stars: ['天心'], tian: ['丁'], di: '癸' },
      { p: 8, spirit: '九天', gate: '死门', stars: ['天冲'], tian: ['戊'], di: '壬' },
      { p: 1, spirit: '值符', gate: '景门', stars: ['天任'], tian: ['壬'], di: '庚' },
      { p: 6, spirit: '腾蛇', gate: '杜门', stars: ['天蓬'], tian: ['庚'], di: '丁' }
    ]
  },
  {
    id: 'IMG_7630', y: 2025, m: 9, d: 14, hh: 18, mm: 0,
    pillars: '乙巳 乙酉 丙戌 丁酉', dun: 'yin', ju: 3,
    zhiFuStar: '天英', zhiFuPalace: 6, zhiShiGate: '景门', zhiShiPalace: 6,
    xunShou: '甲午', xunShouYi: '辛', dayKong: '午未', hourKong: '辰巳',
    palaces: [
      { p: 4, spirit: '白虎', gate: '休门', stars: ['天蓬'], tian: ['庚'], di: '乙' },
      { p: 9, spirit: '六合', gate: '生门', stars: ['天任'], tian: ['壬'], di: '辛' },
      { p: 2, spirit: '太阴', gate: '伤门', stars: ['天冲'], tian: ['戊'], di: '己' },
      { p: 3, spirit: '玄武', gate: '开门', stars: ['天心'], tian: ['丁'], di: '戊' },
      { p: 7, spirit: '腾蛇', gate: '杜门', stars: ['天辅'], tian: ['乙'], di: '癸' },
      { p: 8, spirit: '九地', gate: '惊门', stars: ['天柱'], tian: ['癸'], di: '壬' },
      { p: 1, spirit: '九天', gate: '死门', stars: ['天芮', '天禽'], tian: ['己', '丙'], di: '庚' },
      { p: 6, spirit: '值符', gate: '景门', stars: ['天英'], tian: ['辛'], di: '丁' }
    ]
  },
  {
    id: 'IMG_7648', y: 2025, m: 9, d: 14, hh: 16, mm: 0,
    pillars: '乙巳 乙酉 丙戌 丙申', dun: 'yin', ju: 3,
    zhiFuStar: '天英', zhiFuPalace: 5, zhiShiGate: '景门', zhiShiPalace: 7,
    xunShou: '甲午', xunShouYi: '辛', dayKong: '午未', hourKong: '辰巳',
    palaces: [
      { p: 4, spirit: '太阴', gate: '生门', stars: ['天冲'], tian: ['戊'], di: '乙' },
      { p: 9, spirit: '腾蛇', gate: '伤门', stars: ['天辅'], tian: ['乙'], di: '辛' },
      { p: 2, spirit: '值符', gate: '杜门', stars: ['天英'], tian: ['辛'], di: '己' },
      { p: 3, spirit: '六合', gate: '休门', stars: ['天任'], tian: ['壬'], di: '戊' },
      { p: 7, spirit: '九天', gate: '景门', stars: ['天芮', '天禽'], tian: ['己', '丙'], di: '癸' },
      { p: 8, spirit: '白虎', gate: '开门', stars: ['天蓬'], tian: ['庚'], di: '壬' },
      { p: 1, spirit: '玄武', gate: '惊门', stars: ['天心'], tian: ['丁'], di: '庚' },
      { p: 6, spirit: '九地', gate: '死门', stars: ['天柱'], tian: ['癸'], di: '丁' }
    ]
  }
];
