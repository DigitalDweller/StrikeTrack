import type { MatchUsage } from './database';

const REST_MS = 60 * 60 * 1000;

/** Minutes until the 1 hour post-match cool-off ends; null if not in cool-off window. */
export function minutesRestRemaining(usages: MatchUsage[], batteryId: string): number | null {
  const latestUsage = usages
    .filter((u) => u.battery_id === batteryId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const u = latestUsage;
  if (!u?.after_recorded_at) return null;
  const end = new Date(u.after_recorded_at).getTime() + REST_MS;
  const left = end - Date.now();
  if (left <= 0) return null;
  return Math.max(1, Math.ceil(left / 60000));
}
