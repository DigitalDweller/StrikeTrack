import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT, RADIUS } from '@/lib/constants';
import type { Battery, BatteryReading } from '@/lib/database';
import type { SectionLayout, StorageSection } from '@/lib/storageLayout';
import { StatusBadge } from '@/components/StatusBadge';

type CellBattery = Battery & {
  latest_reading?: BatteryReading;
};

const SECTION_THEME: Record<
  StorageSection,
  {
    cardBg: string;
    cardBorder: string;
    title: string;
    emptyCellBg: string;
    cellBorder: string;
    slotNumber: string;
    emptyMark: string;
  }
> = {
  on_field: {
    cardBg: '#1a0d10',
    cardBorder: '#5c1f28',
    title: '#f87171',
    emptyCellBg: '#221417',
    cellBorder: '#7f1d2a',
    slotNumber: '#fca5a5',
    emptyMark: '#f87171',
  },
  charging: {
    cardBg: '#0d1a12',
    cardBorder: '#245a34',
    title: '#4ade80',
    emptyCellBg: '#132117',
    cellBorder: '#2f7a43',
    slotNumber: '#86efac',
    emptyMark: '#4ade80',
  },
  not_charging: {
    cardBg: '#1b1608',
    cardBorder: '#6a531a',
    title: '#facc15',
    emptyCellBg: '#252012',
    cellBorder: '#8b6a1f',
    slotNumber: '#fde047',
    emptyMark: '#facc15',
  },
  extra: {
    cardBg: '#161820',
    cardBorder: '#3a3d44',
    title: '#d1d5db',
    emptyCellBg: '#1d1f24',
    cellBorder: '#4b5563',
    slotNumber: '#e5e7eb',
    emptyMark: '#d1d5db',
  },
};

type Props = {
  title: string;
  section: StorageSection;
  layout: SectionLayout;
  slots: (CellBattery | null)[];
  onPressSlot: (section: StorageSection, slotIndex: number, battery: CellBattery | null) => void;
  onLongPressSlot: (section: StorageSection, slotIndex: number, battery: CellBattery | null) => void;
};

export function BatterySection({
  title,
  section,
  layout,
  slots,
  onPressSlot,
  onLongPressSlot,
}: Props) {
  const { slotCount, columns } = layout;
  const theme = SECTION_THEME[section];
  const rows: number[] = [];
  for (let start = 0; start < slotCount; start += columns) {
    rows.push(start);
  }

  return (
    <View style={[styles.wrap, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
      <Text style={[styles.title, { color: theme.title }]}>{title}</Text>
      {rows.map((start) => (
        <View key={start} style={styles.row}>
          {Array.from({ length: columns }, (_, col) => {
            const idx = start + col;
            if (idx >= slotCount) {
              return <View key={col} style={[styles.cellSpacer, { flex: 1 }]} />;
            }
            const b = slots[idx];
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.cell,
                  b ? styles.cellFilled : styles.cellEmpty,
                  { borderColor: theme.cellBorder },
                  !b ? { backgroundColor: theme.emptyCellBg } : null,
                ]}
                onPress={() => onPressSlot(section, idx, b)}
                onLongPress={() => onLongPressSlot(section, idx, b)}
                delayLongPress={400}
                activeOpacity={0.75}
              >
                <Text style={[styles.slotLabel, { color: theme.slotNumber }]}>{idx + 1}</Text>
                {b ? (
                  <View style={styles.filledContent}>
                    <Text
                      style={styles.cellName}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.35}
                    >
                      {b.name}
                    </Text>
                    <View style={styles.infoCol}>
                      {b.latest_reading ? (
                        <View style={styles.cellMeta}>
                          <View style={styles.badgeWrap}>
                            <StatusBadge status={b.latest_reading.status} />
                          </View>
                          <Text style={styles.cellPct}>
                            {Math.round(b.latest_reading.charge_percent)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noReading}>—</Text>
                      )}
                      <Text style={styles.cellOhms}>
                        {b.latest_reading?.internal_resistance != null
                          ? `${b.latest_reading.internal_resistance.toFixed(3)} Ω`
                          : '— Ω'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.emptyLabel, { color: theme.emptyMark }]}>—</Text>
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    marginBottom: 14,
  },
  title: {
    fontSize: FONT.section,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
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
    height: 100,
    borderRadius: RADIUS.md,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cellEmpty: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellFilled: {
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
  },
  filledContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
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
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 50,
    color: COLORS.text,
    flex: 1,
    paddingRight: 6,
    textAlign: 'left',
  },
  infoCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 112,
  },
  cellMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'nowrap',
  },
  badgeWrap: {
    transform: [{ scale: 1.12 }],
  },
  cellPct: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  noReading: {
    fontSize: FONT.meta,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  cellOhms: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  emptyLabel: {
    fontSize: 22,
    fontWeight: '300',
    color: COLORS.textTertiary,
  },
});
