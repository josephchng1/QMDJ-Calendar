import type { HourSummary } from '../calendar/hour.ts';
import { shichenWindow } from '../calendar/bands.ts';

const BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** One 时辰 row, v2: the hour is DESCRIBED by its prime/good direction counts and
 *  its 主/客 favour — never a single score (§6.2). 五不遇时 hours are struck out. */
export function HourRow({
  branchIndex, ganzhi, summary, isBest, isActive, onClick,
}: {
  branchIndex: number;
  ganzhi: string;
  summary: HourSummary;
  isBest: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const blocked = summary.chartBlocked;
  const { prime, good } = summary.counts;
  const role = summary.hourRoleFavour === 'mover' ? '客' : '主';

  return (
    <button
      onClick={onClick}
      className="cell w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left"
      style={{
        background: isActive ? 'var(--bg-cell)' : 'var(--bg-cell-2)',
        border: `1px solid ${blocked ? 'var(--q-bad)' : isActive ? 'var(--gold-dim)' : 'var(--border)'}`,
        opacity: blocked ? 0.6 : 1,
      }}
    >
      <span className="w-10 text-sm font-semibold" style={{ color: 'var(--text)',
            textDecoration: blocked ? 'line-through' : undefined }}>
        {BRANCH[branchIndex]}时
      </span>
      <span className="w-14 text-xs tabular-nums" style={{ color: 'var(--text-dim)' }}>
        {shichenWindow(branchIndex)}
      </span>
      <span className="text-sm gold tracking-wide">{ganzhi}</span>

      {blocked ? (
        <span className="text-xs" style={{ color: 'var(--q-bad)' }}>五不遇时 · 不用</span>
      ) : (
        <span className="flex items-center gap-2 text-xs tabular-nums">
          <span style={{ color: 'var(--gold)' }}>◆{prime} 大吉</span>
          <span style={{ color: 'var(--q-excellent)' }}>◇{good} 吉</span>
          {!prime && !good && <span style={{ color: 'var(--text-dim)' }}>无可用方位</span>}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--gold)', border: '1px solid var(--gold-dim)' }}>
          ▸{role}
        </span>
        {summary.chartWarnings.filter((w) => w !== '五不遇时').map((w) => (
          <span key={w} className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ color: 'var(--q-bad)', border: '1px solid var(--border)' }}>{w}</span>
        ))}
        {isBest && !blocked && <span className="text-[10px]" style={{ color: 'var(--gold)' }}>★ 今日最佳</span>}
      </div>
    </button>
  );
}
