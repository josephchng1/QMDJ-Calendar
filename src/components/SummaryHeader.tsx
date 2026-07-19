import type { Chart } from '../types.ts';

export function SummaryHeader({ chart }: { chart: Chart }) {
  const s = chart.summary;
  const late = chart.pillars.isLateZi;
  return (
    <div className="panel p-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="text-2xl font-semibold gold tracking-wide">{s.dun}</div>
        <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
          {s.yuan} · 值事 {s.term}
          {late && <span className="ml-2" style={{ color: 'var(--q-caution)' }}>晚子时</span>}
        </div>
      </div>
      <div className="mt-3 grid gap-1 text-sm">
        <Row label="值符" value={s.zhiFu} />
        <Row label="值使" value={s.zhiShi} />
        <Row label="节气"
             value={`${chart.pillars.currentTerm.name} → ${chart.pillars.nextTerm.name}`} />
        <Row label="符头" value={chart.juResult.fuTou.name} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-10 shrink-0" style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
