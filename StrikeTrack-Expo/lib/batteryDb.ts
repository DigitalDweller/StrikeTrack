import * as SQLite from 'expo-sqlite';
import type { Battery, BatteryReading, MatchUsage } from './database';

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

export async function insertBattery(battery: Omit<Battery, 'created_at'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO batteries (id, name, chemistry, voltage, amphour, notes, rack_slot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      battery.id,
      battery.name,
      battery.chemistry,
      battery.voltage,
      battery.amphour,
      battery.notes ?? null,
      battery.rack_slot ?? null,
      new Date().toISOString(),
    ]
  );
}

export async function updateBattery(
  id: string,
  updates: Partial<Pick<Battery, 'name' | 'chemistry' | 'voltage' | 'amphour' | 'notes' | 'rack_slot'>>
): Promise<void> {
  const db = await getDb();
  const b = await getBatteryById(id);
  if (!b) return;

  await db.runAsync(
    'UPDATE batteries SET name = ?, chemistry = ?, voltage = ?, amphour = ?, notes = ?, rack_slot = ? WHERE id = ?',
    [
      updates.name ?? b.name,
      updates.chemistry ?? b.chemistry,
      updates.voltage ?? b.voltage,
      updates.amphour ?? b.amphour,
      updates.notes !== undefined ? updates.notes : b.notes,
      updates.rack_slot !== undefined ? updates.rack_slot : b.rack_slot,
      id,
    ]
  );
}

/** Assign battery to rack slot 0–9 (2×5). Clears any other battery using that slot. Pass null to unassign. */
export async function setBatteryRackSlot(batteryId: string, slot: number | null): Promise<void> {
  const db = await getDb();
  if (slot != null) {
    await db.runAsync('UPDATE batteries SET rack_slot = NULL WHERE rack_slot = ? AND id != ?', [
      slot,
      batteryId,
    ]);
  }
  await db.runAsync('UPDATE batteries SET rack_slot = ? WHERE id = ?', [slot, batteryId]);
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
      row.before_charge_percent,
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
  }
): Promise<void> {
  const db = await getDb();
  const when = new Date().toISOString();
  await db.runAsync(
    `UPDATE match_usages SET
      after_charge_percent = ?,
      after_voltage_no_load = ?,
      after_internal_resistance = ?,
      after_recorded_at = ?
    WHERE id = ?`,
    [
      after.after_charge_percent,
      after.after_voltage_no_load,
      after.after_internal_resistance,
      when,
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
      reading.charge_percent,
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
