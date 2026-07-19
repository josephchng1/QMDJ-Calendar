/**
 * 干支 (sexagenary) calendar: day/hour/month/year pillars, 旬首, 空亡, 驿马.
 * Day-pillar anchor verified against 2000-01-01 = 戊午 and ten reference charts
 * (2019-2026).
 */
import { jdFromGregorian, gregorianFromJd, termsBracketing, solarTermsOfYear, type SolarTerm } from './astro.ts';

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export interface GanZhi { index: number; stem: number; branch: number; name: string; }

export function ganZhi(index60: number): GanZhi {
  const i = ((index60 % 60) + 60) % 60;
  return { index: i, stem: i % 10, branch: i % 12, name: STEMS[i % 10] + BRANCHES[i % 12] };
}

/** Day number (integer): local civil days since 2000-01-01. */
export function dayNumber(y: number, m: number, d: number): number {
  return Math.round(jdFromGregorian(y, m, d) - jdFromGregorian(2000, 1, 1));
}

export function dateFromDayNumber(n: number): { y: number; m: number; d: number } {
  const p = gregorianFromJd(jdFromGregorian(2000, 1, 1) + n);
  return { y: p.y, m: p.m, d: p.d };
}

/** Day pillar for a local civil date. 2000-01-01 = 戊午 (index 54). */
export function dayGanZhi(dayNum: number): GanZhi {
  return ganZhi(54 + dayNum);
}

/** Hour branch 0..11 for local time; 23:00-24:00 and 00:00-01:00 are both 子(0). */
export function hourBranch(hh: number, mm: number): number {
  const minutes = hh * 60 + mm;
  return Math.floor(((minutes + 60) % 1440) / 120);
}

/**
 * Hour pillar via 五鼠遁: the 子 hour of a 甲/己 day is 甲子, of 乙/庚 day 丙子, etc.
 * dayStem: stem index of the (possibly advanced) day pillar.
 */
export function hourGanZhi(dayStem: number, branch: number): GanZhi {
  const startStem = (dayStem % 5) * 2; // 甲己->甲(0), 乙庚->丙(2), 丙辛->戊(4), 丁壬->庚(6), 戊癸->壬(8)
  const s = (startStem + branch) % 10; // hour stem
  for (let i = branch; i < 60; i += 12) if (i % 10 === s) return ganZhi(i);
  /* unreachable */ return ganZhi(0);
}

/** Year pillar: year of the 立春-bounded solar year. 1984 = 甲子. */
export function yearGanZhi(effectiveYear: number): GanZhi {
  return ganZhi(effectiveYear - 1984);
}

/**
 * Month pillar via 五虎遁 from the year stem.
 * monthIndex: 0 = 寅月 (from 立春), 1 = 卯月 (from 惊蛰), ... 11 = 丑月.
 */
export function monthGanZhi(yearStem: number, monthIndex: number): GanZhi {
  const firstStem = ((yearStem % 5) * 2 + 2) % 10; // 甲己->丙, 乙庚->戊, 丙辛->庚, 丁壬->壬, 戊癸->甲
  const stem = (firstStem + monthIndex) % 10;
  const branch = (2 + monthIndex) % 12;
  for (let i = branch; i < 60; i += 12) if (i % 10 === stem) return ganZhi(i);
  return ganZhi(0);
}

/** 旬首 of a pillar: the 甲x day/hour that opens its ten-day/ten-hour decade. */
export function xunShou(gz: GanZhi): GanZhi {
  return ganZhi(gz.index - (gz.index % 10));
}

/** 空亡 (void branches) of the 旬 that contains gz: the two branches missing from its decade. */
export function kongWang(gz: GanZhi): [number, number] {
  const shou = gz.index - (gz.index % 10); // 甲x index; its branch:
  const b = shou % 12;
  return [(b + 10) % 12, (b + 11) % 12];
}

/** 驿马 (traveling horse) branch from a branch (usually 时支). 申子辰→寅 寅午戌→申 巳酉丑→亥 亥卯未→巳 */
export function yiMa(branch: number): number {
  const mod = branch % 4; // 子0辰4申8 -> 0; 丑1巳5酉9 -> 1; 寅2午6戌10 -> 2; 卯3未7亥11 -> 3
  switch (mod) {
    case 0: return 2;  // 申子辰 -> 寅
    case 1: return 11; // 巳酉丑 -> 亥
    case 2: return 8;  // 寅午戌 -> 申
    default: return 5; // 亥卯未 -> 巳
  }
}

export interface FourPillars {
  year: GanZhi; month: GanZhi; day: GanZhi; hour: GanZhi;
  /** civil day number actually used for the day pillar (advanced by 1 in 晚子时 with lateZiNextDay) */
  qimenDayNum: number;
  /** true when the input time is 23:00-24:00 */
  isLateZi: boolean;
  currentTerm: SolarTerm; nextTerm: SolarTerm;
  hourKongWang: [number, number]; dayKongWang: [number, number];
  hourXunShou: GanZhi;
  maXing: number;
}

export interface PillarOptions {
  /** 晚子时 (23:00-24:00): advance the day pillar to the next civil day (default true, matches app 算次日). */
  lateZiNextDay?: boolean;
  /** civil timezone offset in hours (default 8 = Beijing/Singapore). */
  tzHours?: number;
}

/**
 * Four pillars for a local civil moment.
 * Month/year pillars strictly follow solar-term (节) boundaries evaluated at the
 * exact input moment — this fixes the "Gregorian month" bug.
 */
export function fourPillars(y: number, m: number, d: number, hh: number, mm: number, opt: PillarOptions = {}): FourPillars {
  const lateZiNextDay = opt.lateZiNextDay !== false;
  const tz = opt.tzHours ?? 8;
  const jdLocal = jdFromGregorian(y, m, d) + (hh * 60 + mm) / 1440;
  const { current, next } = termsBracketing(jdLocal, tz);

  // ---- year & month from solar terms at the exact moment ----
  // month index: count 节 (odd term indices) from 立春 (index 21)
  // solar longitude of current position determines month: month = floor((lon - 315)/30) mod 12 using the current 节
  const jieIndex = current.isJie ? current.index : ((current.index + 23) % 24); // the 节 governing this moment
  const monthIdx = (((jieIndex - 21 + 24) % 24) / 2) | 0; // 立春->0, 惊蛰->1, ...
  // effective (立春-bounded) year:
  let effYear = y;
  // if we are before 立春 of year y, effective year is y-1
  const lichunJd = (() => {
    const terms = solarTermsOfYear(y, tz);
    const t = terms.find(t => t.index === 21);
    return t ? t.jdLocal : jdFromGregorian(y, 2, 4);
  })();
  if (jdLocal < lichunJd) effYear = y - 1;
  const yearGz = yearGanZhi(effYear);
  const monthGz = monthGanZhi(yearGz.stem, monthIdx);

  // ---- day & hour ----
  const isLateZi = hh === 23;
  let dayNum = dayNumber(y, m, d);
  if (isLateZi && lateZiNextDay) dayNum += 1;
  const dayGz = dayGanZhi(dayNum);
  const hb = hourBranch(hh, mm);
  const hourGz = hourGanZhi(dayGz.stem, hb);

  return {
    year: yearGz, month: monthGz, day: dayGz, hour: hourGz,
    qimenDayNum: dayNum, isLateZi,
    currentTerm: current, nextTerm: next,
    hourKongWang: kongWang(hourGz), dayKongWang: kongWang(dayGz),
    hourXunShou: xunShou(hourGz),
    maXing: yiMa(hourGz.branch)
  };
}
