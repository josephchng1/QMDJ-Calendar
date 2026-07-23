import { useState } from 'react';
import type { DirHour } from '../hooks/useDayDirections.ts';
import type { PalaceScore, Band } from '../calendar/palace.ts';
import { directionOf, DIRECTION_LABEL } from '../calendar/direction.ts';
import { gateColor, starColor, spiritColor, stemColor } from '../qmdata.ts';

// v2 three-band presentation (§6.1). Only prime/good are tinted; plain is bare —
// absence of tint IS the signal.
const BANDV2: Record<Band, { label: string; color: string; bg: string }> = {
  prime: { label: '大吉', color: 'var(--gold)', bg: 'var(--band-prime-bg)' },
  good: { label: '吉', color: 'var(--q-excellent)', bg: 'var(--band-good-bg)' },
  plain: { label: '不吉', color: 'var(--text-dim)', bg: 'var(--band-plain-bg)' },
};

const ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]; // classic 3×3 display order
const BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function Chip({ text, color, dim }: { text: string; color: string; dim?: boolean }) {
  return (
    <span className="text-[10px] leading-none px-1.5 py-0.5 rounded"
          style={{ color, border: `1px solid ${dim ? 'var(--border)' : color}` }}>
      {text}
    </span>
  );
}

export function DirectionBoard({
  hours, selectedHour, onSelectHour,
}: {
  hours: DirHour[];
  selectedHour: number;
  onSelectHour: (i: number) => void;
}) {
  const [focus, setFocus] = useState<number | null>(null);
  const cur = hours[selectedHour] ?? hours[0];
  const { chart, summary } = cur;
  const focusPs = focus != null ? summary.palaces[focus - 1] : null;

  const roleText = summary.hourRoleFavour === 'mover' ? '客 · 主动出击' : '主 · 按兵不动';
  const emergency = summary.emergencyDirections
    .map((p) => DIRECTION_LABEL[directionOf(p)!] ?? '')
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-3">
      {/* 时辰 selector — each hour DESCRIBED by prime/good direction counts (§5) */}
      <div className="panel p-2">
        <div className="grid grid-cols-6 gap-1">
          {hours.map((h, i) => {
            const c = h.summary.counts;
            const blocked = h.summary.chartBlocked;
            return (
              <button key={i} onClick={() => onSelectHour(i)}
                className="seg rounded-lg px-1 py-1.5 text-center leading-tight"
                data-active={i === selectedHour}
                style={blocked ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}
                title={blocked ? '五不遇时 · 不用' : `${c.prime} 大吉 · ${c.good} 吉`}>
                <div className="text-xs font-semibold">{BRANCH[i]}时</div>
                <div className="text-[10px] tabular-nums" style={{ color: 'var(--text-dim)' }}>
                  {blocked ? '五不遇' : (c.prime || c.good)
                    ? <span><span style={{ color: 'var(--gold)' }}>◆{c.prime}</span>{' '}
                        <span style={{ color: 'var(--q-excellent)' }}>◇{c.good}</span></span>
                    : '—'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* selected-hour context */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="gold tracking-wide">{chart.summary.dun}</span>
        <span style={{ color: 'var(--text-dim)' }}>{chart.pillars.hour.name}时</span>
        <Chip text={`宜为${roleText}`} color="var(--gold)" />
        {emergency.length > 0 && <Chip text={`急则从神：${emergency.join('、')}`} color="var(--q-caution)" />}
        {summary.chartWarnings.map((w) => <Chip key={w} text={w} color="var(--q-bad)" />)}
      </div>

      {/* the 9-palace direction board */}
      <div className="panel gold-frame p-3">
        <div className="grid grid-cols-3 gap-2">
          {ORDER.map((p) => {
            const ps = summary.palaces[p - 1];
            const gl = chart.board.palaces[p - 1];
            const centre = p === 5;
            const b = BANDV2[ps.band];
            const dir = directionOf(p);
            const selected = focus === p;
            return (
              <button key={p} onClick={() => !centre && setFocus(selected ? null : p)}
                className="cell relative flex flex-col p-2 aspect-square text-left"
                style={{
                  background: centre ? 'var(--bg-cell-2)' : b.bg,
                  border: `1px solid ${selected ? 'var(--gold-dim)' : 'var(--border)'}`,
                  borderRadius: 10,
                  boxShadow: selected ? '0 0 0 1px var(--gold-dim)' : undefined,
                  opacity: ps.blocked ? 0.55 : 1,
                }}>
                {centre ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>中五宫</div>
                    <div className="text-lg font-semibold" style={{ color: stemColor(gl.diPanStem) }}>{gl.diPanStem}</div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between leading-none">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                        {dir ? DIRECTION_LABEL[dir] : ''}
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: b.color }}>
                        {ps.blocked ? '✕不用' : b.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold" style={{ color: gateColor(gl.gate) }}>{gl.gate}</span>
                      <span className="text-[13px]" style={{ color: starColor(gl.stars[0] ?? '') }}>{gl.stars[0] ?? ''}</span>
                      <span className="text-[13px]" style={{ color: spiritColor(gl.spirit) }}>{gl.spirit ?? ''}</span>
                    </div>
                    <div className="mt-0.5 flex gap-1 text-sm">
                      {gl.tianPanStems.map((s, i) => <span key={i} style={{ color: stemColor(s) }}>{s}</span>)}
                      <span style={{ color: 'var(--text-dim)' }}>/</span>
                      <span style={{ color: stemColor(gl.diPanStem) }}>{gl.diPanStem}</span>
                    </div>
                    <div className="flex-1" />
                    <div className="flex flex-wrap gap-1">
                      {ps.strength.gate && <Chip text={`门${ps.strength.gate}`} color="var(--text-dim)" dim />}
                      {ps.strength.star && <Chip text={`星${ps.strength.star}`} color="var(--text-dim)" dim />}
                      {ps.badges.slice(0, 1).map((bd) => <Chip key={bd} text={bd} color="var(--q-good)" />)}
                      {ps.warnings.slice(0, 1).map((w) => <Chip key={w} text={w} color="var(--q-bad)" />)}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* reason trace — the "why is this 大吉?" answer the ladder produces */}
      <div className="panel p-3 text-xs" style={{ minHeight: 72 }}>
        {focusPs ? <PalaceReasons ps={focusPs} /> : (
          <span style={{ color: 'var(--text-dim)' }}>点选任一方位，查看定级依据（rung · reasons · 旺衰）</span>
        )}
      </div>
    </div>
  );
}

function PalaceReasons({ ps }: { ps: PalaceScore }) {
  const b = BANDV2[ps.band];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="font-semibold" style={{ color: b.color }}>
          {ps.direction ? DIRECTION_LABEL[ps.direction] : ''}方 · {ps.blocked ? '不用' : b.label}
        </span>
        <span style={{ color: 'var(--text-dim)' }}>{ps.rung}</span>
        <span style={{ color: 'var(--text-dim)' }}>基面：{ps.baseFilter}</span>
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
