import { useState } from 'react';
import type { DaySummary, CalendarOptions } from '../calendar/summary.ts';
import type { ChartInput } from '../types.ts';
import { useChart } from '../hooks/useChart.ts';
import { HourRow } from './HourRow.tsx';
import { SummaryHeader } from './SummaryHeader.tsx';
import { FourPillarsBar } from './FourPillarsBar.tsx';
import { PalaceGrid } from './PalaceGrid.tsx';
import { bandColor, BAND_LABEL } from '../calendar/bands.ts';

type Tab = 'hours' | 'chart';

export function DayDetailPanel({
  day, options, selectedHour, onSelectHour, onClose,
}: {
  day: DaySummary;
  options: CalendarOptions;
  selectedHour: number;
  onSelectHour: (i: number) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('hours');
  const h = day.hours[selectedHour];

  const input: ChartInput = {
    y: day.y, m: day.m, d: day.d, hh: h.hh, mm: 0, ...options,
  };
  const { chart, loading } = useChart(input);

  const openChart = (i: number) => { onSelectHour(i); setTab('chart'); };
  const step = (delta: number) => onSelectHour(Math.min(11, Math.max(0, selectedHour + delta)));

  return (
    <div className="panel gold-frame p-4 flex flex-col gap-3" style={{ minHeight: 420 }}>
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold">
          {day.y}年{day.m}月{day.d}日
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ color: bandColor(day.dayBand), border: '1px solid var(--border)' }}>
          日评 {BAND_LABEL[day.dayBand]}
        </span>
        <button className="seg rounded-lg px-2.5 py-1 text-xs ml-auto" onClick={onClose}>关闭 ✕</button>
      </div>

      <div className="flex gap-1">
        <button className="seg rounded-lg px-3 py-1.5 text-xs" data-active={tab === 'hours'}
                onClick={() => setTab('hours')}>时辰总览</button>
        <button className="seg rounded-lg px-3 py-1.5 text-xs" data-active={tab === 'chart'}
                onClick={() => setTab('chart')}>奇门盘</button>
      </div>

      {tab === 'hours' && (
        <div className="flex flex-col gap-1">
          {day.hours.map((hr, i) => (
            <HourRow key={i} hour={hr} isBest={i === day.bestIndex}
                     isActive={i === selectedHour} onClick={() => openChart(i)} />
          ))}
        </div>
      )}

      {tab === 'chart' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button className="seg rounded-lg px-3 py-1.5 text-sm" onClick={() => step(-1)}
                    disabled={selectedHour === 0}>← 前一时辰</button>
            <span className="text-sm gold mx-auto">{h.branch}时 · {h.ganzhi}</span>
            <button className="seg rounded-lg px-3 py-1.5 text-sm" onClick={() => step(1)}
                    disabled={selectedHour === 11}>后一时辰 →</button>
          </div>
          {chart && <SummaryHeader chart={chart} />}
          {chart && <FourPillarsBar chart={chart} />}
          {chart && <PalaceGrid board={chart.board} />}
          {loading && !chart && (
            <div className="panel p-8 text-center" style={{ color: 'var(--text-dim)' }}>计算中…</div>
          )}
        </div>
      )}
    </div>
  );
}
