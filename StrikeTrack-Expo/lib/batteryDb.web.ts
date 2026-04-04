// Web: localStorage-backed store (expo-sqlite is native-only)
// Data persists across refreshes and works offline after first load.

import type { Battery, BatteryReading, MatchUsage } from './database.web';
import { clampChargePercent } from './chargePercent';
import { isStorageSection, type StorageSection } from './storageLayout';

const BATTERIES_KEY = 'striketrack_batteries';
const READINGS_KEY = 'striketrack_readings';
const MATCH_USAGES_KEY = 'striketrack_match_usages';

let memoryBatteries: Battery[] = [];
let memoryReadings: BatteryReading[] = [];
let memoryMatchUsages: MatchUsage[] = [];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getStorageItem(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures (private mode/quota), keep in-memory copy.
  }
}

function normalizeBattery(raw: Record<string, unknown>): Battery {
  let storage_section = toStringValue(raw.storage_section);
  let storage_slot = toFiniteNumber(raw.storage_slot);
  const rack = toFiniteNumber(raw.rack_slot);
  if (storage_section == null && rack != null) {
    storage_section = 'charging';
    storage_slot = rack;
  }
  if (!isStorageSection(storage_section)) {
    storage_section = null;
    storage_slot = null;
  }
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    chemistry: String(raw.chemistry ?? 'Lead Acid'),
    voltage: toFiniteNumber(raw.voltage) ?? 12,
    amphour: toFiniteNumber(raw.amphour) ?? 17,
    notes: toStringValue(raw.notes),
    rack_slot: rack,
    storage_section,
    storage_slot,
    charging_since: toStringValue(raw.charging_since),
    created_at: toStringValue(raw.created_at) ?? new Date().toISOString(),
  };
}

function normalizeReading(raw: Record<string, unknown>): BatteryReading {
  return {
    id: String(raw.id ?? ''),
    battery_id: toStringValue(raw.battery_id),
    status: toStringValue(raw.status) ?? 'Good',
    charge_percent: toFiniteNumber(raw.charge_percent) ?? 0,
    voltage_no_load: toFiniteNumber(raw.voltage_no_load),
    voltage_load1: toFiniteNumber(raw.voltage_load1),
    voltage_load2: toFiniteNumber(raw.voltage_load2),
    current_load2: toFiniteNumber(raw.current_load2),
    internal_resistance: toFiniteNumber(raw.internal_resistance),
    raw_ocr_text: toStringValue(raw.raw_ocr_text),
    source: toStringValue(raw.source) ?? 'Manual',
    created_at: toStringValue(raw.created_at) ?? new Date().toISOString(),
  };
}

function normalizeMatchUsage(raw: Record<string, unknown>): MatchUsage {
  return {
    id: String(raw.id ?? ''),
    battery_id: String(raw.battery_id ?? ''),
    match_label: toStringValue(raw.match_label) ?? 'Match',
    before_charge_percent: toFiniteNumber(raw.before_charge_percent),
    before_voltage_no_load: toFiniteNumber(raw.before_voltage_no_load),
    before_internal_resistance: toFiniteNumber(raw.before_internal_resistance),
    after_charge_percent: toFiniteNumber(raw.after_charge_percent),
    after_voltage_no_load: toFiniteNumber(raw.after_voltage_no_load),
    after_internal_resistance: toFiniteNumber(raw.after_internal_resistance),
    after_recorded_at: toStringValue(raw.after_recorded_at),
    after_return_path: toStringValue(raw.after_return_path),
    created_at: toStringValue(raw.created_at) ?? new Date().toISOString(),
  };
}

function loadBatteries(): Battery[] {
  const fallback = memoryBatteries.slice();
  try {
    const raw = getStorageItem(BATTERIES_KEY);
    if (!raw) return fallback;
    const arr = JSON.parse(raw) as Record<string, unknown>[];
    const data = arr.map(normalizeBattery).filter((b) => b.id.length > 0);
    memoryBatteries = data;
    return data;
  } catch {
    return fallback;
  }
}

function loadReadings(): BatteryReading[] {
  const fallback = memoryReadings.slice();
  try {
    const raw = getStorageItem(READINGS_KEY);
    if (!raw) return fallback;
    const arr = JSON.parse(raw) as Record<string, unknown>[];
    const data = arr.map(normalizeReading).filter((r) => r.id.length > 0);
    memoryReadings = data;
    return data;
  } catch {
    return fallback;
  }
}

function loadMatchUsages(): MatchUsage[] {
  const fallback = memoryMatchUsages.slice();
  try {
    const raw = getStorageItem(MATCH_USAGES_KEY);
    if (!raw) return fallback;
    const arr = JSON.parse(raw) as Record<string, unknown>[];
    const data = arr
      .map(normalizeMatchUsage)
      .filter((u) => u.id.length > 0 && u.battery_id.length > 0);
    memoryMatchUsages = data;
    return data;
  } catch {
    return fallback;
  }
}

function saveBatteries(data: Battery[]): void {
  memoryBatteries = data.slice();
  setStorageItem(BATTERIES_KEY, JSON.stringify(data));
}

function saveReadings(data: BatteryReading[]): void {
  memoryReadings = data.slice();
  setStorageItem(READINGS_KEY, JSON.stringify(data));
}

function saveMatchUsages(data: MatchUsage[]): void {
  memoryMatchUsages = data.slice();
  setStorageItem(MATCH_USAGES_KEY, JSON.stringify(data));
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

export async function getAllReadings(): Promise<BatteryReading[]> {
  return loadReadings();
}

export async function getGlobalReadingChartYMaxes(): Promise<{
  chargePercentMax: number | null;
  ohmsMax: number | null;
}> {
  const readings = loadReadings();
  let chargePercentMax: number | null = null;
  let ohmsMax: number | null = null;
  for (const r of readings) {
    if (Number.isFinite(r.charge_percent)) {
      chargePercentMax =
        chargePercentMax == null ? r.charge_percent : Math.max(chargePercentMax, r.charge_percent);
    }
    const ir = r.internal_resistance;
    if (ir != null && Number.isFinite(ir) && ir > 0) {
      ohmsMax = ohmsMax == null ? ir : Math.max(ohmsMax, ir);
    }
  }
  return {
    chargePercentMax:
      chargePercentMax != null && chargePercentMax > 0 ? chargePercentMax : null,
    ohmsMax: ohmsMax != null && ohmsMax > 0 ? ohmsMax : null,
  };
}

export async function insertBattery(battery: Omit<Battery, 'created_at'>): Promise<void> {
  const batteries = loadBatteries();
  batteries.push({
    ...battery,
    rack_slot: battery.rack_slot ?? null,
    storage_section: battery.storage_section ?? null,
    storage_slot: battery.storage_slot ?? null,
    charging_since: battery.charging_since ?? null,
    created_at: new Date().toISOString(),
  });
  saveBatteries(batteries);
}

export async function updateBattery(
  id: string,
  updates: Partial<
    Pick<
      Battery,
      | 'name'
      | 'chemistry'
      | 'voltage'
      | 'amphour'
      | 'notes'
      | 'rack_slot'
      | 'storage_section'
      | 'storage_slot'
      | 'charging_since'
    >
  >
): Promise<void> {
  const batteries = loadBatteries();
  const i = batteries.findIndex((b) => b.id === id);
  if (i >= 0) {
    batteries[i] = { ...batteries[i], ...updates };
    saveBatteries(batteries);
  }
}

export async function setBatteryStoragePlacement(
  batteryId: string,
  section: StorageSection | null,
  slot: number | null
): Promise<void> {
  const batteries = loadBatteries();
  const idx = batteries.findIndex((b) => b.id === batteryId);
  const b = idx >= 0 ? batteries[idx] : null;
  if (!b) return;

  if (section == null || slot == null) {
    b.storage_section = null;
    b.storage_slot = null;
    b.charging_since = null;
    saveBatteries(batteries);
    return;
  }
  for (const other of batteries) {
    if (other.storage_section === section && other.storage_slot === slot && other.id !== batteryId) {
      other.storage_section = null;
      other.storage_slot = null;
      other.charging_since = null;
    }
  }

  const wasCharging = b.storage_section === 'charging';
  const nowCharging = section === 'charging';
  if (nowCharging && !wasCharging) {
    b.charging_since = new Date().toISOString();
  } else if (!nowCharging) {
    b.charging_since = null;
  }

  b.storage_section = section;
  b.storage_slot = slot;
  saveBatteries(batteries);
}

export async function reorderChargingSlots(batteryIdsInOrder: string[]): Promise<void> {
  if (batteryIdsInOrder.length === 0) return;
  const batteries = loadBatteries();
  for (const id of batteryIdsInOrder) {
    const bb = batteries.find((x) => x.id === id);
    if (bb?.storage_section === 'charging' && bb.storage_slot != null) {
      bb.storage_slot += 1000;
    }
  }
  for (let i = 0; i < batteryIdsInOrder.length; i++) {
    const bb = batteries.find((x) => x.id === batteryIdsInOrder[i]);
    if (bb?.storage_section === 'charging') {
      bb.storage_slot = i;
    }
  }
  saveBatteries(batteries);
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
    before_charge_percent:
      row.before_charge_percent == null
        ? null
        : clampChargePercent(row.before_charge_percent),
    after_charge_percent: null,
    after_voltage_no_load: null,
    after_internal_resistance: null,
    after_recorded_at: null,
    after_return_path: null,
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
    after_return_path?: 'cooling' | 'charging' | 'unassigned' | null;
  }
): Promise<void> {
  const usages = loadMatchUsages();
  const i = usages.findIndex((u) => u.id === id);
  if (i < 0) return;
  const path =
    after.after_return_path === undefined ? null : after.after_return_path;
  usages[i] = {
    ...usages[i],
    after_charge_percent: clampChargePercent(after.after_charge_percent),
    after_voltage_no_load: after.after_voltage_no_load,
    after_internal_resistance: after.after_internal_resistance,
    after_recorded_at: new Date().toISOString(),
    after_return_path: path,
  };
  saveMatchUsages(usages);
}
