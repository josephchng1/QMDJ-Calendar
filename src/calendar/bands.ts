/** 时辰 → clock window label, e.g. 子 → 23–01. Branch index 0=子 … 11=亥. */
export function shichenWindow(branchIndex: number): string {
  const start = (23 + branchIndex * 2) % 24;
  const end = (start + 2) % 24;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(start)}–${p(end)}`;
}
