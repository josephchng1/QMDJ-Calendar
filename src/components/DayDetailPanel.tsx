import { useState } from 'react';
import type { DirHour } from '../hooks/useDayDirections.ts';
import { HourRow } from './HourRow.tsx';
import { SummaryHeader } from './SummaryHeader.tsx';
import { FourPillarsBar } from './FourPillarsBar.tsx';
import { PalaceGrid } from './PalaceGrid.tsx';
import { Chip } from './PalaceReasons.tsx';
import { directionOf, DIRECTION_LABEL } from '../calendar/direction.ts';

type Tab = 'hours' | 'chart';

/** Right-hand day panel, v2. The 时辰总览 tab lists 12 hours described by their
 *  direction counts (not a score); the 奇门盘 tab shows the hour's board WITH its
 *  per-palace band shading + corner score (architecture §6.6) — the palace grading
 *  lives here, not in a standalone tab. Charts come from the same `daydir` payload. */
export function DayDetailPanel({
  date, hours, selectedHour, onSelectHour, onPrevDay, onNextDay, onClose,
}: {
  date: { y: number; m: number; d: number };
  hours: DirHour[];
  selectedHour: number;
  onSelectHour: (i: number) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('hours');
  const cur = hours[Math.min(selectedHour, hours.length - 1)] ?? hours[0];
  const chart = cur.chart;
  const summary = cur.summary;
  const hourStem = chart.pillars.hour.name.charAt(0);

  // day tally + best hour (most 大吉 cells, then 吉), skipping 五不遇时 hours.
  let primeCells = 0, goodCells = 0, bestIndex = 0, bestKey = -1;
  hours.forEach((h, i) => {
    primeCells += h.summary.counts.prime;
    goodCells += h.summary.counts.good;
    if (h.summary.chartBlocked) return;
    const k = h.summary.counts.prime * 100 + h.summary.counts.good;
    if (k > bestKey) { bestKey = k; bestIndex = i; }
  });

  const openChart = (i: number) => { onSelectHour(i); setTab('chart'); };
  const step = (delta: number) => onSelectHour(Math.min(11, Math.max(0, selectedHour + delta)));

  const roleText = summary.hourRoleFavour === 'mover' ? '客 · 主动出击' : '主 · 按兵不动';
  const emergency = summary.emergencyDirections
    .map((p) => DIRECTION_LABEL[directionOf(p)!] ?? '')
    .filter(Boolean);

  return (
    <div className="panel gold-frame p-4 flex flex-col gap-3" style={{ minHeight: 420 }}>
      <div className="flex items-center gap-2">
        <button className="seg rounded-lg px-2.5 py-1 text-sm" onClick={onPrevDay} title="前一天">‹ 日</button>
        <h2 className="text-base font-semibold">{date.y}年{date.m}月{date.d}日</h2>
        <button className="seg rounded-lg px-2.5 py-1 text-sm" onClick={onNextDay} title="后一天">日 ›</button>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--gold)' }}>大吉 {primeCells}</span>
          <span style={{ color: 'var(--text-dim)' }}> · </span>
          <span style={{ color: 'var(--q-excellent)' }}>吉 {goodCells}</span>
          <span style={{ color: 'var(--text-dim)' }}> 个方位</span>
        </span>
        <button className="seg rounded-lg px-3 py-1.5 text-xs ml-auto" onClick={onClose}>关闭 ✕</button>
      </div>

      <div className="flex gap-1">
        <button className="seg rounded-lg px-3 py-1.5 text-xs" data-active={tab === 'hours'}
                onClick={() => setTab('hours')}>时辰总览</button>
        <button className="seg rounded-lg px-3 py-1.5 text-xs" data-active={tab === 'chart'}
                onClick={() => setTab('chart')}>奇门盘</button>
      </div>

      {tab === 'hours' && (
        <div className="flex flex-col gap-1">
          {hours.map((h, i) => (
            <HourRow key={i} branchIndex={i} ganzhi={h.chart.pillars.hour.name} summary={h.summary}
                     isBest={i === bestIndex} isActive={i === selectedHour} onClick={() => openChart(i)} />
          ))}
        </div>
      )}

      {tab === 'chart' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button className="seg rounded-lg px-3 py-1.5 text-sm" onClick={() => step(-1)}
                    disabled={selectedHour === 0}>← 前一时辰</button>
            <span className="text-sm gold mx-auto">{chart.pillars.hour.name}时</span>
            <button className="seg rounded-lg px-3 py-1.5 text-sm" onClick={() => step(1)}
                    disabled={selectedHour === 11}>后一时辰 →</button>
          </div>
          <SummaryHeader chart={chart} />

          {/* 主客 / 急则从神 / chart warnings — direction context for the graded board */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Chip text={`宜为${roleText}`} color="var(--gold)" />
            {emergency.length > 0 && <Chip text={`急则从神：${emergency.join('、')}`} color="var(--q-caution)" />}
            {summary.chartWarnings.map((w) => <Chip key={w} text={w} color="var(--q-bad)" />)}
          </div>

          <FourPillarsBar chart={chart} />
          <PalaceGrid board={chart.board} hourStem={hourStem} scores={summary.palaces} />
        </div>
      )}
    </div>
  );
}
