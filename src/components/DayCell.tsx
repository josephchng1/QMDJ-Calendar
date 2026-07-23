import type { DayProjection } from '../calendar/hour.ts';
import { V2_BAND_COLOR, V2_BAND_LABEL, V2_BAND_TINT } from '../calendar/bandsV2.ts';
import { DIRECTION_LABEL } from '../calendar/direction.ts';

/** One calendar day, v2 projection: the day's PEAK direction (colour = peak band),
 *  a 12-时辰 bar coloured by each hour's best band, and a 大吉-cell tally. A day is
 *  a projection of its best moment, never an average (§5). */
export function DayCell({
  day, isToday, isSelected, onClick,
}: {
  day: DayProjection;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const peak = day.peak;
  const peakColor = peak ? V2_BAND_COLOR[peak.band] : 'var(--text-dim)';
  const peakDir = peak && peak.direction ? DIRECTION_LABEL[peak.direction] : '—';
  const title = peak
    ? `${day.m}/${day.d} · 峰 ${peakDir}方 ${V2_BAND_LABEL[peak.band]} · 大吉${day.primeCells} 吉${day.goodCells}`
    : `${day.m}/${day.d} · 全日五不遇时，无可用方位`;

  return (
    <button
      onClick={onClick}
      className="cell relative flex flex-col gap-1 rounded-lg p-1.5 text-left"
      style={{
        background: peak ? V2_BAND_TINT[peak.band] : 'var(--bg-cell)',
        border: `1px solid ${isSelected ? 'var(--gold-dim)' : 'var(--border)'}`,
        boxShadow: isSelected ? '0 0 0 1px var(--gold-dim)' : undefined,
        minHeight: 62,
      }}
      title={title}
    >
      <div className="flex items-center justify-between leading-none">
        <span className="text-xs font-semibold" style={{ color: isToday ? 'var(--gold)' : 'var(--text)' }}>
          {day.d}{isToday && <span className="text-[9px] ml-0.5">今</span>}
        </span>
        <span className="text-xs font-bold" style={{ color: peakColor }}>{peakDir}</span>
      </div>

      {/* 12-时辰 bar — each segment = that hour's best band */}
      <div className="flex gap-[1px] h-2.5 rounded-sm overflow-hidden">
        {day.hours.map((h) => (
          <span key={h.branchIndex} className="flex-1"
                style={{ background: h.blocked ? 'var(--q-bad)' : V2_BAND_COLOR[h.bestBand],
                         opacity: h.blocked ? 0.5 : 1 }} />
        ))}
      </div>

      {/* 大吉-cell tally + peak-band underline */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] tabular-nums" style={{ color: day.primeCells ? 'var(--gold)' : 'var(--text-dim)' }}>
          ◆{day.primeCells}
        </span>
        <div className="h-[3px] flex-1 rounded-full" style={{ background: peakColor, opacity: 0.9 }} />
      </div>
    </button>
  );
}
