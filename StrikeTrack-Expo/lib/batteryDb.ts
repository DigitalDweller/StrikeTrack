import * as SQLite from 'expo-sqlite';
import type { Battery, BatteryReading, MatchUsage } from './database';
import { clampChargePercent } from './chargePercent';
import type { StorageSection } from './storageLayout';

const DB_NAME = 'striketrack.db';

async function getDb() {
  return SQLite.openDatabaseAsync(DB_NAME);
}

export async function getAllBatteries(): Promise<(Battery & { latest_reading?: BatteryReading })[]> {
  const db = await getDb();
  const batteries = await db.getAllAsync<Battery>(
    'SELECT * FROM batteries ORDER BY name'
  );

  const result: (Battery & { latest_reading?: BatteryReading })[] = [];

  for (const b of batteries) {
    const latest = await db.getFirstAsync<BatteryReading>(
      'SELECT * FROM readings WHERE battery_id = ? ORDER BY created_at DESC LIMIT 1',
      [b.id]
    );
    result.push({ ...b, latest_reading: latest ?? undefined });
  }

  return result;
}

export async function getBatteryById(id: string): Promise<Battery | null> {
  const db = await getDb();
  return db.getFirstAsync<Battery>('SELECT * FROM batteries WHERE id = ?', [id]);
}

export async function getReadingsByBatteryId(batteryId: string): Promise<BatteryReading[]> {
  const db = await getDb();
  return db.getAllAsync<BatteryReading>(
    'SELECT * FROM readings WHERE battery_id = ? ORDER BY created_at DESC',
    [batteryId]
  );
}

export async function getAllReadings(): Promise<BatteryReading[]> {
  const db = await getDb();
  return db.getAllAsync<BatteryReading>('SELECT * FROM readings ORDER BY created_at DESC');
}

/** Highest charge % and ohms seen in any reading (for comparable chart Y-axis across batteries). */
export async function getGlobalReadingChartYMaxes(): Promise<{
  chargePercentMax: number | null;
  ohmsMax: number | null;
}> {
  const db = await getDb();
  const chargeRow = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(charge_percent) AS m FROM readings'
  );
  const ohmsRow = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(internal_resistance) AS m FROM readings WHERE internal_resistance IS NOT NULL AND internal_resistance > 0'
  );
  const c = chargeRow?.m;
  const o = ohmsRow?.m;
  return {
    chargePercentMax:
      c != null && Number.isFinite(c) && c > 0 ? c : null,
    ohmsMax: o != null && Number.isFinite(o) && o > 0 ? o : null,
  };
}

export async function insertBattery(battery: Omit<Battery, 'created_at'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO batteries (
      id, name, chemistry, voltage, amphour, notes, rack_slot, storage_section, storage_slot, charging_since, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      battery.id,
      battery.name,
      battery.chemistry,
      battery.voltage,
      battery.amphour,
      battery.notes ?? null,
      battery.rack_slot ?? null,
      battery.storage_section ?? null,
      battery.storage_slot ?? null,
      battery.charging_since ?? null,
      new Date().toISOString(),
    ]
  );
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
  const db = await getDb();
  const b = await getBatteryById(id);
  if (!b) return;

  await db.runAsync(
    `UPDATE batteries SET name = ?, chemistry = ?, voltage = ?, amphour = ?, notes = ?,
     rack_slot = ?, storage_section = ?, storage_slot = ?, charging_since = ? WHERE id = ?`,
    [
      updates.name ?? b.name,
      updates.chemistry ?? b.chemistry,
      updates.voltage ?? b.voltage,
      updates.amphour ?? b.amphour,
      updates.notes !== undefined ? updates.notes : b.notes,
      updates.rack_slot !== undefined ? updates.rack_slot : b.rack_slot,
      updates.storage_section !== undefined ? updates.storage_section : b.storage_section,
      updates.storage_slot !== undefined ? updates.storage_slot : b.storage_slot,
      updates.charging_since !== undefined ? updates.charging_since : b.charging_since,
      id,
    ]
  );
}

/**
 * Place a battery on the dashboard grid, or clear placement (section and slot both null).
 * Only one slot per battery; clears conflicts in the target slot.
 */
export async function setBatteryStoragePlacement(
  batteryId: string,
  section: StorageSection | null,
  slot: number | null
): Promise<void> {
  const db = await getDb();
  const b = await getBatteryById(batteryId);
  if (!b) return;

  if (section == null || slot == null) {
    await db.runAsync(
      'UPDATE batteries SET storage_section = NULL, storage_slot = NULL, charging_since = NULL WHERE id = ?',
      [batteryId]
    );
    return;
  }

  await db.runAsync(
    `UPDATE batteries SET storage_section = NULL, storage_slot = NULL, charging_since = NULL
     WHERE storage_section = ? AND storage_slot = ? AND id != ?`,
    [section, slot, batteryId]
  );

  const wasCharging = b.storage_section === 'charging';
  const nowCharging = section === 'charging';
  let chargingSince = b.charging_since ?? null;
  if (nowCharging && !wasCharging) {
    chargingSince = new Date().toISOString();
  } else if (!nowCharging) {
    chargingSince = null;
  }

  await db.runAsync(
    'UPDATE batteries SET storage_section = ?, storage_slot = ?, charging_since = ? WHERE id = ?',
    [section, slot, chargingSince, batteryId]
  );
}

/** Reassign charging slot indices without leaving `charging` (preserves charging_since). */
export async function reorderChargingSlots(batteryIdsInOrder: string[]): Promise<void> {
  if (batteryIdsInOrder.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of batteryIdsInOrder) {
      await db.runAsync(
        `UPDATE batteries SET storage_slot = storage_slot + 1000
         WHERE id = ? AND storage_section = 'charging'`,
        [id]
      );
    }
    for (let i = 0; i < batteryIdsInOrder.length; i++) {
      await db.runAsync(
        `UPDATE batteries SET storage_slot = ? WHERE id = ? AND storage_section = 'charging'`,
        [i, batteryIdsInOrder[i]]
      );
    }
  });
}

export async function getAllMatchUsages(): Promise<MatchUsage[]> {
  const db = await getDb();
  return db.getAllAsync<MatchUsage>('SELECT * FROM match_usages ORDER BY created_at DESC');
}

export async function getMatchUsagesByBatteryId(batteryId: string): Promise<MatchUsage[]> {
  const db = await getDb();
  return db.getAllAsync<MatchUsage>(
    'SELECT * FROM match_usages WHERE battery_id = ? ORDER BY created_at DESC',
    [batteryId]
  );
}

export async function getMatchUsageById(id: string): Promise<MatchUsage | null> {
  const db = await getDb();
  return db.getFirstAsync<MatchUsage>('SELECT * FROM match_usages WHERE id = ?', [id]);
}

export async function getPendingMatchUsages(batteryId: string): Promise<MatchUsage[]> {
  const db = await getDb();
  return db.getAllAsync<MatchUsage>(
    'SELECT * FROM match_usages WHERE battery_id = ? AND after_recorded_at IS NULL ORDER BY created_at DESC',
    [batteryId]
  );
}

export async function insertMatchUsageBefore(row: {
  id: string;
  battery_id: string;
  match_label: string;
  before_charge_percent: number | null;
  before_voltage_no_load: number | null;
  before_internal_resistance: number | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO match_usages (
      id, battery_id, match_label,
      before_charge_percent, before_voltage_no_load, before_internal_resistance,
      after_charge_percent, after_voltage_no_load, after_internal_resistance,
      after_recorded_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?)`,
    [
      row.id,
      row.battery_id,
      row.match_label,
      row.before_charge_percent == null
        ? null
        : clampChargePercent(row.before_charge_percent),
      row.before_voltage_no_load,
      row.before_internal_resistance,
      new Date().toISOString(),
    ]
  );
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
  const db = await getDb();
  const when = new Date().toISOString();
  const path =
    after.after_return_path === undefined ? null : after.after_return_path;
  await db.runAsync(
    `UPDATE match_usages SET
      after_charge_percent = ?,
      after_voltage_no_load = ?,
      after_internal_resistance = ?,
      after_recorded_at = ?,
      after_return_path = ?
    WHERE id = ?`,
    [
      clampChargePercent(after.after_charge_percent),
      after.after_voltage_no_load,
      after.after_internal_resistance,
      when,
      path,
      id,
    ]
  );
}


export async function deleteBattery(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM readings WHERE battery_id = ?', [id]);
  await db.runAsync('DELETE FROM match_usages WHERE battery_id = ?', [id]);
  await db.runAsync('DELETE FROM batteries WHERE id = ?', [id]);
}

export async function insertReading(reading: Omit<BatteryReading, 'created_at'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO readings (
      id, battery_id, status, charge_percent, voltage_no_load, voltage_load1,
      voltage_load2, current_load2, internal_resistance, raw_ocr_text, source, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reading.id,
      reading.battery_id ?? null,
      reading.status,
      clampChargePercent(reading.charge_percent),
      reading.voltage_no_load ?? null,
      reading.voltage_load1 ?? null,
      reading.voltage_load2 ?? null,
      reading.current_load2 ?? null,
      reading.internal_resistance ?? null,
      reading.raw_ocr_text ?? null,
      reading.source,
      new Date().toISOString(),
    ]
  );
}
