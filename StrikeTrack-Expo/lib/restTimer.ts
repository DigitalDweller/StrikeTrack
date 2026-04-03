import type { MatchUsage } from './database';

const REST_MS = 30 * 60 * 1000;

/** Minutes until the 30 min post-match rest ends; null if not in rest window. */
export function minutesRestRemaining(usages: MatchUsage[], batteryId: string): number | null {
  const withAfter = usages
    .filter((u) => u.battery_id === batteryId && u.after_recorded_at)
    .sort(
      (a, b) =>
        new Date(b.after_recorded_at!).getTime() - new Date(a.after_recorded_at!).getTime()
    );
  const u = withAfter[0];
  if (!u?.after_recorded_at) return null;
  const end = new Date(u.after_recorded_at).getTime() + REST_MS;
  const left = end - Date.now();
  if (left <= 0) return null;
  return Math.max(1, Math.ceil(left / 60000));
}
