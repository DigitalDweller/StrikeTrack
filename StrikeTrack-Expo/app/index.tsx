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
import { StatusBadge } from '@/components/StatusBadge';
import { BatteryRack, RACK_SLOT_COUNT } from '@/components/BatteryRack';
import {
  getAllBatteries,
  deleteBattery,
  setBatteryRackSlot,
  getAllMatchUsages,
} from '@/lib/batteryDb';
import { COLORS } from '@/lib/constants';
import type { Battery, BatteryReading, MatchUsage } from '@/lib/database';
import { minutesRestRemaining } from '@/lib/restTimer';

type BatteryWithLatest = Battery & {
  latest_reading?: {
    status: string;
    charge_percent: number;
    created_at: string;
  };
};

type CellBattery = Battery & { latest_reading?: BatteryReading };

export default function BatteryListScreen() {
  const router = useRouter();
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

  const slots = useMemo(() => {
    const arr: (CellBattery | null)[] = Array.from({ length: RACK_SLOT_COUNT }, () => null);
    for (const b of batteries) {
      const s = b.rack_slot;
      if (s != null && s >= 0 && s < RACK_SLOT_COUNT) {
        arr[s] = b as CellBattery;
      }
    }
    return arr;
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
    () =>
      batteries.filter(
        (b) => b.rack_slot == null || b.rack_slot < 0 || b.rack_slot >= RACK_SLOT_COUNT
      ),
    [batteries]
  );

  const openAssignPicker = (slotIndex: number) => {
    if (unassignedBatteries.length === 0) {
      Alert.alert(
        'No batteries to assign',
        'Add a battery, or remove one from another rack slot first.'
      );
      return;
    }
    Alert.alert(
      `Assign slot ${slotIndex + 1}`,
      'Choose a battery for this position.',
      [
        ...unassignedBatteries.map((b) => ({
          text: b.name,
          onPress: async () => {
            await setBatteryRackSlot(b.id, slotIndex);
            load();
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const onPressSlot = (slotIndex: number, battery: CellBattery | null) => {
    if (battery) {
      router.push(`/battery/${battery.id}`);
    } else {
      openAssignPicker(slotIndex);
    }
  };

  const onLongPressSlot = (slotIndex: number, battery: CellBattery | null) => {
    if (!battery) {
      openAssignPicker(slotIndex);
      return;
    }
    Alert.alert(
      'Remove from rack?',
      `${battery.name} will stay in your list but leave slot ${slotIndex + 1}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await setBatteryRackSlot(battery.id, null);
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
      activeOpacity={0.7}
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
          <Text style={styles.noReading}>No readings yet</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (batteries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No Batteries</Text>
        <Text style={styles.emptyDesc}>
          Add up to 10 batteries and place them on the 2×5 pit rack. Log before/after match stats
          and get a 30-minute rest reminder before charging.
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-battery')}
        >
          <Text style={styles.addButtonText}>Add Battery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={batteries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <BatteryRack
            slots={slots}
            restMinutesByBatteryId={restMinutesByBatteryId}
            onPressSlot={onPressSlot}
            onLongPressSlot={onLongPressSlot}
          />
        }
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={load}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponentStyle={styles.rackHeader}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/scan')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>📷</Text>
        <Text style={styles.fabLabel}>Scan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  rackHeader: { marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  row: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  rowContent: { gap: 8 },
  name: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  charge: { fontSize: 15, color: COLORS.textSecondary },
  date: { fontSize: 13, color: COLORS.textTertiary },
  noReading: { fontSize: 15, color: COLORS.textSecondary },
  separator: { height: 12 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: { fontSize: 22, fontWeight: '600', marginBottom: 8, color: COLORS.text },
  emptyDesc: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabIcon: { fontSize: 20 },
  fabLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
