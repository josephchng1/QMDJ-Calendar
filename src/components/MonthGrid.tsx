import { DayCell, type CalendarDay } from './DayCell.tsx';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** Days of a civil month. Deliberately a local one-liner rather than an import of
 *  daysInMonth from summary.ts, which would pull the engine into the calendar
 *  chunk for what is a Date call. */
function monthDays(year: number, month: number): CalendarDay[] {
  const n = new Date(year, month, 0).getDate();
  return Array.from({ length: n }, (_, i) => ({ y: year, m: month, d: i + 1 }));
}

/** The month grid is a date picker and nothing else (§6.5) — it takes a year and
 *  a month, not a computed MonthProjection. */
export function MonthGrid({
  year, month, today, selected, onSelectDay,
}: {
  year: number;
  month: number;
  today: { y: number; m: number; d: number };
  selected: { y: number; m: number; d: number } | null;
  onSelectDay: (day: CalendarDay) => void;
}) {
  const lead = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const blanks = Array.from({ length: lead });
  const days = monthDays(year, month);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className="text-center text-[11px] py-1"
               style={{ color: i === 0 || i === 6 ? 'var(--gold-dim)' : 'var(--text-dim)' }}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map((day) => {
          const isToday = today.y === day.y && today.m === day.m && today.d === day.d;
          const isSel = !!selected && selected.y === day.y && selected.m === day.m && selected.d === day.d;
          return (
            <DayCell key={day.d} day={day} isToday={isToday} isSelected={isSel}
                     onClick={() => onSelectDay(day)} />
          );
        })}
      </div>
    </div>
  );
}
