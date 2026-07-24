import { useState } from 'react';
import type { DirHour } from '../hooks/useDayDirections.ts';
import { HourRow } from './HourRow.tsx';
import { SummaryHeader } from './SummaryHeader.tsx';
import { FourPillarsBar } from './FourPillarsBar.tsx';
import { PalaceGrid } from './PalaceGrid.tsx';
import { Chip } from './PalaceReasons.tsx';
import { scoreCounts } from '../calendar/bandsV2.ts';
import { directionOf, DIRECTION_LABEL } from '../calendar/direction.ts';

const BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

type Tab = 'hours' | 'chart';

/** Right-hand day panel, v2. The 时辰总览 tab lists 12 hours described by their
 *  direction counts; the 奇门盘 tab shows the hour's board WITH per-palace
 *  score-band shading + a corner score (§6.6). */
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

  // best hour (most 大吉 by score, then 吉), skipping 五不遇时 — for row highlight only.
  let bestIndex = 0, bestKey = -1;
  hours.forEach((h, i) => {
    if (h.summary.chartBlocked) return;
    const c = scoreCounts(h.summary.palaces);
    const k = c.prime * 100 + c.good;
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
            <span className="text-sm mx-auto" style={{ color: 'var(--text-dim)' }}>{BRANCH[selectedHour]}时</span>
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
          <PalaceGrid board={chart.board} scores={summary.palaces} />
        </div>
      )}
    </div>
  );
}
