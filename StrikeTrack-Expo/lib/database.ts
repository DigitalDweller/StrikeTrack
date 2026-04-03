import * as SQLite from 'expo-sqlite';

const DB_NAME = 'striketrack.db';

async function migrateSchema(db: SQLite.SQLiteDatabase) {
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(batteries)');
  if (!cols.some((c) => c.name === 'rack_slot')) {
    await db.execAsync('ALTER TABLE batteries ADD COLUMN rack_slot INTEGER');
  }
  if (!cols.some((c) => c.name === 'storage_section')) {
    await db.execAsync('ALTER TABLE batteries ADD COLUMN storage_section TEXT');
  }
  if (!cols.some((c) => c.name === 'storage_slot')) {
    await db.execAsync('ALTER TABLE batteries ADD COLUMN storage_slot INTEGER');
  }

  await db.runAsync(
    `UPDATE batteries SET storage_section = 'charging', storage_slot = rack_slot
     WHERE rack_slot IS NOT NULL AND storage_section IS NULL`
  );

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS match_usages (
      id TEXT PRIMARY KEY NOT NULL,
      battery_id TEXT NOT NULL,
      match_label TEXT NOT NULL,
      before_charge_percent REAL,
      before_voltage_no_load REAL,
      before_internal_resistance REAL,
      after_charge_percent REAL,
      after_voltage_no_load REAL,
      after_internal_resistance REAL,
      after_recorded_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (battery_id) REFERENCES batteries (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_match_usages_battery ON match_usages(battery_id);
    CREATE INDEX IF NOT EXISTS idx_match_usages_created ON match_usages(created_at);
  `);
}

export async function initDatabase() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS batteries (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      chemistry TEXT NOT NULL,
      voltage INTEGER NOT NULL,
      amphour INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS readings (
      id TEXT PRIMARY KEY NOT NULL,
      battery_id TEXT,
      status TEXT NOT NULL,
      charge_percent REAL NOT NULL,
      voltage_no_load REAL,
      voltage_load1 REAL,
      voltage_load2 REAL,
      current_load2 REAL,
      internal_resistance REAL,
      raw_ocr_text TEXT,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (battery_id) REFERENCES batteries (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_readings_battery ON readings(battery_id);
    CREATE INDEX IF NOT EXISTS idx_readings_created ON readings(created_at);
  `);

  await migrateSchema(db);

  return db;
}

export type Battery = {
  id: string;
  name: string;
  chemistry: string;
  voltage: number;
  amphour: number;
  notes: string | null;
  /** @deprecated use storage_section + storage_slot */
  rack_slot: number | null;
  storage_section: string | null;
  storage_slot: number | null;
  created_at: string;
};

/** One FRC match: before stats when pulled from rack; after stats post-match (starts 30 min rest timer). */
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

export type BatteryWithLatest = Battery & {
  latest_reading?: BatteryReading;
};
