import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';
import type { Battery, BatteryReading } from '@/lib/database';
import { StatusBadge } from '@/components/StatusBadge';

export const RACK_SLOT_COUNT = 10;

type CellBattery = Battery & {
  latest_reading?: BatteryReading;
};

type Props = {
  slots: (CellBattery | null)[];
  restMinutesByBatteryId: Record<string, number>;
  onPressSlot: (slotIndex: number, battery: CellBattery | null) => void;
  onLongPressSlot: (slotIndex: number, battery: CellBattery | null) => void;
};

export function BatteryRack({
  slots,
  restMinutesByBatteryId,
  onPressSlot,
  onLongPressSlot,
}: Props) {
  const row = (start: number) => (
    <View style={styles.row}>
      {Array.from({ length: 5 }, (_, i) => {
        const idx = start + i;
        const b = slots[idx];
        const restMin = b ? restMinutesByBatteryId[b.id] : undefined;
        return (
          <TouchableOpacity
            key={idx}
            style={[styles.cell, b ? styles.cellFilled : styles.cellEmpty]}
            onPress={() => onPressSlot(idx, b)}
            onLongPress={() => onLongPressSlot(idx, b)}
            delayLongPress={400}
            activeOpacity={0.7}
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
                  <Text style={styles.noReading}>No reading</Text>
                )}
                {restMin != null ? (
                  <Text style={styles.restBadge}>Rest ~{restMin}m</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.emptyHint}>Tap to assign</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Pit rack (2×5)</Text>
      <Text style={styles.subtitle}>Long-press a filled slot to remove from rack</Text>
      {row(0)}
      {row(5)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  cell: {
    flex: 1,
    minHeight: 88,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.separator,
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
    top: 6,
    right: 6,
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  cellName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
    marginRight: 18,
  },
  cellMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  cellPct: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noReading: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 6,
  },
  emptyHint: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  restBadge: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#ffcc00',
  },
});
