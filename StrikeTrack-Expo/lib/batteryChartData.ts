import type { BatteryReading, MatchUsage } from './database';

export type TimeValuePoint = { t: number; v: number };

function syntheticPreOhms(
  batteryId: string,
  matchCreatedAt: string,
  readings: BatteryReading[]
): number | null {
  const t0 = new Date(matchCreatedAt).getTime();
  const candidates = readings.filter((r) => {
    if (r.battery_id !== batteryId) return false;
    if (r.status !== 'Charging') return false;
    if (new Date(r.created_at).getTime() > t0) return false;
    const o = r.internal_resistance;
    return o != null && Number.isFinite(o) && o > 0;
  });
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return candidates[0].internal_resistance;
}

/** Charge % over time from workflow readings (oldest → newest). */
export function chargeHistoryFromReadings(readings: BatteryReading[]): TimeValuePoint[] {
  return readings
    .filter((r) => Number.isFinite(r.charge_percent))
    .map((r) => ({
      t: new Date(r.created_at).getTime(),
      v: r.charge_percent,
    }))
    .sort((a, b) => a.t - b.t);
}

/** Measured ohms over time from readings that include internal resistance (oldest → newest). */
export function ohmsHistoryFromReadings(readings: BatteryReading[]): TimeValuePoint[] {
  return readings
    .filter(
      (r): r is BatteryReading & { internal_resistance: number } =>
        r.internal_resistance != null &&
        Number.isFinite(r.internal_resistance) &&
        r.internal_resistance > 0
    )
    .map((r) => ({
      t: new Date(r.created_at).getTime(),
      v: r.internal_resistance,
    }))
    .sort((a, b) => a.t - b.t);
}

/**
 * Ω change per completed match (post − pre), using match row pre-ohms or last Charging reading before match.
 * X = time match ended (`after_recorded_at`).
 */
export function ohmsDeltaHistoryFromMatches(
  batteryId: string,
  usages: MatchUsage[],
  readings: BatteryReading[]
): TimeValuePoint[] {
  const out: TimeValuePoint[] = [];
  for (const u of usages) {
    if (u.battery_id !== batteryId || u.after_recorded_at == null) continue;

    let beforeOhms = u.before_internal_resistance;
    if (
      (beforeOhms == null || !Number.isFinite(beforeOhms) || beforeOhms <= 0) &&
      u.after_internal_resistance != null
    ) {
      const syn = syntheticPreOhms(batteryId, u.created_at, readings);
      if (syn != null) beforeOhms = syn;
    }
    const afterOhms = u.after_internal_resistance;
    if (
      beforeOhms == null ||
      afterOhms == null ||
      !Number.isFinite(beforeOhms) ||
      !Number.isFinite(afterOhms) ||
      beforeOhms <= 0 ||
      afterOhms <= 0
    ) {
      continue;
    }
    out.push({
      t: new Date(u.after_recorded_at).getTime(),
      v: afterOhms - beforeOhms,
    });
  }
  return out.sort((a, b) => a.t - b.t);
}
