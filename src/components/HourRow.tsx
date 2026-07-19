import type { HourRating } from '../calendar/summary.ts';
import { bandColor, BAND_LABEL, shichenWindow } from '../calendar/bands.ts';

export function HourRow({
  hour, isBest, isActive, onClick,
}: {
  hour: HourRating;
  isBest: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const c = bandColor(hour.band);
  return (
    <button
      onClick={onClick}
      className="cell w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left"
      style={{
        background: isActive ? 'var(--bg-cell)' : 'var(--bg-cell-2)',
        border: `1px solid ${isActive ? 'var(--gold-dim)' : 'var(--border)'}`,
      }}
    >
      <span className="swatch" style={{ background: c }} />
      <span className="w-10 text-sm font-semibold" style={{ color: 'var(--text)' }}>
        {hour.branch}时
      </span>
      <span className="w-14 text-xs tabular-nums" style={{ color: 'var(--text-dim)' }}>
        {shichenWindow(hour.branchIndex)}
      </span>
      <span className="text-sm gold tracking-wide">{hour.ganzhi}</span>
      <span className="text-xs font-medium" style={{ color: c }}>{BAND_LABEL[hour.band]}</span>
      <div className="ml-auto flex items-center gap-1.5">
        {hour.warnings.map((w) => (
          <span key={w} className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ color: 'var(--q-bad)', border: '1px solid var(--border)' }}>
            {w}
          </span>
        ))}
        {isBest && <span className="text-[10px]" style={{ color: 'var(--gold)' }}>★ 今日最佳</span>}
      </div>
    </button>
  );
}
