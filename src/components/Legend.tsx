import type { ReactNode } from 'react';
import { V2_BAND_LABEL, V2_BAND_COLOR } from '../calendar/bandsV2.ts';
import type { Band } from '../calendar/palace.ts';

// Key to the chart's colour + marker vocabulary. Purely explanatory — mirrors the
// quality tags in qmdata.ts so a reader can decode the palace cells at a glance.
const QUALITY: { v: string; t: string }[] = [
  { v: 'var(--q-excellent)', t: '上吉' },
  { v: 'var(--q-good)', t: '吉' },
  { v: 'var(--q-neutral)', t: '平' },
  { v: 'var(--q-caution)', t: '慎' },
  { v: 'var(--q-bad)', t: '凶' },
];

const MARKERS: { label: string; color: string; t: string }[] = [
  { label: '符', color: 'var(--gold)', t: '值符' },
  { label: '使', color: 'var(--gold)', t: '值使' },
  { label: '空', color: 'var(--text-dim)', t: '空亡' },
  { label: '马', color: 'var(--q-caution)', t: '马星' },
];

const ELEMENTS: { v: string; t: string }[] = [
  { v: 'var(--wood)', t: '木' },
  { v: 'var(--fire)', t: '火' },
  { v: 'var(--earth)', t: '土' },
  { v: 'var(--metal)', t: '金' },
  { v: 'var(--water)', t: '水' },
];

export function Legend() {
  return (
    <div className="panel p-4 flex flex-col gap-3 text-xs">
      <Group label="方位">
        {(['prime', 'good', 'plain'] as Band[]).map((b) => (
          <span key={b} className="flex items-center gap-1.5">
            <span className="swatch" style={{ background: V2_BAND_COLOR[b] }} />
            <span style={{ color: 'var(--text)' }}>{V2_BAND_LABEL[b]}</span>
          </span>
        ))}
      </Group>

      <Group label="符号">
        {QUALITY.map((q) => (
          <span key={q.t} className="flex items-center gap-1.5">
            <span className="swatch" style={{ background: q.v }} />
            <span style={{ color: 'var(--text)' }}>{q.t}</span>
          </span>
        ))}
      </Group>

      <Group label="标记">
        {MARKERS.map((m) => (
          <span key={m.label} className="flex items-center gap-1.5">
            <span className="text-[10px] leading-none px-1 py-[1px] rounded"
                  style={{ color: m.color, border: `1px solid ${m.color}55` }}>{m.label}</span>
            <span style={{ color: 'var(--text-dim)' }}>{m.t}</span>
          </span>
        ))}
      </Group>

      <Group label="五行">
        {ELEMENTS.map((e) => (
          <span key={e.t} className="flex items-center gap-1.5">
            <span className="swatch" style={{ background: e.v }} />
            <span style={{ color: e.v }}>{e.t}</span>
          </span>
        ))}
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="w-8 shrink-0" style={{ color: 'var(--text-dim)' }}>{label}</span>
      <div className="flex gap-3 flex-wrap">{children}</div>
    </div>
  );
}
