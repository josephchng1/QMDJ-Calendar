import type { Chart, GanZhi } from '../types.ts';
import { stemColor } from '../qmdata.ts';

const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

export function FourPillarsBar({ chart }: { chart: Chart }) {
  const p = chart.pillars;
  const cols: { label: string; gz: GanZhi }[] = [
    { label: '年', gz: p.year }, { label: '月', gz: p.month },
    { label: '日', gz: p.day }, { label: '时', gz: p.hour },
  ];
  const hourKong = p.hourKongWang.map((b) => BRANCHES[b]).join('');
  const maXing = BRANCHES[p.maXing];

  return (
    <div className="panel p-4">
      <div className="grid grid-cols-4 gap-2">
        {cols.map(({ label, gz }) => {
          const stem = gz.name[0]; const branch = gz.name[1];
          return (
            <div key={label} className="flex flex-col items-center py-2 rounded-lg"
                 style={{ background: 'var(--bg-cell-2)', border: '1px solid var(--border)' }}>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{label}柱</div>
              <div className="text-xl font-semibold mt-1" style={{ color: stemColor(stem) }}>{stem}</div>
              <div className="text-xl font-semibold">{branch}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs flex-wrap" style={{ color: 'var(--text-dim)' }}>
        <span>时空亡 <span style={{ color: 'var(--text)' }}>{hourKong}</span></span>
        <span>日空亡 <span style={{ color: 'var(--text)' }}>{p.dayKongWang.map((b) => BRANCHES[b]).join('')}</span></span>
        <span>马星 <span style={{ color: 'var(--q-caution)' }}>{maXing}</span></span>
      </div>
    </div>
  );
}
