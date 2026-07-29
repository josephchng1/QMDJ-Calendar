import type { PalaceScore } from '../calendar/palace.ts';
import { DIRECTION_LABEL } from '../calendar/direction.ts';
import { V2_BAND_LABEL, V2_BAND_COLOR, scoreBand } from '../calendar/bandsV2.ts';

/** Small bordered chip — shared by the scored palace board and its reason trace. */
export function Chip({ text, color, dim }: { text: string; color: string; dim?: boolean }) {
  return (
    <span className="text-[10px] leading-none px-1.5 py-0.5 rounded"
          style={{ color, border: `1px solid ${dim ? 'var(--border)' : color}` }}>
      {text}
    </span>
  );
}

/** The "why is this coloured?" trace. Headline colour/label follow the SCORE band
 *  (matches the cell tint); the classical rung + reasons follow underneath as the
 *  traditional basis. */
export function PalaceReasons({ ps }: { ps: PalaceScore }) {
  const band = scoreBand(ps.score, ps.blocked);
  const label = V2_BAND_LABEL[band];
  const color = V2_BAND_COLOR[band];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="font-semibold" style={{ color }}>
          {ps.direction ? DIRECTION_LABEL[ps.direction] : ''}方 · {ps.blocked ? '不用' : label}
        </span>
        <span className="tabular-nums" style={{ color: 'var(--text-dim)' }}>分 {ps.blocked ? '—' : Math.round(ps.score)}</span>
        <span style={{ color: 'var(--text-dim)' }}>{ps.rung}</span>
      </div>
      <ul className="list-disc pl-4 flex flex-col gap-0.5" style={{ color: 'var(--text)' }}>
        {ps.reasons.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
      {(ps.badges.length > 0 || ps.warnings.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {ps.badges.map((bd) => <Chip key={bd} text={bd} color="var(--q-good)" />)}
          {ps.warnings.map((w) => <Chip key={w} text={w} color="var(--q-bad)" />)}
        </div>
      )}
    </div>
  );
}
