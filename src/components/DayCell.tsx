/** One calendar day. Per architecture §6.5 the day cell carries NO shade and NO
 *  score — the day-level roll-up is not a meaningful single quality, so the cell
 *  is a plain date picker. Directional quality lives one level down, per hour and
 *  per palace, in the day panel's 奇门盘 chart (§6.6).
 *
 *  It therefore takes a bare date. It used to take a computed DayProjection while
 *  rendering nothing but the day number, which forced the calendar to project the
 *  entire month — 372 charts — to draw a grid of numbers. */
import { useSettings } from '../settings.ts';
import { lunarDate } from '../calendar/lunar.ts';
import { dayGanZhi, dayNumber } from '../engine/ganzhi.ts';

export interface CalendarDay { y: number; m: number; d: number }

export function DayCell({
  day, isToday, isSelected, onClick,
}: {
  day: CalendarDay;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { settings } = useSettings();
  const lunar = lunarDate(day.y, day.m, day.d);
  const gz = dayGanZhi(dayNumber(day.y, day.m, day.d)).name;
  const title = [`${day.m}/${day.d}`, lunar && `农历${lunar.month}${lunar.day}`, `${gz}日`].filter(Boolean).join(' · ');
  return (
    <button
      onClick={onClick}
      className="cell relative flex flex-col items-start rounded-lg p-1.5 text-left"
      style={{
        background: 'var(--bg-cell)',
        border: `1px solid ${isSelected ? 'var(--gold-dim)' : 'var(--border)'}`,
        boxShadow: isSelected ? '0 0 0 1px var(--gold-dim)' : undefined,
        minHeight: 44,
      }}
      title={title}
    >
      <span className="text-sm font-semibold" style={{ color: isToday ? 'var(--gold)' : 'var(--text)' }}>
        {day.d}{isToday && <span className="text-[9px] ml-0.5">今</span>}
      </span>
      {settings.showLunar && lunar && (
        <span className="text-[10px] leading-tight" style={{ color: lunar.first ? 'var(--gold-dim)' : 'var(--text-dim)' }}>
          {lunar.first ? lunar.month : lunar.day}
        </span>
      )}
      {settings.showDayGanzhi && <span className="text-[10px] leading-tight" style={{ color: 'var(--text-dim)' }}>{gz}</span>}
    </button>
  );
}
