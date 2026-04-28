import type { BatteryReading, MatchUsage } from './database';

export type StatRank = {
  batteryId: string;
  batteryName: string;
  /**
   * Sort / primary display: charge loss %, Ω Δ, or avg minutes cooling→charger.
   */
  avgValue: number;
  matchCount: number;
  /** Cooling→charger: avg % charge gain when next Charging reading was taken. */
  secondaryValue?: number;
};

export type ChargeLossBlock = {
  /** Best among packs not in bottom; up to 3, lowest avg loss first. */
  bestThree: StatRank[];
  /** Up to 3 worst avg loss (worst first); disjoint from bestThree — filled first. */
  worstThree: StatRank[];
  hasData: boolean;
};

export type OhmsDeltaBlock = {
  /** Best among packs not in bottom; up to 3, lowest ΔΩ first. */
  bestThree: StatRank[];
  /** Up to 3 worst ΔΩ (worst first); disjoint from bestThree — filled first. */
  worstThree: StatRank[];
  hasData: boolean;
};

export type CoolingBlock = {
  /** Fastest avg time-to-charger among packs not in bottom; up to 3. */
  bestThree: StatRank[];
  /** Slowest avg time-to-charger (worst first); disjoint from bestThree. */
  worstThree: StatRank[];
  hasData: boolean;
};

export type PerformanceSummary = {
  chargeLoss: ChargeLossBlock;
  ohmsDelta: OhmsDeltaBlock;
  cooling: CoolingBlock;
};

export type BatteryForStats = {
  id: string;
  name: string;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Value line for charge-loss rows; card title carries “(avg)”. */
export function formatChargeLossHeadline(avgLoss: number): string {
  const sign = avgLoss >= 0 ? '−' : '+';
  const mag = round1(Math.abs(avgLoss));
  return `${sign}${mag}%`;
}

/** Value line for Ω Δ rows; card title carries “(avg)”. */
export function formatOhmsHeadline(avgDelta: number): string {
  const sign = avgDelta >= 0 ? '+' : '−';
  const mag = Math.abs(avgDelta).toFixed(2);
  return `${sign}${mag} Ω`;
}

/** Cooling row: minutes to next charger + avg % gain (secondaryValue). */
export function formatCoolingHeadline(rank: StatRank): string {
  const min = round1(rank.avgValue);
  const g = rank.secondaryValue;
  if (g == null || !Number.isFinite(g)) return `${min} min`;
  const sign = g >= 0 ? '+' : '';
  return `${min} min · ${sign}${round1(g)}%`;
}

/** Latest Charging reading with ohms strictly before match row `created_at`. */
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

/**
 * Offline-only stats: charge loss and Ω Δ from match_usages (+ reading fallback),
 * cooling→charger metrics when `after_return_path === 'cooling'`.
 */
export function summarizeBatteryPerformance(
  batteries: BatteryForStats[],
  matchUsages: MatchUsage[],
  readings: BatteryReading[]
): PerformanceSummary {
  const nameById = new Map(batteries.map((b) => [b.id, b.name]));

  const chargeLossByBattery = new Map<string, number[]>();
  const ohmsDeltaByBattery = new Map<string, number[]>();

  const readingsAsc = [...readings].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const coolingByBattery = new Map<string, { minutes: number[]; gains: number[] }>();

  for (const u of matchUsages) {
    if (u.after_recorded_at == null) continue;

    const before = u.before_charge_percent;
    const after = u.after_charge_percent;
    if (before != null && after != null && Number.isFinite(before) && Number.isFinite(after)) {
      const loss = before - after;
      const list = chargeLossByBattery.get(u.battery_id) ?? [];
      list.push(loss);
      chargeLossByBattery.set(u.battery_id, list);
    }

    let beforeOhms = u.before_internal_resistance;
    if (
      (beforeOhms == null || !Number.isFinite(beforeOhms) || beforeOhms <= 0) &&
      u.after_internal_resistance != null
    ) {
      const syn = syntheticPreOhms(u.battery_id, u.created_at, readings);
      if (syn != null) beforeOhms = syn;
    }
    const afterOhms = u.after_internal_resistance;
    if (
      beforeOhms != null &&
      afterOhms != null &&
      Number.isFinite(beforeOhms) &&
      Number.isFinite(afterOhms) &&
      beforeOhms > 0 &&
      afterOhms > 0
    ) {
      const dList = ohmsDeltaByBattery.get(u.battery_id) ?? [];
      dList.push(afterOhms - beforeOhms);
      ohmsDeltaByBattery.set(u.battery_id, dList);
    }

    if (u.after_return_path === 'cooling' && u.after_charge_percent != null && u.after_recorded_at) {
      const tAfter = new Date(u.after_recorded_at).getTime();
      const nextCharging = readingsAsc.find(
        (r) =>
          r.battery_id === u.battery_id &&
          r.status === 'Charging' &&
          new Date(r.created_at).getTime() > tAfter
      );
      if (nextCharging) {
        const tCh = new Date(nextCharging.created_at).getTime();
        const bucket = coolingByBattery.get(u.battery_id) ?? { minutes: [], gains: [] };
        bucket.minutes.push((tCh - tAfter) / 60000);
        bucket.gains.push(nextCharging.charge_percent - u.after_charge_percent);
        coolingByBattery.set(u.battery_id, bucket);
      }
    }
  }

  type Agg = { id: string; name: string; avg: number; n: number };
  const chargeAggs: Agg[] = [];
  for (const [id, vals] of chargeLossByBattery) {
    if (vals.length === 0) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    chargeAggs.push({ id, name: nameById.get(id) ?? 'Battery', avg, n: vals.length });
  }

  const ohmAggs: Agg[] = [];
  for (const [id, vals] of ohmsDeltaByBattery) {
    if (vals.length === 0) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    ohmAggs.push({ id, name: nameById.get(id) ?? 'Battery', avg, n: vals.length });
  }

  const toRank = (a: Agg): StatRank => ({
    batteryId: a.id,
    batteryName: a.name,
    avgValue: a.avg,
    matchCount: a.n,
  });

  /**
   * Each battery appears at most once. Bottom (worst) first: up to 3 tail of ascending sort.
   * Top = up to 3 best among the rest. `ascending` means lower metric = better (incl. fewer minutes).
   */
  function splitTopBottomThreeGeneric<T extends { id: string }>(
    sortedAscending: T[],
    mapToRank: (row: T) => StatRank
  ): { bestThree: StatRank[]; worstThree: StatRank[] } {
    const n = sortedAscending.length;
    if (n === 0) return { bestThree: [], worstThree: [] };

    const k = Math.min(3, n);
    const bottomSlice = sortedAscending.slice(n - k, n);
    const worstThree = [...bottomSlice].reverse().map(mapToRank);

    const bottomIds = new Set(bottomSlice.map((a) => a.id));
    const topPool = sortedAscending.filter((a) => !bottomIds.has(a.id));
    const bestThree = topPool.slice(0, 3).map(mapToRank);

    return { bestThree, worstThree };
  }

  const chargeLoss: ChargeLossBlock =
    chargeAggs.length > 0
      ? (() => {
          chargeAggs.sort((a, b) => a.avg - b.avg);
          const { bestThree, worstThree } = splitTopBottomThreeGeneric(chargeAggs, toRank);
          return { bestThree, worstThree, hasData: true };
        })()
      : { bestThree: [], worstThree: [], hasData: false };

  const ohmsDelta: OhmsDeltaBlock =
    ohmAggs.length > 0
      ? (() => {
          ohmAggs.sort((a, b) => a.avg - b.avg);
          const { bestThree, worstThree } = splitTopBottomThreeGeneric(ohmAggs, toRank);
          return { bestThree, worstThree, hasData: true };
        })()
      : { bestThree: [], worstThree: [], hasData: false };

  type CoolingAgg = { id: string; name: string; avgMin: number; avgGain: number; n: number };
  const coolingAggs: CoolingAgg[] = [];
  for (const [id, { minutes, gains }] of coolingByBattery) {
    if (minutes.length === 0) continue;
    const avgMin = round1(minutes.reduce((a, b) => a + b, 0) / minutes.length);
    const avgGain = round1(gains.reduce((a, b) => a + b, 0) / gains.length);
    coolingAggs.push({
      id,
      name: nameById.get(id) ?? 'Battery',
      avgMin,
      avgGain,
      n: minutes.length,
    });
  }

  const coolingToRank = (c: CoolingAgg): StatRank => ({
    batteryId: c.id,
    batteryName: c.name,
    avgValue: c.avgMin,
    matchCount: c.n,
    secondaryValue: c.avgGain,
  });

  const cooling: CoolingBlock =
    coolingAggs.length > 0
      ? (() => {
          coolingAggs.sort((a, b) => a.avgMin - b.avgMin);
          const { bestThree, worstThree } = splitTopBottomThreeGeneric(coolingAggs, coolingToRank);
          return { bestThree, worstThree, hasData: true };
        })()
      : { bestThree: [], worstThree: [], hasData: false };

  return {
    chargeLoss,
    ohmsDelta,
    cooling,
  };
}
