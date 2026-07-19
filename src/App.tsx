import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CalendarOptions, DaySummary } from './calendar/summary.ts';
import { useMonth } from './hooks/useMonth.ts';
import { MonthGrid } from './components/MonthGrid.tsx';
import { DayDetailPanel } from './components/DayDetailPanel.tsx';
import { Legend } from './components/Legend.tsx';
import { BAND_LABEL, bandColor } from './calendar/bands.ts';

type Method = 'zhirun' | 'chaibu';

interface UiState {
  year: number; month: number;               // displayed month (1..12)
  sel: { y: number; m: number; d: number } | null; // selected day
  hour: number;                               // selected 时辰 index 0..11
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
    year = sel.m === month ? year : sel.y; month = sel.m; year = sel.y;
  }

  return {
    year, month, sel,
    hour: p.get('h') ? Math.min(11, Math.max(0, +p.get('h')!)) : 0,
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

  const { month, loading } = useMonth(ui.year, ui.month, options);

  // deep-link sync
  useEffect(() => {
    const p = new URLSearchParams();
    p.set('ym', `${ui.year}-${pad(ui.month)}`);
    if (ui.sel) { p.set('d', `${ui.sel.y}-${pad(ui.sel.m)}-${pad(ui.sel.d)}`); p.set('h', String(ui.hour)); }
    if (ui.method === 'chaibu') p.set('mtd', 'chaibu');
    if (ui.spiritVariant) p.set('sv', '1');
    if (!ui.lateZiNextDay) p.set('lz', '0');
    history.replaceState(null, '', `?${p.toString()}`);
  }, [ui]);

  const selectedDay: DaySummary | null =
    ui.sel && month ? month.days.find((x) => x.d === ui.sel!.d && x.m === ui.sel!.m) ?? null : null;

  const shiftMonth = (delta: number) => setUi((s) => {
    const dt = new Date(s.year, s.month - 1 + delta, 1);
    return { ...s, year: dt.getFullYear(), month: dt.getMonth() + 1, sel: null };
  });
  const goToday = () => setUi((s) => ({ ...s, year: today.y, month: today.m, sel: null }));
  const selectDay = (day: DaySummary) =>
    setUi((s) => ({ ...s, sel: { y: day.y, m: day.m, d: day.d }, hour: day.bestIndex }));

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
        <div className="flex items-center gap-1 ml-auto">
          <Toggle active={ui.method === 'zhirun'} onClick={() => setUi((s) => ({ ...s, method: 'zhirun' }))}>置闰</Toggle>
          <Toggle active={ui.method === 'chaibu'} onClick={() => setUi((s) => ({ ...s, method: 'chaibu' }))}>拆补</Toggle>
          <Toggle active={ui.spiritVariant} onClick={() => setUi((s) => ({ ...s, spiritVariant: !s.spiritVariant }))}>神·变体</Toggle>
          <Toggle active={ui.lateZiNextDay} onClick={() => setUi((s) => ({ ...s, lateZiNextDay: !s.lateZiNextDay }))}>晚子时次日</Toggle>
          <button className="seg rounded-lg px-3 py-1.5 text-xs" onClick={share}>{copied ? '已复制 ✓' : '复制链接'}</button>
        </div>
      </header>

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
            每格 12 段为该日 12 时辰吉凶粗标；底部横条为全日综合。颜色评分为临时启发式（门/星/神 + 五不遇时），
            非专业格局评分，将由格局注册表取代。
          </p>
        </div>

        {/* Day detail / hint */}
        <div>
          {selectedDay ? (
            <DayDetailPanel
              day={selectedDay}
              options={options}
              selectedHour={ui.hour}
              onSelectHour={(i) => setUi((s) => ({ ...s, hour: i }))}
              onClose={() => setUi((s) => ({ ...s, sel: null }))}
            />
          ) : (
            <div className="panel p-8 text-center flex flex-col gap-2" style={{ minHeight: 200 }}>
              <span className="text-sm" style={{ color: 'var(--text-dim)' }}>点选任一日期，查看当日 12 时辰与奇门盘</span>
              {month && (
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  本月共 {month.days.filter((d) => d.dayBand === 'excellent').length} 天评为
                  <span style={{ color: bandColor('excellent') }}> {BAND_LABEL.excellent}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
