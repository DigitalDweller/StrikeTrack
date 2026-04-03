/** Where a battery sits on the main dashboard grid */
export type StorageSection = 'charging' | 'on_field' | 'not_charging' | 'extra';

export const STORAGE_SECTION_LABELS: Record<StorageSection, string> = {
  charging: 'Charging',
  on_field: 'On field',
  not_charging: 'Cooling Down',
  extra: 'Unassigned',
};

export type SectionLayout = {
  slotCount: number;
  columns: number;
};

export const STORAGE_LAYOUT: Record<StorageSection, SectionLayout> = {
  charging: { slotCount: 12, columns: 6 },
  on_field: { slotCount: 2, columns: 2 },
  not_charging: { slotCount: 4, columns: 2 },
  extra: { slotCount: 4, columns: 2 },
};

/** Dashboard section order (top to bottom) */
export const STORAGE_SECTION_ORDER: StorageSection[] = [
  'on_field',
  'charging',
  'not_charging',
  'extra',
];

export function isStorageSection(s: string | null | undefined): s is StorageSection {
  return (
    s === 'charging' ||
    s === 'on_field' ||
    s === 'not_charging' ||
    s === 'extra'
  );
}
