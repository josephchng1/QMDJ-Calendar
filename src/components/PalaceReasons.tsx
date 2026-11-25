import type { PalaceScore } from '../calendar/palace.ts';
import { DIRECTION_LABEL } from '../calendar/direction.ts';
import { V2_BAND_LABEL, V2_BAND_COLOR } from '../calendar/bandsV2.ts';

/** Small bordered chip — shared by the scored palace board and its reason trace.
 *  `strong` fills the chip so 上格/下格 labels read louder than plain badges. */
export function Chip({ text, color, dim, strong }: {
  text: string; color: string; dim?: boolean; strong?: boolean;
}) {
  return (
    <span className="text-[10px] leading-none px-1.5 py-0.5 rounded"
          style={{
            color,
            border: `1px solid ${dim ? 'var(--border)' : color}`,
            background: strong ? `color-mix(in srgb, ${color} 18%, transparent)` : undefined,
            fontWeight: strong ? 600 : undefined,
          }}>
      {text}
    </span>
  );
}

/** 上格 → green, 下格 → red. Nothing else is labelled. */
export function GradeChips({ grades }: { grades: PalaceScore['grades'] }) {
  return (
    <>
      {grades.map((g) => (
        <Chip key={`${g.grade}-${g.text}`} strong
              text={`${g.text} · ${g.grade}`}
              color={g.grade === '上格' ? 'var(--q-good)' : 'var(--q-bad)'} />
      ))}
    </>
  );
}

/** The "why is this coloured?" trace: the ladder band (the cell tint), its display
 *  score, then the classical rung + reasons that decided it. */
export function PalaceReasons({ ps }: { ps: PalaceScore }) {
  const band = ps.band;
  const label = V2_BAND_LABEL[band];
  const color = V2_BAND_COLOR[band];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="font-semibold" style={{ color }}>
          {ps.direction ? DIRECTION_LABEL[ps.direction] : ''}方 · {ps.blocked ? '不用' : label}
        </span>
        <span className="tabular-nums" style={{ color: 'var(--text-dim)' }}>分 {ps.blocked ? '—' : ps.display}</span>
        <span style={{ color: 'var(--text-dim)' }}>{ps.rung}</span>
      </div>
      <ul className="list-disc pl-4 flex flex-col gap-0.5" style={{ color: 'var(--text)' }}>
        {ps.reasons.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
      {(ps.grades.length > 0 || ps.badges.length > 0 || ps.warnings.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          <GradeChips grades={ps.grades} />
          {ps.badges.map((bd) => <Chip key={bd} text={bd} color="var(--q-good)" />)}
          {ps.warnings.map((w) => <Chip key={w} text={w} color="var(--q-bad)" />)}
        </div>
      )}
    </div>
  );
}
