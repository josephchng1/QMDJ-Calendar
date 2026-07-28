import { useMemo, useState } from 'react';
import type { CalendarOptions } from '../calendar/summary.ts';
import type { SearchQuery, SearchMode, SlotResult } from '../calendar/search.ts';
import { useSearch } from '../hooks/useSearch.ts';
import { ACTIVITY_ORDER, ACTIVITY_PRESETS } from '../calendar/data/presets.ts';
import { ALL_PATTERNS } from '../calendar/data/patterns.ts';
import { bandColor, BAND_LABEL, scorePercent, shichenWindow } from '../calendar/bands.ts';

const pad = (n: number) => String(n).padStart(2, '0');
const RANGES = [30, 60, 90, 180];
const FORMATIONS = [...ALL_PATTERNS].sort((a, b) => a.name.localeCompare(b.name));
const NAME_BY_ID = Object.fromEntries(ALL_PATTERNS.map((p) => [p.id, p.name]));

export function SearchView({ options, onOpenSlot }: {
  options: CalendarOptions;
  onOpenSlot: (y: number, m: number, d: number, branchIndex: number) => void;
}) {
  const now = useMemo(() => new Date(), []);
  const [mode, setMode] = useState<SearchMode>('recommended');
  const [startStr, setStartStr] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  const [days, setDays] = useState(60);
  const [activity, setActivity] = useState<typeof ACTIVITY_ORDER[number]>('launch');
  const [role, setRole] = useState<'host' | 'mover' | null>(null);
  const [formationId, setFormationId] = useState(FORMATIONS[0].id);
  const [require, setRequire] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(0);
  const [allowWuBuYu, setAllowWuBuYu] = useState(false);
  const [query, setQuery] = useState<SearchQuery | null>(null);

  const { result, loading } = useSearch(query);
  const roleAware = ACTIVITY_PRESETS[activity].roleAware;

  const run = () => {
    const [y, m, d] = startStr.split('-').map(Number);
    const base: SearchQuery = { start: { y, m, d }, days, mode, options };
    if (mode === 'recommended') { base.activity = activity; if (roleAware && role) base.role = role; }
    if (mode === 'by-formation') base.formationId = formationId;
    if (mode === 'filter') base.filters = { require, avoid, minScore, allowWuBuYu };
    setQuery(base);
  };

  const addTo = (set: (f: (p: string[]) => string[]) => void, id: string) =>
    set((p) => (p.includes(id) ? p : [...p, id]));
  const removeFrom = (set: (f: (p: string[]) => string[]) => void, id: string) =>
    set((p) => p.filter((x) => x !== id));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
      {/* query builder */}
      <div className="panel p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-base font-semibold gold tracking-wider">择日搜索</h2>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Find good dates · 择时</span>
        </div>

        {/* mode */}
        <div className="flex gap-1">
          {(['recommended', 'by-formation', 'filter'] as SearchMode[]).map((mo) => (
            <button key={mo} className="seg rounded-lg px-3 py-1.5 text-xs" data-active={mode === mo}
                    onClick={() => setMode(mo)}>
              {mo === 'recommended' ? '推荐吉时' : mo === 'by-formation' ? '按格局' : '自订筛选'}
            </button>
          ))}
        </div>

        {/* range */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs w-12 shrink-0" style={{ color: 'var(--text-dim)' }}>起始</span>
          <input type="date" className="field px-3 py-2 text-sm" value={startStr}
                 onChange={(e) => setStartStr(e.target.value)} />
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button key={r} className="seg rounded-lg px-2.5 py-1.5 text-xs" data-active={days === r}
                      onClick={() => setDays(r)}>{r}天</button>
            ))}
          </div>
        </div>

        {/* mode-specific inputs */}
        {mode === 'recommended' && (
          <div className="flex flex-col gap-2">
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>用事</span>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_ORDER.map((t) => (
                <button key={t} className="seg rounded-lg px-2.5 py-1 text-xs" data-active={activity === t}
                        onClick={() => setActivity(t)}>{ACTIVITY_PRESETS[t].label}</button>
              ))}
            </div>
            {roleAware && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>主客</span>
                <button className="seg rounded-lg px-2.5 py-1 text-xs" data-active={role === 'host'}
                        onClick={() => setRole((r) => (r === 'host' ? null : 'host'))} title="伏吟利主">主 (守)</button>
                <button className="seg rounded-lg px-2.5 py-1 text-xs" data-active={role === 'mover'}
                        onClick={() => setRole((r) => (r === 'mover' ? null : 'mover'))} title="反吟利客">客 (动)</button>
              </div>
            )}
          </div>
        )}

        {mode === 'by-formation' && (
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            格局
            <select className="field px-3 py-2 text-sm" value={formationId}
                    onChange={(e) => setFormationId(e.target.value)}>
              {FORMATIONS.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.nameEn}</option>)}
            </select>
          </label>
        )}

        {mode === 'filter' && (
          <div className="flex flex-col gap-3">
            <FormationPicker label="必须包含" color="var(--q-good)" chosen={require}
                             onAdd={(id) => addTo(setRequire, id)} onRemove={(id) => removeFrom(setRequire, id)} />
            <FormationPicker label="必须排除" color="var(--q-bad)" chosen={avoid}
                             onAdd={(id) => addTo(setAvoid, id)} onRemove={(id) => removeFrom(setAvoid, id)} />
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              最低分 {minScore}
              <input type="range" min={-40} max={80} step={5} value={minScore}
                     onChange={(e) => setMinScore(Number(e.target.value))} className="flex-1" />
            </label>
            <button className="seg rounded-lg px-2.5 py-1 text-xs self-start" data-active={allowWuBuYu}
                    onClick={() => setAllowWuBuYu((v) => !v)}>
              {allowWuBuYu ? '含五不遇时' : '排除五不遇时'}
            </button>
          </div>
        )}

        <button className="seg rounded-lg px-4 py-2 text-sm self-start" data-active onClick={run}>
          搜索 →
        </button>
      </div>

      {/* results */}
      <div className="panel p-4 flex flex-col gap-2" style={{ minHeight: 200 }}>
        {!query && <Hint text="设定条件后按「搜索」，列出区间内的吉时。" />}
        {loading && <Hint text="扫描各日时辰中…" />}
        {result && !loading && (
          <>
            <div className="text-xs flex items-baseline gap-2" style={{ color: 'var(--text-dim)' }}>
              <span>共扫描 {result.scanned} 时辰 · 列出 {result.slots.length}</span>
            </div>
            {result.slots.length === 0 && <Hint text="区间内无符合条件的时辰，放宽条件再试。" />}
            <div className="flex flex-col gap-1.5 max-h-[74vh] overflow-y-auto pr-1">
              {result.slots.map((s, i) => (
                <SlotRow key={`${s.y}-${s.m}-${s.d}-${s.hh}`} slot={s} rank={i + 1}
                         onClick={() => onOpenSlot(s.y, s.m, s.d, s.branchIndex)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SlotRow({ slot, rank, onClick }: { slot: SlotResult; rank: number; onClick: () => void }) {
  const c = bandColor(slot.band);
  return (
    <button onClick={onClick}
            className="cell w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left"
            style={{ background: 'var(--bg-cell-2)', border: `1px solid ${slot.blocked ? 'var(--q-bad)' : 'var(--border)'}` }}>
      <span className="text-xs w-6 tabular-nums" style={{ color: 'var(--text-dim)' }}>{rank}</span>
      <span className="swatch" style={{ background: c }} />
      <span className="text-sm tabular-nums" style={{ color: 'var(--text)' }}>
        {slot.m}/{slot.d}
      </span>
      <span className="text-xs w-14 tabular-nums" style={{ color: 'var(--text-dim)' }}>
        {shichenWindow(slot.branchIndex)}
      </span>
      <span className="text-sm gold">{slot.hourGanzhi}</span>
      <span className="text-xs font-medium" style={{ color: c }}>{BAND_LABEL[slot.band]} {scorePercent(slot.score)}</span>
      <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">
        {slot.formations.slice(0, 3).map((f) => (
          <span key={f.id} className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ color: 'var(--gold)', border: '1px solid var(--gold-dim)' }}>{f.name}</span>
        ))}
        {slot.warnings.slice(0, 2).map((w) => (
          <span key={w} className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ color: 'var(--q-bad)', border: '1px solid var(--border)' }}>{w}</span>
        ))}
      </div>
    </button>
  );
}

function FormationPicker({ label, color, chosen, onAdd, onRemove }: {
  label: string; color: string; chosen: string[];
  onAdd: (id: string) => void; onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs" style={{ color }}>{label}</span>
      <select className="field px-3 py-2 text-sm" value=""
              onChange={(e) => { if (e.target.value) onAdd(e.target.value); }}>
        <option value="">＋ 添加格局…</option>
        {FORMATIONS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chosen.map((id) => (
            <button key={id} onClick={() => onRemove(id)}
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ color, border: `1px solid ${color}66` }}>
              {NAME_BY_ID[id] ?? id} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm" style={{ color: 'var(--text-dim)' }}>{text}</div>;
}
