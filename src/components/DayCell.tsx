import type { DaySummary } from '../calendar/summary.ts';
import { bandColor, BAND_LABEL, scorePercent } from '../calendar/bands.ts';

/** One calendar day: date number, an at-a-glance score, a 12-segment quality bar
 *  (one per 时辰), and a faint tint keyed to the day's aggregate band. */
export function DayCell({
  day, isToday, isSelected, onClick,
}: {
  day: DaySummary;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tint = bandColor(day.dayBand);
  const pct = scorePercent(day.dayScore);
  return (
    <button
      onClick={onClick}
      className="cell relative flex flex-col gap-1 rounded-lg p-1.5 text-left"
      style={{
        background: 'var(--bg-cell)',
        border: `1px solid ${isSelected ? 'var(--gold-dim)' : 'var(--border)'}`,
        boxShadow: isSelected ? '0 0 0 1px var(--gold-dim)' : undefined,
        minHeight: 62,
      }}
      title={`${day.m}/${day.d} · ${BAND_LABEL[day.dayBand]} · ${pct}`}
    >
      <div className="flex items-center justify-between leading-none">
        <span className="text-xs font-semibold"
              style={{ color: isToday ? 'var(--gold)' : 'var(--text)' }}>
          {day.d}{isToday && <span className="text-[9px] ml-0.5">今</span>}
        </span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color: tint }}>
          {pct}
        </span>
      </div>

      {/* 12-时辰 quality bar */}
      <div className="flex gap-[1px] h-2.5 rounded-sm overflow-hidden">
        {day.hours.map((h, i) => (
          <span key={i} className="flex-1" style={{ background: bandColor(h.band) }} />
        ))}
      </div>

      {/* day-band underline */}
      <div className="h-[3px] rounded-full" style={{ background: tint, opacity: 0.9 }} />
    </button>
  );
}
