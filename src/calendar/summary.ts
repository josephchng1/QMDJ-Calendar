// Shared calendar inputs: the options every chart is built with, and the sample
// hour used for each 时辰.

export interface CalendarOptions {
  method?: 'zhirun' | 'chaibu';
  spiritVariant?: boolean;
  lateZiNextDay?: boolean;
  tzHours?: number;
}

/** Representative sample hour per 时辰 — the midpoint, to stay clear of the
 *  2-hour boundaries where pillars/局 can flip. Index = branch (0=子 … 11=亥). */
export const HOUR_SAMPLE: number[] = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
