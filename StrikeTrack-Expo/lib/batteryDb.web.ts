// Web: localStorage-backed store (expo-sqlite is native-only)
// Data persists across refreshes and works offline after first load.

import type { Battery, BatteryReading, MatchUsage } from './database.web';

const BATTERIES_KEY = 'striketrack_batteries';
const READINGS_KEY = 'striketrack_readings';
const MATCH_USAGES_KEY = 'striketrack_match_usages';

function normalizeBattery(raw: Record<string, unknown>): Battery {
  return {
    id: String(raw.id),
    name: String(raw.name),
    chemistry: String(raw.chemistry),
    voltage: Number(raw.voltage),
    amphour: Number(raw.amphour),
    notes: raw.notes != null ? String(raw.notes) : null,
    rack_slot: typeof raw.rack_slot === 'number' ? raw.rack_slot : null,
    created_at: String(raw.created_at),
  };
}

function loadBatteries(): Battery[] {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(BATTERIES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Record<string, unknown>[];
    return arr.map(normalizeBattery);
  } catch {
    return [];
  }
}

function loadReadings(): BatteryReading[] {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(READINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadMatchUsages(): MatchUsage[] {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(MATCH_USAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBatteries(data: Battery[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(BATTERIES_KEY, JSON.stringify(data));
  }
}

function saveReadings(data: BatteryReading[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(READINGS_KEY, JSON.stringify(data));
  }
}

function saveMatchUsages(data: MatchUsage[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MATCH_USAGES_KEY, JSON.stringify(data));
  }
}

export async function getAllBatteries(): Promise<(Battery & { latest_reading?: BatteryReading })[]> {
  const batteries = loadBatteries();
  const readings = loadReadings();
  return batteries
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((b) => {
      const latest = readings
        .filter((r) => r.battery_id === b.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      return { ...b, latest_reading: latest };
    });
}

export async function getBatteryById(id: string): Promise<Battery | null> {
  const batteries = loadBatteries();
  return batteries.find((b) => b.id === id) ?? null;
}

export async function getReadingsByBatteryId(batteryId: string): Promise<BatteryReading[]> {
  const readings = loadReadings();
  return readings
    .filter((r) => r.battery_id === batteryId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function insertBattery(battery: Omit<Battery, 'created_at'>): Promise<void> {
  const batteries = loadBatteries();
  batteries.push({
    ...battery,
    rack_slot: battery.rack_slot ?? null,
    created_at: new Date().toISOString(),
  });
  saveBatteries(batteries);
}

export async function updateBattery(
  id: string,
  updates: Partial<Pick<Battery, 'name' | 'chemistry' | 'voltage' | 'amphour' | 'notes' | 'rack_slot'>>
): Promise<void> {
  const batteries = loadBatteries();
  const i = batteries.findIndex((b) => b.id === id);
  if (i >= 0) {
    batteries[i] = { ...batteries[i], ...updates };
    saveBatteries(batteries);
  }
}

export async function setBatteryRackSlot(batteryId: string, slot: number | null): Promise<void> {
  const batteries = loadBatteries();
  if (slot != null) {
    for (const b of batteries) {
      if (b.rack_slot === slot && b.id !== batteryId) {
        b.rack_slot = null;
      }
    }
  }
  const i = batteries.findIndex((b) => b.id === batteryId);
  if (i >= 0) {
    batteries[i].rack_slot = slot;
    saveBatteries(batteries);
  }
}

export async function deleteBattery(id: string): Promise<void> {
  const batteries = loadBatteries().filter((b) => b.id !== id);
  const readings = loadReadings().filter((r) => r.battery_id !== id);
  const usages = loadMatchUsages().filter((u) => u.battery_id !== id);
  saveBatteries(batteries);
  saveReadings(readings);
  saveMatchUsages(usages);
}

export async function insertReading(reading: Omit<BatteryReading, 'created_at'>): Promise<void> {
  const readings = loadReadings();
  readings.push({
    ...reading,
    created_at: new Date().toISOString(),
  });
  saveReadings(readings);
}

export async function getAllMatchUsages(): Promise<MatchUsage[]> {
  return loadMatchUsages().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getMatchUsagesByBatteryId(batteryId: string): Promise<MatchUsage[]> {
  return loadMatchUsages()
    .filter((u) => u.battery_id === batteryId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getMatchUsageById(id: string): Promise<MatchUsage | null> {
  return loadMatchUsages().find((u) => u.id === id) ?? null;
}

export async function getPendingMatchUsages(batteryId: string): Promise<MatchUsage[]> {
  return loadMatchUsages()
    .filter((u) => u.battery_id === batteryId && u.after_recorded_at == null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function insertMatchUsageBefore(row: {
  id: string;
  battery_id: string;
  match_label: string;
  before_charge_percent: number | null;
  before_voltage_no_load: number | null;
  before_internal_resistance: number | null;
}): Promise<void> {
  const usages = loadMatchUsages();
  const full: MatchUsage = {
    ...row,
    after_charge_percent: null,
    after_voltage_no_load: null,
    after_internal_resistance: null,
    after_recorded_at: null,
    created_at: new Date().toISOString(),
  };
  usages.push(full);
  saveMatchUsages(usages);
}

export async function completeMatchUsageAfter(
  id: string,
  after: {
    after_charge_percent: number;
    after_voltage_no_load: number | null;
    after_internal_resistance: number | null;
  }
): Promise<void> {
  const usages = loadMatchUsages();
  const i = usages.findIndex((u) => u.id === id);
  if (i < 0) return;
  usages[i] = {
    ...usages[i],
    after_charge_percent: after.after_charge_percent,
    after_voltage_no_load: after.after_voltage_no_load,
    after_internal_resistance: after.after_internal_resistance,
    after_recorded_at: new Date().toISOString(),
  };
  saveMatchUsages(usages);
}
