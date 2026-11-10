import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CalendarOptions } from './calendar/summary.ts';
import { MonthGrid } from './components/MonthGrid.tsx';
import { DayDetailPanel } from './components/DayDetailPanel.tsx';
import { PatternsPanel } from './components/PatternsPanel.tsx';
import { SearchView } from './components/SearchView.tsx';
import { useDayDirections } from './hooks/useDayDirections.ts';
import { Legend } from './components/Legend.tsx';
import { ACTIVITY_ORDER } from './calendar/data/presets.ts';
import type { ApplicationTag } from './calendar/data/patterns.ts';

type Method = 'zhirun' | 'chaibu';
type View = 'calendar' | 'patterns' | 'search';

interface UiState {
  view: View;
  year: number; month: number;                     // displayed month (1..12)
  sel: { y: number; m: number; d: number } | null; // selected day
  hour: number | null;                              // selected 时辰 index 0..11; null = none chosen
  fx: string | null;                                // selected 格局 id (patterns view)
  method: Method; spiritVariant: boolean; lateZiNextDay: boolean;
  tz: number;                                       // UTC offset (hours) charts and "now" are computed in
  activity: ApplicationTag | null;               // 用事 for purpose-mode direction grading
}

const pad = (n: number) => String(n).padStart(2, '0');

// Every real-world UTC offset: half hours from -12 to +14, plus Nepal/Eucla/Chatham.
const TZ_OFFSETS = [...Array.from({ length: 53 }, (_, i) => i / 2 - 12), 5.75, 8.75, 12.75].sort((a, b) => a - b);
const tzLabel = (tz: number) =>
  `UTC${tz < 0 ? '−' : '+'}${Math.trunc(Math.abs(tz))}${tz % 1 ? ':' + pad(Math.round((Math.abs(tz) % 1) * 60)) : ''}`;

/** The current day and 时辰 in UTC+tz. Shifted +1h because 子时 opens the day at 23:00. */
function nowIn(tz: number) {
  const t = new Date(Date.now() + (tz + 1) * 3600e3);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), hour: Math.floor(t.getUTCHours() / 2) };
}

function initialState(): UiState {
  const p = new URLSearchParams(location.search);
  const tzParam = Number(p.get('tz'));
  const tz = p.get('tz') && TZ_OFFSETS.includes(tzParam) ? tzParam : -new Date().getTimezoneOffset() / 60;
  const now = nowIn(tz);
  let year = now.y, month = now.m;
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
    hour: p.get('h') ? Math.min(11, Math.max(0, +p.get('h')!)) : null,
    fx: p.get('fx') || null,
    method: p.get('mtd') === 'chaibu' ? 'chaibu' : 'zhirun',
    spiritVariant: p.get('sv') === '1',
    lateZiNextDay: p.get('lz') !== '0',
    tz,
    activity: (ACTIVITY_ORDER as string[]).includes(p.get('act') ?? '') ? (p.get('act') as ApplicationTag) : null,
  };
}

export default function App() {
  const [ui, setUi] = useState<UiState>(initialState);
  const [copied, setCopied] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  const today = useMemo(() => nowIn(ui.tz), [ui.tz]);

  const options: CalendarOptions = useMemo(() => ({
    method: ui.method, spiritVariant: ui.spiritVariant, lateZiNextDay: ui.lateZiNextDay, tzHours: ui.tz,
  }), [ui.method, ui.spiritVariant, ui.lateZiNextDay, ui.tz]);

  // The selected day's 12 时辰 (per-palace boards) — feeds the day panel, computed
  // independently of the loaded month so ±1-day nav works across month boundaries.
  const dayTarget = ui.sel ?? today;
  const needDay = ui.view === 'calendar' && ui.sel != null;
  const { hours: dayHours, day: hoursDay, fresh: dayFresh, error: dayError } = useDayDirections(
    needDay ? dayTarget.y : null, dayTarget.m, dayTarget.d, options, ui.activity ?? undefined);

  // deep-link sync
  useEffect(() => {
    const p = new URLSearchParams();
    if (ui.view !== 'calendar') p.set('view', ui.view);
    p.set('ym', `${ui.year}-${pad(ui.month)}`);
    if (ui.sel) p.set('d', `${ui.sel.y}-${pad(ui.sel.m)}-${pad(ui.sel.d)}`);
    if (ui.sel && ui.hour != null) p.set('h', String(ui.hour));
    if (ui.fx) p.set('fx', ui.fx);
    if (ui.method === 'chaibu') p.set('mtd', 'chaibu');
    if (ui.spiritVariant) p.set('sv', '1');
    if (!ui.lateZiNextDay) p.set('lz', '0');
    if (ui.activity) p.set('act', ui.activity);
    p.set('tz', String(ui.tz));
    history.replaceState(null, '', `?${p.toString()}`);
  }, [ui]);

  const shiftMonth = (delta: number) => setUi((s) => {
    const dt = new Date(s.year, s.month - 1 + delta, 1);
    return { ...s, year: dt.getFullYear(), month: dt.getMonth() + 1, sel: null };
  });
  // Today opens on the current 时辰 (read fresh, the page may have been open a while); any other day on none.
  const selectDay = (day: { y: number; m: number; d: number }) => setUi((s) => {
    const now = nowIn(s.tz);
    const isToday = now.y === day.y && now.m === day.m && now.d === day.d;
    return { ...s, sel: { y: day.y, m: day.m, d: day.d }, year: day.y, month: day.m, hour: isToday ? now.hour : null };
  });
  const goToday = () => selectDay(nowIn(ui.tz));

  // ±1 day, following across month boundaries; keep the current 时辰 and tab.
  const shiftDay = (delta: number) => setUi((s) => {
    if (!s.sel) return s;
    const dt = new Date(s.sel.y, s.sel.m - 1, s.sel.d + delta);
    const ny = dt.getFullYear(), nm = dt.getMonth() + 1, nd = dt.getDate();
    // §10.4 keeps the current 时辰 across ±1 day, so never re-peak here.
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
          <select className="seg rounded-lg px-2 py-1.5 text-xs" value={ui.tz} title="时区（盘与「今天」按此计算）"
                  onChange={(e) => setUi((s) => ({ ...s, tz: +e.target.value }))}
                  style={{ background: 'var(--bg-cell-2)', color: 'var(--text)' }}>
            {(TZ_OFFSETS.includes(ui.tz) ? TZ_OFFSETS : [...TZ_OFFSETS, ui.tz].sort((a, b) => a - b))
              .map((o) => <option key={o} value={o}>{tzLabel(o)}</option>)}
          </select>
          <button className="seg rounded-lg px-3 py-1.5 text-xs" onClick={share}>{copied ? '已复制 ✓' : '复制链接'}</button>
        </div>
      </header>

      {/* Kept mounted while hidden so criteria + results survive view switches (§6.10); key bump = 重置. */}
      <div hidden={ui.view !== 'search'}>
        <SearchView
          key={searchKey}
          options={options}
          onReset={() => setSearchKey((k) => k + 1)}
          onOpenSlot={(y, m, d, branchIndex, activity) =>
            setUi((s) => ({ ...s, view: 'calendar', sel: { y, m, d }, hour: branchIndex, year: y, month: m, activity }))}
        />
      </div>

      {ui.view === 'patterns' ? (
        <PatternsPanel selectedId={ui.fx} onSelect={(id) => setUi((s) => ({ ...s, fx: id }))} />
      ) : ui.view === 'search' ? null : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-start">
          {/* Calendar */}
          <div className="panel p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button className="seg rounded-lg px-3 py-1.5 text-sm" onClick={() => shiftMonth(-1)}>←</button>
              <h2 className="text-base font-semibold mx-auto">{ui.year} 年 {ui.month} 月</h2>
              <button className="seg rounded-lg px-3 py-1.5 text-sm" onClick={() => shiftMonth(1)}>→</button>
              <button className="seg rounded-lg px-3 py-1.5 text-xs" onClick={goToday}>今天</button>
            </div>

            <MonthGrid year={ui.year} month={ui.month} today={today}
                       selected={ui.sel} onSelectDay={selectDay} />

            <Legend />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              日历只作选日，不显示当日总评。点选任一日期，右侧奇门盘按分数为各方位上色
              （金＝大吉、青＝吉、无色＝不吉），颜色与分数一致；点格可见经典定级依据（rung·reasons）。
            </p>
          </div>

          {/* Day detail / hint */}
          <div>
            {ui.sel && dayError && !dayFresh ? (
              <div className="panel p-8 text-center text-sm" style={{ minHeight: 200, color: 'var(--q-bad)' }}>
                计算失败：{dayError}
              </div>
            ) : ui.sel && dayHours && hoursDay ? (
              <div style={{ opacity: dayFresh ? 1 : 0.6, transition: 'opacity 150ms' }} aria-busy={!dayFresh}>
              <DayDetailPanel
                date={hoursDay}
                hours={dayHours}
                selectedHour={ui.hour}
                onSelectHour={(i) => setUi((s) => ({ ...s, hour: i }))}
                onPrevDay={() => shiftDay(-1)}
                onNextDay={() => shiftDay(1)}
                onClose={() => setUi((s) => ({ ...s, sel: null }))}
                activity={ui.activity}
                onSelectActivity={(a) => setUi((s) => ({ ...s, activity: a }))}
              />
              </div>
            ) : (
              <div className="panel p-8 text-center flex flex-col gap-2" style={{ minHeight: 200 }}>
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>{ui.sel ? '计算中…' : '点选任一日期，查看当日 12 时辰与奇门盘'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
