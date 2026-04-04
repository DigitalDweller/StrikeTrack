// Web fallback: expo-sqlite is native-only. Types mirror lib/database.ts (no sqlite import).

export type Battery = {
  id: string;
  name: string;
  chemistry: string;
  voltage: number;
  amphour: number;
  notes: string | null;
  rack_slot: number | null;
  storage_section: string | null;
  storage_slot: number | null;
  charging_since: string | null;
  created_at: string;
};

export type BatteryReading = {
  id: string;
  battery_id: string | null;
  status: string;
  charge_percent: number;
  voltage_no_load: number | null;
  voltage_load1: number | null;
  voltage_load2: number | null;
  current_load2: number | null;
  internal_resistance: number | null;
  raw_ocr_text: string | null;
  source: string;
  created_at: string;
};

export type MatchUsage = {
  id: string;
  battery_id: string;
  match_label: string;
  before_charge_percent: number | null;
  before_voltage_no_load: number | null;
  before_internal_resistance: number | null;
  after_charge_percent: number | null;
  after_voltage_no_load: number | null;
  after_internal_resistance: number | null;
  after_recorded_at: string | null;
  after_return_path: string | null;
  created_at: string;
};

export type BatteryWithLatest = Battery & {
  latest_reading?: BatteryReading;
};

export async function initDatabase(): Promise<void> {
  return Promise.resolve();
}
