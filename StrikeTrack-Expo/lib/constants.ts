export type BatteryStatus = 'Good' | 'Fair' | 'Bad' | 'Charge Battery';
export type Chemistry = 'Lead Acid' | 'NiMH';
export type ReadingSource = 'Photo' | 'Manual';

export const BATTERY_STATUSES: BatteryStatus[] = ['Good', 'Fair', 'Bad', 'Charge Battery'];

export const COLORS = {
  background: '#1c1c1e',
  surface: '#2c2c2e',
  surfaceAlt: '#3a3a3c',
  text: '#ffffff',
  textSecondary: '#8e8e93',
  textTertiary: '#636366',
  primary: '#0a84ff',
  separator: '#38383a',
  destructive: '#ff3b30',
} as const;
export const CHEMISTRIES: Chemistry[] = ['Lead Acid', 'NiMH'];
export const VOLTAGES = [7, 9, 12] as const;
export const AMP_HOURS = [2, 3, 5, 10, 17] as const;
