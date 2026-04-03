import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FONT } from '@/lib/constants';
import type { Battery, BatteryReading } from '@/lib/database';
import type { SectionLayout, StorageSection } from '@/lib/storageLayout';

type CellBattery = Battery & {
  latest_reading?: BatteryReading;
};

function formatResistance(value: number | null | undefined): string {
  if (value == null) return '--';
  const n = Number(value);
  if (Number.isNaN(n)) return '--';
  return `${n.toFixed(3)} Ω`;
}

function formatCharge(value: number | null | undefined): string {
  if (value == null) return '--';
  const n = Number(value);
  if (Number.isNaN(n)) return '--';
  return `${Math.round(n)}%`;
}

const SECTION_THEME: Record<
  StorageSection,
  {
    icon: keyof typeof Feather.glyphMap;
    iconColor: string;
    label: string;
    dot: string;
  }
> = {
  on_field: {
    icon: 'play',
    iconColor: '#f87171',
    label: 'ON FIELD',
    dot: '#fb7185',
  },
  charging: {
    icon: 'zap',
    iconColor: '#34d399',
    label: 'CHARGING',
    dot: '#34d399',
  },
  not_charging: {
    icon: 'wind',
    iconColor: '#fbbf24',
    label: 'COOLING DOWN',
    dot: '#f59e0b',
  },
  extra: {
    icon: 'inbox',
    iconColor: '#a1a1aa',
    label: 'UNASSIGNED',
    dot: '#71717a',
  },
};

type Props = {
  title: string;
  section: StorageSection;
  layout: SectionLayout;
  slots: (CellBattery | null)[];
  cooldownMinutesByBatteryId?: Record<string, number>;
  onPressSlot: (section: StorageSection, slotIndex: number, battery: CellBattery | null) => void;
  onLongPressSlot: (section: StorageSection, slotIndex: number, battery: CellBattery | null) => void;
};

export function BatterySection({
  title,
  section,
  layout,
  slots,
  cooldownMinutesByBatteryId,
  onPressSlot,
  onLongPressSlot,
}: Props) {
  const { slotCount, columns } = layout;
  const { width } = useWindowDimensions();
  const compactStatValue = width < 390;
  const theme = SECTION_THEME[section];
  const responsiveColumns = useMemo(() => {
    if (width < 640) return 1;
    if (section === 'charging') {
      if (width < 768) return 2;
      if (width < 1024) return 3;
      if (width < 1280) return 4;
      return 5;
    }
    return columns;
  }, [columns, section, width]);

  const rows = useMemo(() => {
    const output: number[] = [];
    for (let start = 0; start < slotCount; start += responsiveColumns) {
      output.push(start);
    }
    return output;
  }, [slotCount, responsiveColumns]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Feather name={theme.icon} size={18} color={theme.iconColor} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {rows.map((start) => (
        <View key={start} style={styles.row}>
          {Array.from({ length: responsiveColumns }, (_, col) => {
            const idx = start + col;
            if (idx >= slotCount) {
              return <View key={col} style={[styles.cellSpacer, { flex: 1 }]} />;
            }
            const b = slots[idx];
            return (
              <Pressable
                key={idx}
                style={({ hovered, pressed }) => [
                  styles.cell,
                  {
                    borderColor: hovered ? '#3f3f46' : 'rgba(63, 63, 70, 0.5)',
                    backgroundColor: hovered || pressed ? 'rgba(39, 39, 42, 0.8)' : '#18181b',
                  },
                ]}
                onPress={() => onPressSlot(section, idx, b)}
                onLongPress={() => onLongPressSlot(section, idx, b)}
                delayLongPress={400}
              >
                <View style={styles.topRow}>
                  <View style={styles.idGroup}>
                    <Text style={[styles.batteryName, !b ? styles.batteryNameMuted : null]} numberOfLines={1}>
                      {b?.name ?? 'Unassigned'}
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: b ? theme.dot : '#52525b' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        section === 'not_charging' && cooldownMinutesByBatteryId?.[b?.id ?? ''] != null
                          ? styles.statusTextNoTransform
                          : null,
                      ]}
                    >
                      {b
                        ? section === 'not_charging' && cooldownMinutesByBatteryId?.[b.id] != null
                          ? `COOLING ~${cooldownMinutesByBatteryId[b.id]}m`
                          : theme.label
                        : 'OPEN'}
                    </Text>
                  </View>
                </View>

                <View style={styles.dataSpacer} />
                <View style={styles.statsRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>Charge</Text>
                    <Text
                      style={[
                        styles.statValue,
                        compactStatValue ? styles.statValueCompact : null,
                        !b?.latest_reading ? styles.statValueMuted : null,
                      ]}
                    >
                      {formatCharge(b?.latest_reading?.charge_percent)}
                    </Text>
                  </View>
                  <View style={[styles.statBlock, styles.statBlockRight]}>
                    <Text style={[styles.statLabel, styles.statLabelRight]}>Resistance</Text>
                    <Text
                      style={[
                        styles.statValue,
                        styles.statValueRight,
                        b?.latest_reading?.internal_resistance == null
                          ? styles.statValueMuted
                          : null,
                        compactStatValue ? styles.statValueCompact : null,
                      ]}
                    >
                      {formatResistance(b?.latest_reading?.internal_resistance)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 63, 70, 0.4)',
    paddingBottom: 12,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: FONT.section + 1,
    fontWeight: '800',
    color: '#f4f4f5',
    textAlign: 'left',
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  cellSpacer: {
    minHeight: 1,
  },
  cell: {
    flex: 1,
    minHeight: 128,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idGroup: {
    justifyContent: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  batteryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f4f4f5',
    lineHeight: 21,
    flexShrink: 1,
  },
  batteryNameMuted: {
    color: '#71717a',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  statusText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.25,
  },
  statusTextNoTransform: {
    textTransform: 'none',
  },
  dataSpacer: {
    flex: 1,
  },
  statsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 6,
  },
  statBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  statLabel: {
    fontSize: 8,
    color: '#71717a',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statValue: {
    fontSize: 24,
    color: '#f4f4f5',
    fontWeight: '800',
    lineHeight: 26,
    flexShrink: 0,
  },
  statValueCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  statBlockRight: {
    alignItems: 'flex-end',
  },
  statLabelRight: {
    textAlign: 'right',
  },
  statValueRight: {
    textAlign: 'right',
  },
  statValueMuted: {
    color: '#3f3f46',
  },
});
