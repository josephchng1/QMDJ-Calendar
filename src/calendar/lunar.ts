// 农历 date from the platform's Chinese calendar (spec S6) — no dependency, no lunar algorithm.
const FMT = new Intl.DateTimeFormat('zh-CN-u-ca-chinese',
  { month: 'long', day: 'numeric', timeZone: 'UTC' });
const SUPPORTED = FMT.resolvedOptions().calendar === 'chinese';

const DIGIT = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const dayName = (n: number) =>
  n <= 10 ? '初' + DIGIT[n] : n < 20 ? '十' + DIGIT[n - 10] : n === 20 ? '二十' : n < 30 ? '廿' + DIGIT[n - 20] : '三十';
// match the reference app's wording
const monthName = (s: string) => s.replace(/^(闰?)十一月$/, '$1冬月').replace(/^(闰?)十二月$/, '$1腊月');

/** { month: '闰六月', day: '廿九', first: false } for a civil date, or null if unsupported. */
export function lunarDate(y: number, m: number, d: number) {
  if (!SUPPORTED) return null;
  const parts = FMT.formatToParts(new Date(Date.UTC(y, m - 1, d)));
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  if (!month || !day) return null;
  return { month: monthName(month), day: dayName(day), first: day === 1 };
}
