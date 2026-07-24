import type { ReactNode } from 'react';
import type { Palace } from '../types.ts';
import type { PalaceScore } from '../calendar/palace.ts';
import { gateColor, starColor, spiritColor, stemColor, GATE_META, QUALITY_VAR } from '../qmdata.ts';
import { V2_BAND_COLOR } from '../calendar/bandsV2.ts';

// One 九宫 cell. Element order top→bottom follows spec §9: 神 → 门 → 星 → 干(天/地) → 支markers.
// The 时干 (hour stem) is boxed wherever it appears on 天盘/地盘 (feature §10.5).
//
// When a `score` is supplied the cell also carries the v2 grading (architecture §6.6):
//   • band SHADING behind the glyphs (shared bandsV2 tokens — same shades everywhere)
//   • the ordering SCORE in the bottom-left corner, low-weight
// Formations are deliberately NOT rendered in the box yet — pending Joe's call (§6.6 ⚠).
export function PalaceCell({
  palace, hourStem, score, focused, onClick,
}: {
  palace: Palace;
  hourStem?: string;
  score?: PalaceScore;
  focused?: boolean;
  onClick?: () => void;
}) {
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

  // v2 grading visuals (only when a score is present).
  const graded = !!score;
  const blocked = !!score?.blocked;
  const bandColor = score ? V2_BAND_COLOR[score.band] : borderColor;
  // Tint composites over the solid cell base via ONE color-mix from the shared
  // band token (§6.7) — prime/good tinted, plain/blocked left at the neutral base.
  const bg = graded && !blocked && score!.band !== 'plain'
    ? `color-mix(in srgb, ${V2_BAND_COLOR[score!.band]} 14%, var(--bg-cell))`
    : 'var(--bg-cell)';
  const outline = focused ? 'var(--gold-dim)' : `${borderColor}44`;

  return (
    <div
      className={`cell relative flex flex-col p-2 aspect-square${isFocus ? ' cell-focus' : ''}${onClick ? ' cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{ background: bg, border: `1px solid ${outline}`,
               borderRadius: 10, boxShadow: focused ? '0 0 0 1px var(--gold-dim)' : `inset 0 0 24px ${borderColor}0d`,
               opacity: blocked ? 0.6 : 1 }}>
      {/* corner markers (top-right) */}
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
      <div className="flex justify-between items-end text-[9px] mt-[2px]" style={{ color: 'var(--text-dim)' }}>
        {/* v2 score in the bottom-left corner — ordering hint only (§6.6, §8.2) */}
        {graded
          ? <span className="tabular-nums font-medium" style={{ color: bandColor }}>
              {blocked ? '✕' : Math.round(score!.score)}
            </span>
          : <span>天盘</span>}
        <span>地盘 {luoshuName(palace.palace)}</span>
      </div>
    </div>
  );
}

function luoshuName(p: number): string {
  return ({ 1: '坎一', 2: '坤二', 3: '震三', 4: '巽四', 5: '中五',
            6: '乾六', 7: '兑七', 8: '艮八', 9: '离九' } as Record<number, string>)[p] ?? '';
}
