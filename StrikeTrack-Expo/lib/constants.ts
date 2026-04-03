export type BatteryStatus = 'Good' | 'Fair' | 'Bad' | 'Charge Battery';
export type Chemistry = 'Lead Acid' | 'NiMH';
export type ReadingSource = 'Photo' | 'Manual';

export const BATTERY_STATUSES: BatteryStatus[] = ['Good', 'Fair', 'Bad', 'Charge Battery'];

/** App-wide dark palette and sizing */
export const COLORS = {
  background: '#09090b',
  surface: '#121216',
  surfaceAlt: '#1a1a20',
  surfaceMuted: '#222228',
  border: '#2a2a32',
  text: '#fafafa',
  textSecondary: '#b4b4be',
  textTertiary: '#71717c',
  primary: '#3b82f6',
  primaryMuted: '#1d4ed8',
  separator: '#27272f',
  destructive: '#f87171',
  warning: '#facc15',
} as const;

export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
} as const;

export const SPACE = {
  screen: 20,
  block: 22,
} as const;

export const FONT = {
  hero: 32,
  title: 26,
  section: 22,
  body: 19,
  bodyMedium: 19,
  label: 17,
  input: 22,
  button: 18,
  meta: 16,
} as const;

export const CHEMISTRIES: Chemistry[] = ['Lead Acid', 'NiMH'];
export const VOLTAGES = [7, 9, 12] as const;
export const AMP_HOURS = [2, 3, 5, 10, 17] as const;
