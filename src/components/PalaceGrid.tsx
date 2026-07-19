import type { Board } from '../types.ts';
import { PalaceCell } from './PalaceCell.tsx';

// Classic display order 4-9-2 / 3-5-7 / 8-1-6 over the flat palaces[0..8] array.
const ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

export function PalaceGrid({ board, hourStem }: { board: Board; hourStem?: string }) {
  return (
    <div className="panel gold-frame p-3">
      <div className="grid grid-cols-3 gap-2">
        {ORDER.map((p) => (
          <PalaceCell key={p} palace={board.palaces[p - 1]} hourStem={hourStem} />
        ))}
      </div>
    </div>
  );
}
