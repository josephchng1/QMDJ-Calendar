/**
 * Solar-term astronomy.
 * Apparent geocentric solar longitude from truncated VSOP87 (see vsop87data.ts),
 * nutation + annual aberration, Delta-T, and a solver that finds the exact
 * moment (to sub-second numerical precision) when the Sun reaches a target
 * longitude. All published times are converted to Beijing/Singapore civil time
 * (UTC+8) unless another offset is requested.
 */
import { XL0, NUT_B, DT_AT } from './vsop87data.ts';

export const RAD = 180 * 3600 / Math.PI; // arcseconds per radian
const PI2 = Math.PI * 2;

/* ---------------- Julian day <-> Gregorian ---------------- */

/** Gregorian calendar date (y,m,d can be fractional day) -> Julian Day (UT). */
export function jdFromGregorian(y: number, m: number, d: number): number {
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

export interface DateTimeParts { y: number; m: number; d: number; hh: number; mm: number; ss: number; }

/** Julian Day -> Gregorian calendar date/time (rounded to whole seconds). */
export function gregorianFromJd(jd: number): DateTimeParts {
  // snap to a whole-second grid first so 59.9999s never appears
  const totalSec = Math.round((jd + 0.5) * 86400);
  const z = Math.floor(totalSec / 86400);
  let secs = totalSec - z * 86400;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d0 = Math.floor(365.25 * c);
  const e = Math.floor((b - d0) / 30.6001);
  const day = b - d0 - Math.floor(30.6001 * e);
  const m = e < 14 ? e - 1 : e - 13;
  const y = m > 2 ? c - 4716 : c - 4715;
  const hh = Math.floor(secs / 3600); secs -= hh * 3600;
  const mm = Math.floor(secs / 60); const ss = secs - mm * 60;
  return { y, m, d: day, hh, mm, ss };
}

/* ---------------- Delta T ---------------- */

function dtExt(y: number, jsd: number): number {
  const dy = (y - 1820) / 100;
  return -20 + jsd * dy * dy;
}

/** Delta T (TT-UT) in seconds for a given (fractional) Gregorian year. */
export function deltaTSeconds(y: number): number {
  const d = DT_AT;
  const y0 = d[d.length - 2];
  const t0 = d[d.length - 1];
  if (y >= y0) {
    const jsd = 31;
    if (y > y0 + 100) return dtExt(y, jsd);
    let v = dtExt(y, jsd);
    const dv = dtExt(y0, jsd) - t0;
    v -= dv * (y0 + 100 - y) / 100;
    return v;
  }
  let i = 0;
  for (i = 0; i < d.length - 5; i += 5) {
    if (y < d[i + 5]) break;
  }
  const t1 = (y - d[i]) / (d[i + 5] - d[i]) * 10;
  const t2 = t1 * t1;
  const t3 = t2 * t1;
  return d[i + 1] + d[i + 2] * t1 + d[i + 3] * t2 + d[i + 4] * t3;
}

/** Delta T in days at Julian-centuries-from-J2000 t (TD). */
export function deltaTDays(t: number): number {
  return deltaTSeconds(2000 + t * 100) / 86400;
}

/* ---------------- Solar longitude ---------------- */

/**
 * Evaluate one coordinate of the truncated VSOP87 Earth series.
 * zn: 0 = heliocentric longitude L, 1 = latitude B, 2 = radius R.
 * t: Julian CENTURIES (TD) from J2000 (converted internally to millennia,
 *    the native time unit of the table's frequencies).
 * n: number of terms per order (<0 means all).
 */
export function xl0Calc(zn: number, t: number, n: number): number {
  t /= 10; // centuries -> Julian millennia (table frequencies are rad/millennium)
  let v = 0;
  let tn = 1;
  const F = XL0;
  const pn = zn * 6 + 1;
  const n0Total = F[pn + 1] - F[pn];
  for (let i = 0; i < 6; i++, tn *= t) {
    const n1 = F[pn + i];
    const n2 = F[pn + i + 1];
    const n0 = n2 - n1;
    if (n0 <= 0) continue;
    let N: number;
    if (n < 0) N = n2;
    else {
      N = Math.floor(3 * n * n0 / n0Total + 0.5) + n1;
      if (i > 0) N += 3;
      if (N > n2) N = n2;
    }
    let c = 0;
    for (let j = n1; j < N; j += 3) {
      c += F[j] * Math.cos(F[j + 1] + t * F[j + 2]);
    }
    v += c * tn;
  }
  v /= F[0];
  return v;
}

/** Nutation in longitude (radians); t in Julian centuries (TD) from J2000. */
export function nutationLon(t: number): number {
  let a = 0;
  const t2 = t * t;
  for (let i = 0; i < NUT_B.length; i += 5) {
    const c = NUT_B[i] + NUT_B[i + 1] * t + NUT_B[i + 2] * t2;
    a += (NUT_B[i + 3] + NUT_B[i + 4] * t / 10) * Math.sin(c);
  }
  return a / 100 / RAD; // coefficients are in units of 0.01"
}

/** Annual aberration for the Sun (radians); t in Julian centuries. */
export function aberrationSun(t: number): number {
  const v = -0.043126 + 628.301955 * t - 0.000002732 * t * t; // mean anomaly-ish argument
  const e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
  return (-20.49552 * (1 + e * Math.cos(v))) / RAD;
}

/**
 * Apparent geocentric solar longitude (radians, not normalised),
 * t in Julian centuries (TD) from J2000.
 */
export function solarApparentLongitude(t: number): number {
  // Earth's heliocentric longitude (mean ecliptic of date, VSOP87D-style)
  let L = xl0Calc(0, t, -1);
  // sxwnl frame correction for the longitude coordinate (arcsec)
  const t10 = t / 10;
  L += (-0.0728 - 2.7702 * t10 - 1.1019 * t10 * t10 - 0.0996 * t10 * t10 * t10) / RAD;
  return L + Math.PI + nutationLon(t) + aberrationSun(t);
}

/* ---------------- Solar term solver ---------------- */

const MEAN_RATE = 628.3319653318; // rad per Julian century

/**
 * Solve for the instant (Julian centuries TD from J2000) when the apparent
 * solar longitude equals W (radians, monotonic/unwrapped).
 */
export function solveSolarLongitude(W: number): number {
  let t = (W - 1.75347 - Math.PI) / MEAN_RATE; // mean-longitude initial guess
  for (let iter = 0; iter < 30; iter++) {
    const cur = solarApparentLongitude(t);
    // unwrap relative to W
    let diff = cur - W;
    diff -= PI2 * Math.round(diff / PI2);
    const dt = -diff / MEAN_RATE;
    t += dt;
    if (Math.abs(dt) < 1e-12) break; // ~3e-6 s
  }
  return t;
}

export const TERM_NAMES = [
  '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰'
]; // index k: solar longitude = k * 15 degrees

export interface SolarTerm {
  name: string;
  /** 0..23, 0 = 春分 (solar longitude 0°) */
  index: number;
  /** solar longitude in degrees */
  longitude: number;
  /** Julian Day in the requested civil timezone (jd of civil clock time) */
  jdLocal: number;
  /** civil date/time parts in the requested timezone */
  time: DateTimeParts;
  /** true if this is a 节 (month-boundary term: 立春, 惊蛰, 清明, ... ) */
  isJie: boolean;
}

/** 节 (month boundaries) are the odd multiples of 15° starting at 立春 (315°). */
function isJieByIndex(k: number): boolean {
  // 节: 立春(21) 惊蛰(23) 清明(1) 立夏(3) 芒种(5) 小暑(7) 立秋(9) 白露(11)
  //     寒露(13) 立冬(15) 大雪(17) 小寒(19)  -> odd indices
  return (k % 2) === 1;
}

/**
 * Exact moment of the solar term whose unwrapped target longitude is
 * W = k*15deg + 360deg*cycle. Returns local-civil Julian Day (UTC+tzHours).
 */
export function termJdLocal(k: number, cycle: number, tzHours = 8): number {
  const W = (k * 15) * Math.PI / 180 + PI2 * cycle;
  const t = solveSolarLongitude(W); // Julian centuries TD
  const jdTT = t * 36525 + 2451545.0;
  const year = 2000 + t * 100;
  const jdUT = jdTT - deltaTSeconds(year) / 86400;
  return jdUT + tzHours / 24;
}

/**
 * All 24 solar terms that fall within a Gregorian calendar year
 * (civil timezone tzHours). Terms are returned in chronological order,
 * 小寒 (early January) first.
 */
export function solarTermsOfYear(year: number, tzHours = 8): SolarTerm[] {
  const out: SolarTerm[] = [];
  // 小寒 of `year` has longitude 285° reached in the cycle that began at the
  // spring equinox of year-1: cycle = year - 2000 - 1 for k >= 19 winter terms...
  // Simpler: scan candidate (k, cycle) pairs around the year and keep those in-year.
  for (let cycle = year - 2002; cycle <= year - 1998; cycle++) {
    for (let k = 0; k < 24; k++) {
      const jd = termJdLocal(k, cycle, tzHours);
      const p = gregorianFromJd(jd);
      if (p.y === year) {
        out.push({
          name: TERM_NAMES[k], index: k, longitude: k * 15,
          jdLocal: jd, time: p, isJie: isJieByIndex(k)
        });
      }
    }
  }
  out.sort((a, b) => a.jdLocal - b.jdLocal);
  return out;
}

/**
 * The solar term in effect at a given local-civil JD, plus the next term.
 * Returned term objects carry exact local JD of the term start.
 */
export function termsBracketing(jdLocal: number, tzHours = 8): { current: SolarTerm; next: SolarTerm } {
  const p = gregorianFromJd(jdLocal);
  const terms: SolarTerm[] = [
    ...solarTermsOfYear(p.y - 1, tzHours),
    ...solarTermsOfYear(p.y, tzHours),
    ...solarTermsOfYear(p.y + 1, tzHours)
  ];
  let cur = terms[0];
  let next = terms[terms.length - 1];
  for (let i = 0; i < terms.length; i++) {
    if (terms[i].jdLocal <= jdLocal) cur = terms[i];
    else { next = terms[i]; break; }
  }
  return { current: cur, next };
}

/**
 * Exact local-civil JD of a specific solstice.
 * kind: 'winter' (冬至, 270°) or 'summer' (夏至, 90°); nearest to given year.
 */
export function solsticeJdLocal(year: number, kind: 'winter' | 'summer', tzHours = 8): number {
  const k = kind === 'winter' ? 18 : 6;
  // Unwrapped longitude at J2000 is ~280.46°, so the terms of calendar year Y
  // sit in cycle Y-2000+1 (winter) / Y-2000 (summer); verified & self-corrected below.
  const cycle = year - 2000 + (kind === 'winter' ? 1 : 0);
  const jd = termJdLocal(k, cycle, tzHours);
  const p = gregorianFromJd(jd);
  if (p.y === year) return jd;
  // adjust cycle if boundary artefacts
  return termJdLocal(k, cycle + (p.y < year ? 1 : -1), tzHours);
}
