import type { BatteryStatus } from './constants';

export type ParsedBatteryReading = {
  status?: BatteryStatus;
  chargePercent?: number;
  voltageNoLoad?: number;
  voltageLoad1?: number;
  voltageLoad2?: number;
  currentLoad2?: number;
  internalResistance?: number;
};

const STATUSES: BatteryStatus[] = ['Good', 'Fair', 'Bad', 'Charge Battery'];

function parseStatus(text: string): BatteryStatus | undefined {
  const match = text.match(/Status:\s*(Good|Fair|Bad|Charge Battery)/i);
  if (match) {
    const s = STATUSES.find((x) => x.toLowerCase() === match[1].toLowerCase());
    if (s) return s;
  }
  for (const status of STATUSES) {
    if (text.includes(status)) return status;
  }
  return undefined;
}

function parseCharge(text: string): number | undefined {
  const match = text.match(/Charge:\s*(\d{1,3})%?/i);
  if (match) {
    const val = parseFloat(match[1]);
    return Math.min(130, Math.max(0, val));
  }
  const pctMatch = text.match(/\d{1,3}%/);
  if (pctMatch) {
    const val = parseFloat(pctMatch[0].replace('%', ''));
    return Math.min(130, Math.max(0, val));
  }
  return undefined;
}

function parseVoltageLine(
  text: string,
  prefix: string
): [number | undefined, number | undefined] {
  const pattern = new RegExp(
    `${prefix}:\\s*([0-9.]+)\\s*([0-9]+)\\s*Amps?`,
    'i'
  );
  const match = text.match(pattern);
  if (match) {
    const voltage = parseFloat(match[1]);
    const amps = match[2] ? parseFloat(match[2]) : undefined;
    return [voltage, amps];
  }
  return [undefined, undefined];
}

function parseRint(text: string): number | undefined {
  const match = text.match(/Rint:\s*([\d.]+)\s*Ohms?/i);
  if (match) {
    return parseFloat(match[1]);
  }
  const ohmsMatch = text.match(/[\d.]+\s*Ohms?/i);
  if (ohmsMatch) {
    const numStr = ohmsMatch[0].replace(/[^0-9.]/g, '');
    const val = parseFloat(numStr);
    if (!isNaN(val)) return val;
  }
  return undefined;
}

export function parseBatteryBeak(ocrText: string): ParsedBatteryReading {
  const text = ocrText
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const [v0] = parseVoltageLine(text, 'V0');
  const [v1] = parseVoltageLine(text, 'V1');
  const [, amps2] = parseVoltageLine(text, 'V2');

  return {
    status: parseStatus(text),
    chargePercent: parseCharge(text),
    voltageNoLoad: v0,
    voltageLoad1: v1,
    voltageLoad2: parseVoltageLine(text, 'V2')[0],
    currentLoad2: amps2,
    internalResistance: parseRint(text),
  };
}
