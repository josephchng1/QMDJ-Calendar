import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CalendarOptions } from './calendar/summary.ts';
import type { DayProjection } from './calendar/hour.ts';
import { useMonthProjection } from './hooks/useMonthProjection.ts';
import { MonthGrid } from './components/MonthGrid.tsx';
import { DayDetailPanel } from './components/DayDetailPanel.tsx';
import { PatternsPanel } from './components/PatternsPanel.tsx';
import { SearchView } from './components/SearchView.tsx';
import { useDayDirections } from './hooks/useDayDirections.ts';
import { Legend } from './components/Legend.tsx';

type Method = 'zhirun' | 'chaibu';
type View = 'calendar' | 'patterns' | 'search';

interface UiState {
  view: View;
  year: number; month: number;                     // displayed month (1..12)
  sel: { y: number; m: number; d: number } | null; // selected day
  hour: number;                                     // selected 时辰 index 0..11
  fx: string | null;                                // selected 格局 id (patterns view)
  method: Method; spiritVariant: boolean; lateZiNextDay: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

function initialState(): UiState {
  const p = new URLSearchParams(location.search);
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth() + 1;
  const ym = p.get('ym');
  if (ym && /^\d{4}-\d{2}$/.test(ym)) { year = +ym.slice(0, 4); month = +ym.slice(5, 7); }

  let sel: UiState['sel'] = null;
  const d = p.get('d');
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    sel = { y: +d.slice(0, 4), m: +d.slice(5, 7), d: +d.slice(8, 10) };
    year = sel.y; month = sel.m;
  }

  return {
    view: p.get('view') === 'patterns' ? 'patterns'
      : p.get('view') === 'search' ? 'search' : 'calendar',
    year, month, sel,
    hour: p.get('h') ? Math.min(11, Math.max(0, +p.get('h')!)) : 0,
    fx: p.get('fx') || null,
    method: p.get('mtd') === 'chaibu' ? 'chaibu' : 'zhirun',
    spiritVariant: p.get('sv') === '1',
    lateZiNextDay: p.get('lz') !== '0',
  };
}

export default function App() {
  const [ui, setUi] = useState<UiState>(initialState);
  const [copied, setCopied] = useState(false);
  const today = useMemo(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }, []);

  const options: CalendarOptions = useMemo(() => ({
    method: ui.method, spiritVariant: ui.spiritVariant, lateZiNextDay: ui.lateZiNextDay,
  }), [ui.method, ui.spiritVariant, ui.lateZiNextDay]);

  const { month, loading } = useMonthProjection(ui.year, ui.month, options);

  // The selected day's 12 时辰 (per-palace boards) — feeds the day panel, computed
  // independently of the loaded month so ±1-day nav works across month boundaries.
  const dayTarget = ui.sel ?? today;
  const needDay = ui.view === 'calendar' && ui.sel != null;
  const { hours: dayHours } = useDayDirections(
    needDay ? dayTarget.y : null, dayTarget.m, dayTarget.d, options);

  // deep-link sync
  useEffect(() => {
    const p = new URLSearchParams();
    if (ui.view !== 'calendar') p.set('view', ui.view);
    p.set('ym', `${ui.year}-${pad(ui.month)}`);
    if (ui.sel) { p.set('d', `${ui.sel.y}-${pad(ui.sel.m)}-${pad(ui.sel.d)}`); p.set('h', String(ui.hour)); }
    if (ui.fx) p.set('fx', ui.fx);
    if (ui.method === 'chaibu') p.set('mtd', 'chaibu');
    if (ui.spiritVariant) p.set('sv', '1');
    if (!ui.lateZiNextDay) p.set('lz', '0');
    history.replaceState(null, '', `?${p.toString()}`);
  }, [ui]);

  const shiftMonth = (delta: number) => setUi((s) => {
    const dt = new Date(s.year, s.month - 1 + delta, 1);
    return { ...s, year: dt.getFullYear(), month: dt.getMonth() + 1, sel: null };
  });
  const goToday = () => setUi((s) => ({ ...s, year: today.y, month: today.m, sel: null }));
  const selectDay = (dayP: DayProjection) =>
    setUi((s) => ({ ...s, sel: { y: dayP.y, m: dayP.m, d: dayP.d }, hour: dayP.peak?.branchIndex ?? 0 }));

  // ±1 day, following across month boundaries; keep the current 时辰 and tab.
  const shiftDay = (delta: number) => setUi((s) => {
    if (!s.sel) return s;
    const dt = new Date(s.sel.y, s.sel.m - 1, s.sel.d + delta);
    const ny = dt.getFullYear(), nm = dt.getMonth() + 1, nd = dt.getDate();
    return { ...s, sel: { y: ny, m: nm, d: nd }, year: ny, month: nm };
  });

  const share = async () => {
    try { await navigator.clipboard.writeText(location.href); } catch { /* address bar has it */ }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const Toggle = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
    <button className="seg rounded-lg px-3 py-1.5 text-xs" data-active={active} onClick={onClick}>{children}</button>
  );

  return (
    <div className="min-h-full max-w-6xl mx-auto px-4 py-6">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-2 mb-5">
        <h1 className="text-xl font-semibold gold tracking-widest">奇門遁甲 · 择日历</h1>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Qimen Calendar · 时家转盘</span>

        {/* view switcher */}
        <div className="flex items-center gap-1 ml-3">
          <Toggle active={ui.view === 'calendar'} onClick={() => setUi((s) => ({ ...s, view: 'calendar' }))}>择日历</Toggle>
          <Toggle active={ui.view === 'patterns'} onClick={() => setUi((s) => ({ ...s, view: 'patterns' }))}>格局</Toggle>
          <Toggle active={ui.view === 'search'} onClick={() => setUi((s) => ({ ...s, view: 'search' }))}>搜索</Toggle>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {ui.view === 'calendar' && (
            <>
              <Toggle active={ui.method === 'zhirun'} onClick={() => setUi((s) => ({ ...s, method: 'zhirun' }))}>置闰</Toggle>
              <Toggle active={ui.method === 'chaibu'} onClick={() => setUi((s) => ({ ...s, method: 'chaibu' }))}>拆补</Toggle>
              <Toggle active={ui.spiritVariant} onClick={() => setUi((s) => ({ ...s, spiritVariant: !s.spiritVariant }))}>神·变体</Toggle>
              <Toggle active={ui.lateZiNextDay} onClick={() => setUi((s) => ({ ...s, lateZiNextDay: !s.lateZiNextDay }))}>晚子时次日</Toggle>
            </>
          )}
          <button className="seg rounded-lg px-3 py-1.5 text-xs" onClick={share}>{copied ? '已复制 ✓' : '复制链接'}</button>
        </div>
      </header>

      {ui.view === 'patterns' ? (
        <PatternsPanel selectedId={ui.fx} onSelect={(id) => setUi((s) => ({ ...s, fx: id }))} />
      ) : ui.view === 'search' ? (
        <SearchView
          options={options}
          onOpenSlot={(y, m, d, branchIndex) =>
            setUi((s) => ({ ...s, view: 'calendar', sel: { y, m, d }, hour: branchIndex, year: y, month: m }))}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-start">
          {/* Calendar */}
          <div className="panel p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button className="seg rounded-lg px-3 py-1.5 text-sm" onClick={() => shiftMonth(-1)}>←</button>
              <h2 className="text-base font-semibold mx-auto">{ui.year} 年 {ui.month} 月</h2>
              <button className="seg rounded-lg px-3 py-1.5 text-sm" onClick={() => shiftMonth(1)}>→</button>
              <button className="seg rounded-lg px-3 py-1.5 text-xs" onClick={goToday}>今天</button>
            </div>

            {month && (
              <MonthGrid month={month} today={today} selected={ui.sel} onSelectDay={selectDay} />
            )}
            {loading && !month && (
              <div className="p-10 text-center" style={{ color: 'var(--text-dim)' }}>计算本月各时辰…</div>
            )}

            <Legend />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              日历只作选日，不显示当日总评。点选任一日期，右侧奇门盘按分数为各方位上色
              （金＝大吉、青＝吉、无色＝不吉），颜色与分数一致；点格可见经典定级依据（rung·reasons）。
            </p>
          </div>

          {/* Day detail / hint */}
          <div>
            {ui.sel && dayHours ? (
              <DayDetailPanel
                date={ui.sel}
                hours={dayHours}
                selectedHour={ui.hour}
                onSelectHour={(i) => setUi((s) => ({ ...s, hour: i }))}
                onPrevDay={() => shiftDay(-1)}
                onNextDay={() => shiftDay(1)}
                onClose={() => setUi((s) => ({ ...s, sel: null }))}
              />
            ) : (
              <div className="panel p-8 text-center flex flex-col gap-2" style={{ minHeight: 200 }}>
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>点选任一日期，查看当日 12 时辰与奇门盘</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
