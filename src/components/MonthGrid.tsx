import type { MonthProjection, DayProjection } from '../calendar/hour.ts';
import { DayCell } from './DayCell.tsx';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function MonthGrid({
  month, today, selected, onSelectDay,
}: {
  month: MonthProjection;
  today: { y: number; m: number; d: number };
  selected: { y: number; m: number; d: number } | null;
  onSelectDay: (day: DayProjection) => void;
}) {
  const lead = new Date(month.year, month.month - 1, 1).getDay(); // 0=Sun
  const blanks = Array.from({ length: lead });

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
        {month.days.map((day) => {
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
