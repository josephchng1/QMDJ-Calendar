import { useState } from 'react';
import type { Board } from '../types.ts';
import type { PalaceScore } from '../calendar/palace.ts';
import { PalaceCell } from './PalaceCell.tsx';
import { PalaceReasons } from './PalaceReasons.tsx';

// Classic display order 4-9-2 / 3-5-7 / 8-1-6 over the flat palaces[0..8] array.
const ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

// The 奇门盘 for one 时辰. When `scores` (the hour's PalaceScore[], index-ordered)
// is supplied, each cell is tinted by its SCORE band + shows a corner score, and
// clicking a palace reveals its rule-ladder reasons (§6.6).
export function PalaceGrid({
  board, scores,
}: {
  board: Board;
  scores?: PalaceScore[];
}) {
  const [focus, setFocus] = useState<number | null>(null);
  const focusPs = focus != null && scores ? scores[focus - 1] : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="panel gold-frame p-3">
        <div className="grid grid-cols-3 gap-2">
          {ORDER.map((p) => {
            const score = scores ? scores[p - 1] : undefined;
            const clickable = !!scores && p !== 5;
            return (
              <PalaceCell
                key={p}
                palace={board.palaces[p - 1]}
                score={score}
                focused={focus === p}
                onClick={clickable ? () => setFocus(focus === p ? null : p) : undefined}
              />
            );
          })}
        </div>
      </div>

      {scores && (
        <div className="panel p-3 text-xs" style={{ minHeight: 64 }}>
          {focusPs
            ? <PalaceReasons ps={focusPs} />
            : <span style={{ color: 'var(--text-dim)' }}>点选任一宫，查看定级依据（rung · reasons · 旺衰）</span>}
        </div>
      )}
    </div>
  );
}
