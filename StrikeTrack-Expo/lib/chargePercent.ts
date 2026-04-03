/** Maximum charge % allowed anywhere in the app (inputs and persisted values). */
export const MAX_CHARGE_PERCENT = 130;

export function clampChargePercent(n: number): number {
  return Math.min(MAX_CHARGE_PERCENT, Math.max(0, n));
}

/** Live TextInput handler: block numeric values above max (keeps intermediate typing like "12"). */
export function capChargePercentInput(value: string): string {
  const t = value.trim();
  if (t === '') return value;
  const n = parseFloat(value.replace(',', '.'));
  if (!Number.isNaN(n) && n > MAX_CHARGE_PERCENT) return String(MAX_CHARGE_PERCENT);
  return value;
}
