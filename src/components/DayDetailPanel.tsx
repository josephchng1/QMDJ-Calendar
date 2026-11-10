import { useState } from 'react';
import type { DirHour } from '../hooks/useDayDirections.ts';
import { HourRow } from './HourRow.tsx';
import { SummaryHeader } from './SummaryHeader.tsx';
import { FourPillarsBar } from './FourPillarsBar.tsx';
import { PalaceGrid } from './PalaceGrid.tsx';
import { Chip, GradeChips } from './PalaceReasons.tsx';
import { scoreCounts } from '../calendar/bandsV2.ts';
import { shichenWindow } from '../calendar/bands.ts';
import { directionOf, DIRECTION_LABEL } from '../calendar/direction.ts';
import { ACTIVITY_ORDER, activityLabel } from '../calendar/data/presets.ts';
import type { ApplicationTag } from '../calendar/data/patterns.ts';
import { slotEvent, downloadIcs, googleCalendarUrl } from '../calendar/ics.ts';

const BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

type Tab = 'hours' | 'chart';

/** Right-hand day panel, v2. The 时辰总览 tab lists 12 hours described by their
 *  direction counts; the 奇门盘 tab shows the hour's board WITH per-palace
 *  score-band shading + a corner score (§6.6). */
export function DayDetailPanel({
  date, hours, selectedHour, onSelectHour, onPrevDay, onNextDay, onClose, onNow, activity, onSelectActivity,
  initialTab = 'hours',
}: {
  date: { y: number; m: number; d: number };
  hours: DirHour[];
  selectedHour: number | null;   // null = no 时辰 chosen yet
  onSelectHour: (i: number) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onClose: () => void;
  onNow: () => void;
  activity: ApplicationTag | null;
  onSelectActivity: (a: ApplicationTag | null) => void;
  initialTab?: Tab;   // read on mount only (a search hit opens straight on 奇门盘)
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const curIndex = Math.min(selectedHour ?? 0, hours.length - 1);
  const cur = hours[curIndex] ?? hours[0];
  const chart = cur.chart;
  // 时干 to box on the board; 甲 hides under its 旬首 仪 (§10.5).
  const hourStem = chart.pillars.hour.name[0] === '甲' ? chart.board.xunShouYi : chart.pillars.hour.name[0];
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
  // Stepping past 亥 / before 子 rolls into the next / previous day.
  const step = (delta: number) => {
    const next = curIndex + delta;
    if (next > 11) { onNextDay(); onSelectHour(0); }
    else if (next < 0) { onPrevDay(); onSelectHour(11); }
    else onSelectHour(next);
  };

  const roleText = summary.hourRoleFavour && (summary.hourRoleFavour === 'mover' ? '客 · 主动出击' : '主 · 按兵不动');
  const emergency = summary.emergencyDirections
    .map((p) => DIRECTION_LABEL[directionOf(p)!] ?? '')
    .filter(Boolean);

  const tz = chart.input.tzHours ?? 8;
  const calEvent = slotEvent(date, curIndex, summary.palaces, tz);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const icsName = `qmdj-${date.y}${pad2(date.m)}${pad2(date.d)}-h${curIndex}.ics`;

  return (
    <div className="panel gold-frame p-4 flex flex-col gap-3" style={{ minHeight: 420 }}>
      <div className="flex flex-wrap items-center gap-2">
        <button className="seg rounded-lg px-2.5 py-1 text-sm" onClick={onPrevDay} title="前一天">‹ 日</button>
        <h2 className="text-base font-semibold">{date.y}年{date.m}月{date.d}日</h2>
        <button className="seg rounded-lg px-2.5 py-1 text-sm" onClick={onNextDay} title="后一天">日 ›</button>
        <button className="seg rounded-lg px-2.5 py-1 text-xs" onClick={onNow} title="回到今天 · 当前时辰">此刻</button>
        <select
          className="seg rounded-lg px-2 py-1 text-xs ml-auto"
          value={activity ?? ''}
          onChange={(e) => onSelectActivity((e.target.value || null) as ApplicationTag | null)}
          title="用事（按用神择向）"
          style={{ background: 'var(--bg-cell-2)', color: 'var(--text)', borderColor: activity ? 'var(--gold-dim)' : undefined }}
        >
          <option value="">总览</option>
          {ACTIVITY_ORDER.map((a) => <option key={a} value={a}>{activityLabel(a)}</option>)}
        </select>
        <button className="seg rounded-lg px-3 py-1.5 text-xs" onClick={onClose}>关闭 ✕</button>
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

      {tab === 'chart' && selectedHour == null && (
        <div className="p-8 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
          在「时辰总览」点选一个时辰，查看其奇门盘
        </div>
      )}

      {tab === 'chart' && selectedHour != null && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button className="seg rounded-lg px-3 py-1.5 text-sm" onClick={() => step(-1)}>← 前一时辰</button>
            <span className="text-sm mx-auto" style={{ color: 'var(--text-dim)' }}>{BRANCH[curIndex]}时 <span className="tabular-nums">{shichenWindow(curIndex)}</span> <span className="text-xs">UTC{tz < 0 ? '−' : '+'}{Math.abs(tz)}</span></span>
            <button className="seg rounded-lg px-3 py-1.5 text-sm" onClick={() => step(1)}>后一时辰 →</button>
          </div>
          <FourPillarsBar chart={chart} />

          {/* 主客 / 急则从神 / chart warnings — direction context for the graded board */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <GradeChips grades={summary.chartGrades} />
            {roleText && <Chip text={`宜为${roleText}`} color="var(--gold)" />}
            {emergency.length > 0 && <Chip text={`急则从神：${emergency.join('、')}`} color="var(--q-caution)" />}
            {summary.chartWarnings.map((w) => <Chip key={w} text={w} color="var(--q-bad)" />)}
          </div>

          <PalaceGrid board={chart.board} scores={summary.palaces} hourStem={hourStem} />

          {/* add-to-calendar for the selected 时辰 (client-side .ics + Google) */}
          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: 'var(--text-dim)' }}>加入日历</span>
            <button className="seg rounded-lg px-2.5 py-1"
                    onClick={() => downloadIcs(calEvent, icsName)}>下载 .ics</button>
            <a className="seg rounded-lg px-2.5 py-1"
               href={googleCalendarUrl(calEvent)} target="_blank" rel="noopener noreferrer">Google 日历</a>
          </div>

          <SummaryHeader chart={chart} />
        </div>
      )}
    </div>
  );
}
