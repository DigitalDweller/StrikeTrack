import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBadge } from '@/components/StatusBadge';
import { AddMenuFab } from '@/components/AddMenuFab';
import { BatterySection } from '@/components/BatterySection';
import {
  getAllBatteries,
  deleteBattery,
  setBatteryStoragePlacement,
  getAllMatchUsages,
} from '@/lib/batteryDb';
import { COLORS, FONT, RADIUS, SPACE } from '@/lib/constants';
import type { Battery, BatteryReading, MatchUsage } from '@/lib/database';
import {
  STORAGE_LAYOUT,
  STORAGE_SECTION_LABELS,
  STORAGE_SECTION_ORDER,
  type StorageSection,
} from '@/lib/storageLayout';
import { minutesRestRemaining } from '@/lib/restTimer';

type BatteryWithLatest = Battery & {
  latest_reading?: {
    status: string;
    charge_percent: number;
    created_at: string;
  };
};

type CellBattery = Battery & { latest_reading?: BatteryReading };

function buildSlots(
  batteries: CellBattery[],
  section: StorageSection,
  count: number
): (CellBattery | null)[] {
  const arr: (CellBattery | null)[] = Array.from({ length: count }, () => null);
  for (const b of batteries) {
    if (b.storage_section === section && b.storage_slot != null) {
      const s = b.storage_slot;
      if (s >= 0 && s < count) arr[s] = b;
    }
  }
  return arr;
}

function isPlaced(b: Battery): boolean {
  return b.storage_section != null && b.storage_section !== '' && b.storage_slot != null;
}

export default function BatteryListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [batteries, setBatteries] = useState<BatteryWithLatest[]>([]);
  const [matchUsages, setMatchUsages] = useState<MatchUsage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  const load = async () => {
    setRefreshing(true);
    const [data, usages] = await Promise.all([getAllBatteries(), getAllMatchUsages()]);
    setBatteries(data as BatteryWithLatest[]);
    setMatchUsages(usages);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const slotMaps = useMemo(() => {
    const list = batteries as CellBattery[];
    const out: Record<StorageSection, (CellBattery | null)[]> = {} as Record<
      StorageSection,
      (CellBattery | null)[]
    >;
    for (const section of STORAGE_SECTION_ORDER) {
      const { slotCount } = STORAGE_LAYOUT[section];
      out[section] = buildSlots(list, section, slotCount);
    }
    return out;
  }, [batteries]);

  const restMinutesByBatteryId = useMemo(() => {
    void tick;
    const m: Record<string, number> = {};
    for (const b of batteries) {
      const min = minutesRestRemaining(matchUsages, b.id);
      if (min != null) m[b.id] = min;
    }
    return m;
  }, [batteries, matchUsages, tick]);

  const handleDelete = (battery: BatteryWithLatest) => {
    Alert.alert(
      'Delete Battery',
      `Remove "${battery.name}"? All readings and match logs will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBattery(battery.id);
            load();
          },
        },
      ]
    );
  };

  const unassignedBatteries = useMemo(
    () => batteries.filter((b) => !isPlaced(b)),
    [batteries]
  );

  const openAssignPicker = (section: StorageSection, slotIndex: number) => {
    if (unassignedBatteries.length === 0) {
      Alert.alert('No batteries', 'Add a battery first.');
      return;
    }
    const label = STORAGE_SECTION_LABELS[section];
    Alert.alert(
      `${label} · slot ${slotIndex + 1}`,
      'Choose battery',
      [
        ...unassignedBatteries.map((b) => ({
          text: b.name,
          onPress: async () => {
            await setBatteryStoragePlacement(b.id, section, slotIndex);
            load();
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const onPressSlot = (
    section: StorageSection,
    slotIndex: number,
    battery: CellBattery | null
  ) => {
    if (battery) {
      router.push(`/battery/${battery.id}`);
    } else {
      openAssignPicker(section, slotIndex);
    }
  };

  const onLongPressSlot = (
    section: StorageSection,
    slotIndex: number,
    battery: CellBattery | null
  ) => {
    if (!battery) {
      openAssignPicker(section, slotIndex);
      return;
    }
    Alert.alert(
      'Remove from grid?',
      `${battery.name} stays in your list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await setBatteryStoragePlacement(battery.id, null, null);
            load();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: BatteryWithLatest }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/battery/${item.id}`)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.75}
    >
      <View style={styles.rowContent}>
        <Text style={styles.name}>{item.name}</Text>
        {item.latest_reading ? (
          <View style={styles.meta}>
            <StatusBadge status={item.latest_reading.status} />
            <Text style={styles.charge}>{Math.round(item.latest_reading.charge_percent)}%</Text>
            <Text style={styles.date}>
              {new Date(item.latest_reading.created_at).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.noReading}>No readings</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const listHeader = (
    <View style={{ paddingTop: insets.top + 10 }}>
      {STORAGE_SECTION_ORDER.map((section) => (
        <BatterySection
          key={section}
          title={STORAGE_SECTION_LABELS[section]}
          section={section}
          layout={STORAGE_LAYOUT[section]}
          slots={slotMaps[section]}
          restMinutesByBatteryId={restMinutesByBatteryId}
          onPressSlot={onPressSlot}
          onLongPressSlot={onLongPressSlot}
        />
      ))}
    </View>
  );

  if (batteries.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.emptyTitle}>No batteries yet</Text>
        <Text style={styles.emptyLine}>Tap Add below.</Text>
        <AddMenuFab />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={batteries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
        refreshing={refreshing}
        onRefresh={load}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponentStyle={styles.gridHeader}
      />
      <AddMenuFab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  gridHeader: { marginBottom: 8 },
  list: { paddingHorizontal: SPACE.screen },
  row: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowContent: { gap: 10 },
  name: { fontSize: FONT.body, fontWeight: '700', color: COLORS.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  charge: { fontSize: FONT.meta, fontWeight: '700', color: COLORS.text },
  date: { fontSize: FONT.meta, fontWeight: '600', color: COLORS.textSecondary },
  noReading: { fontSize: FONT.meta, fontWeight: '600', color: COLORS.textSecondary },
  separator: { height: 12 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACE.screen,
    backgroundColor: COLORS.background,
  },
  emptyTitle: { fontSize: FONT.title, fontWeight: '700', marginBottom: 10, color: COLORS.text },
  emptyLine: {
    fontSize: FONT.body,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
});
