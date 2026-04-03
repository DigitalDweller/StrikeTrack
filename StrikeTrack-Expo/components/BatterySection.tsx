import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT, RADIUS } from '@/lib/constants';
import type { Battery, BatteryReading } from '@/lib/database';
import type { SectionLayout, StorageSection } from '@/lib/storageLayout';
import { StatusBadge } from '@/components/StatusBadge';

type CellBattery = Battery & {
  latest_reading?: BatteryReading;
};

type Props = {
  title: string;
  section: StorageSection;
  layout: SectionLayout;
  slots: (CellBattery | null)[];
  restMinutesByBatteryId: Record<string, number>;
  onPressSlot: (section: StorageSection, slotIndex: number, battery: CellBattery | null) => void;
  onLongPressSlot: (section: StorageSection, slotIndex: number, battery: CellBattery | null) => void;
};

export function BatterySection({
  title,
  section,
  layout,
  slots,
  restMinutesByBatteryId,
  onPressSlot,
  onLongPressSlot,
}: Props) {
  const { slotCount, columns } = layout;
  const rows: number[] = [];
  for (let start = 0; start < slotCount; start += columns) {
    rows.push(start);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {rows.map((start) => (
        <View key={start} style={styles.row}>
          {Array.from({ length: columns }, (_, col) => {
            const idx = start + col;
            if (idx >= slotCount) {
              return <View key={col} style={[styles.cellSpacer, { flex: 1 }]} />;
            }
            const b = slots[idx];
            const restMin = b ? restMinutesByBatteryId[b.id] : undefined;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.cell, b ? styles.cellFilled : styles.cellEmpty]}
                onPress={() => onPressSlot(section, idx, b)}
                onLongPress={() => onLongPressSlot(section, idx, b)}
                delayLongPress={400}
                activeOpacity={0.75}
              >
                <Text style={styles.slotLabel}>{idx + 1}</Text>
                {b ? (
                  <>
                    <Text style={styles.cellName} numberOfLines={2}>
                      {b.name}
                    </Text>
                    {b.latest_reading ? (
                      <View style={styles.cellMeta}>
                        <StatusBadge status={b.latest_reading.status} />
                        <Text style={styles.cellPct}>
                          {Math.round(b.latest_reading.charge_percent)}%
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.noReading}>—</Text>
                    )}
                    {restMin != null ? (
                      <Text style={styles.restBadge}>Rest ~{restMin}m</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.emptyLabel}>—</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  title: {
    fontSize: FONT.section,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
    marginLeft: 4,
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  cellSpacer: {
    minHeight: 1,
  },
  cell: {
    flex: 1,
    minHeight: 102,
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cellEmpty: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellFilled: {
    backgroundColor: COLORS.surfaceAlt,
  },
  slotLabel: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  cellName: {
    fontSize: FONT.meta,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 6,
    marginRight: 22,
  },
  cellMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  cellPct: {
    fontSize: FONT.meta,
    fontWeight: '700',
    color: COLORS.text,
  },
  noReading: {
    fontSize: FONT.meta,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  emptyLabel: {
    fontSize: 22,
    fontWeight: '300',
    color: COLORS.textTertiary,
  },
  restBadge: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warning,
  },
});
