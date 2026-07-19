import type { ReactNode } from 'react';
import type { Palace } from '../types.ts';
import { gateColor, starColor, spiritColor, stemColor, GATE_META, QUALITY_VAR } from '../qmdata.ts';

// One 九宫 cell. Element order top→bottom follows spec §9: 神 → 门 → 星 → 干(天/地) → 支markers.
// The 时干 (hour stem) is boxed wherever it appears on 天盘/地盘 (feature §10.5).
export function PalaceCell({ palace, hourStem }: { palace: Palace; hourStem?: string }) {
  const isCentre = palace.palace === 5;
  const borderQ = palace.gate && GATE_META[palace.gate] ? GATE_META[palace.gate].quality : 'neutral';
  const borderColor = QUALITY_VAR[borderQ];

  // Box a stem when it is the hour stem — marks the acting hour on both plates.
  const stemNode = (s: string, extra?: string): ReactNode => {
    const boxed = !!hourStem && s === hourStem;
    return (
      <span
        className={extra}
        style={{
          color: stemColor(s),
          ...(boxed
            ? { border: '1.5px solid var(--gold)', borderRadius: 4, padding: '0 3px',
                boxShadow: '0 0 8px rgba(212,175,55,0.35)' }
            : {}),
        }}
      >
        {s}
      </span>
    );
  };

  const markers: { label: string; color: string }[] = [];
  if (palace.isZhiFu) markers.push({ label: '符', color: 'var(--gold)' });
  if (palace.isZhiShi) markers.push({ label: '使', color: 'var(--gold)' });
  if (palace.isHourKong) markers.push({ label: '空', color: 'var(--text-dim)' });
  if (palace.isMaXing) markers.push({ label: '马', color: 'var(--q-caution)' });

  if (isCentre) {
    return (
      <div className="cell relative flex flex-col items-center justify-center p-2 aspect-square"
           style={{ background: 'var(--bg-cell-2)', border: `1px solid var(--border)`, borderRadius: 10 }}>
        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>中五宫</div>
        <div className="text-2xl font-semibold mt-1">
          {palace.diPanStem ? stemNode(palace.diPanStem) : '—'}
        </div>
      </div>
    );
  }

  const isFocus = palace.isZhiFu || palace.isZhiShi;

  return (
    <div className={`cell relative flex flex-col p-2 aspect-square${isFocus ? ' cell-focus' : ''}`}
         style={{ background: 'var(--bg-cell)', border: `1px solid ${borderColor}44`,
                  borderRadius: 10, boxShadow: `inset 0 0 24px ${borderColor}0d` }}>
      {/* corner markers */}
      <div className="absolute top-1 right-1 flex gap-1">
        {markers.map((m, i) => (
          <span key={i} className="text-[10px] leading-none px-1 py-[1px] rounded"
                style={{ color: m.color, border: `1px solid ${m.color}55` }}>{m.label}</span>
        ))}
      </div>

      {/* 神 */}
      <div className="text-[13px] font-medium" style={{ color: spiritColor(palace.spirit) }}>
        {palace.spirit ?? ''}
      </div>
      {/* 门 */}
      <div className="text-sm font-semibold" style={{ color: gateColor(palace.gate) }}>
        {palace.gate ?? ''}
      </div>
      {/* 星 (芮宫 may carry 天禽) */}
      <div className="text-[13px] flex gap-1 flex-wrap">
        {palace.stars.map((s) => (
          <span key={s} style={{ color: starColor(s) }}>{s}</span>
        ))}
      </div>

      <div className="flex-1" />

      {/* 干: 天盘 over 地盘 */}
      <div className="flex items-end justify-between mt-1">
        <div className="flex gap-1 text-lg font-semibold">
          {palace.tianPanStems.map((s, i) => <span key={i}>{stemNode(s)}</span>)}
        </div>
        <div className="text-base">{stemNode(palace.diPanStem)}</div>
      </div>
      <div className="flex justify-between text-[9px] mt-[2px]" style={{ color: 'var(--text-dim)' }}>
        <span>天盘</span><span>地盘 {luoshuName(palace.palace)}</span>
      </div>
    </div>
  );
}

function luoshuName(p: number): string {
  return ({ 1: '坎一', 2: '坤二', 3: '震三', 4: '巽四', 5: '中五',
            6: '乾六', 7: '兑七', 8: '艮八', 9: '离九' } as Record<number, string>)[p] ?? '';
}
