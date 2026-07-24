import type { Palace } from '../types.ts';
import type { PalaceScore } from '../calendar/palace.ts';
import { gateColor, starColor, spiritColor, stemColor } from '../qmdata.ts';
import { V2_BAND_COLOR, scoreBand, bandTint } from '../calendar/bandsV2.ts';

// Palace-number glyph (洛書).
const NUM: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九',
};

// One 九宫 cell (layout locked 2026-07-24, Joe):
//   • 神 / 门 / 星 stacked in the MIDDLE, large (same size as 天盘)
//   • 天盘 over 地盘 at the bottom-right, no labels
//   • four corners carry the symbols we already have: score (TL), 符/使/空/马 (TR),
//     palace number (BL), 天/地盘 (BR)
//   • colour of the tint + score follows the SCORE (§6.6); formations are NOT
//     drawn in the box yet (pending Joe).
export function PalaceCell({
  palace, score, focused, onClick,
}: {
  palace: Palace;
  score?: PalaceScore;
  focused?: boolean;
  onClick?: () => void;
}) {
  const isCentre = palace.palace === 5;

  const markers: { label: string; color: string }[] = [];
  if (palace.isZhiFu) markers.push({ label: '符', color: 'var(--gold)' });
  if (palace.isZhiShi) markers.push({ label: '使', color: 'var(--gold)' });
  if (palace.isHourKong) markers.push({ label: '空', color: 'var(--text-dim)' });
  if (palace.isMaXing) markers.push({ label: '马', color: 'var(--q-caution)' });

  // ─── centre 中5宫 (image 2): grey 天盘 TL · 神 / 五 / 地盘 along the bottom ───
  if (isCentre) {
    return (
      <div className="cell relative flex flex-col p-1.5 aspect-square"
           style={{ background: 'var(--bg-cell-2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
          {palace.tianPanStems[0] ?? ''}
        </div>
        <div className="flex-1" />
        <div className="flex items-end justify-between">
          <span className="text-base font-medium" style={{ color: spiritColor(palace.spirit) }}>
            {palace.spirit ?? ''}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-dim)' }}>{NUM[5]}</span>
          <span className="text-lg font-semibold" style={{ color: stemColor(palace.diPanStem) }}>
            {palace.diPanStem ?? ''}
          </span>
        </div>
      </div>
    );
  }

  // display band (colour) follows the score
  const band = score ? scoreBand(score.score, score.blocked) : 'plain';
  const blocked = !!score?.blocked;
  const bandColor = V2_BAND_COLOR[band];

  return (
    <div
      className={`cell relative flex flex-col p-1.5 aspect-square${onClick ? ' cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{
        background: score ? bandTint(band) : 'var(--bg-cell)',
        border: `1px solid ${focused ? 'var(--gold-dim)' : 'var(--border)'}`,
        borderRadius: 10,
        boxShadow: focused ? '0 0 0 1px var(--gold-dim)' : undefined,
        opacity: blocked ? 0.6 : 1,
        backgroundImage: blocked
          ? 'repeating-linear-gradient(45deg, transparent 0 5px, rgba(255,255,255,0.05) 5px 6px)'
          : undefined,
      }}
    >
      {/* top corners: score (TL) · 符/使/空/马 (TR) */}
      <div className="flex items-start justify-between leading-none">
        {score
          ? <span className="text-[11px] tabular-nums font-medium" style={{ color: bandColor }}>
              {blocked ? '✕' : Math.round(score.score)}
            </span>
          : <span />}
        <div className="flex gap-1">
          {markers.map((m, i) => (
            <span key={i} className="text-[10px] leading-none px-1 py-[1px] rounded"
                  style={{ color: m.color, border: `1px solid ${m.color}55` }}>{m.label}</span>
          ))}
        </div>
      </div>

      {/* centre: 神 / 门 / 星 — large, same size as 天盘 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1">
        <div className="text-lg leading-tight" style={{ color: spiritColor(palace.spirit) }}>
          {palace.spirit ?? ''}
        </div>
        <div className="text-lg font-semibold leading-tight" style={{ color: gateColor(palace.gate) }}>
          {palace.gate ?? ''}
        </div>
        <div className="text-lg leading-tight flex gap-0.5" style={{ color: starColor(palace.stars[0] ?? '') }}>
          {palace.stars.map((s) => <span key={s}>{s}</span>)}
        </div>
      </div>

      {/* bottom corners: palace number (BL) · 天盘 over 地盘 (BR, no labels) */}
      <div className="flex items-end justify-between leading-none">
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{NUM[palace.palace]}</span>
        <div className="flex flex-col items-end leading-tight">
          <div className="flex gap-0.5 text-lg font-semibold">
            {palace.tianPanStems.map((s, i) => (
              <span key={i} style={{ color: stemColor(s) }}>{s}</span>
            ))}
          </div>
          <div className="text-lg font-semibold" style={{ color: stemColor(palace.diPanStem) }}>
            {palace.diPanStem ?? ''}
          </div>
        </div>
      </div>
    </div>
  );
}
