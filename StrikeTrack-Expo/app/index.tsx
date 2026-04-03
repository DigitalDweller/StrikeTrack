import { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddMenuFab } from '@/components/AddMenuFab';
import { BatterySection } from '@/components/BatterySection';
import {
  getAllBatteries,
  setBatteryStoragePlacement,
} from '@/lib/batteryDb';
import { COLORS, SPACE } from '@/lib/constants';
import type { Battery, BatteryReading } from '@/lib/database';
import {
  STORAGE_LAYOUT,
  STORAGE_SECTION_LABELS,
  STORAGE_SECTION_ORDER,
  type StorageSection,
} from '@/lib/storageLayout';

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
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    const data = await getAllBatteries();
    setBatteries(data as BatteryWithLatest[]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

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

  const assignableBatteries = useMemo(
    () => batteries.filter((b) => !isPlaced(b) || b.storage_section === 'extra'),
    [batteries]
  );

  const openAssignPicker = (section: StorageSection, slotIndex: number) => {
    if (assignableBatteries.length === 0) {
      Alert.alert('No batteries', 'Add a battery first.');
      return;
    }
    const label = STORAGE_SECTION_LABELS[section];
    Alert.alert(
      `${label} · slot ${slotIndex + 1}`,
      'Choose battery',
      [
        ...assignableBatteries.map((b) => ({
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 10, paddingBottom: 120 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      >
      {STORAGE_SECTION_ORDER.map((section) => (
        <BatterySection
          key={section}
          title={STORAGE_SECTION_LABELS[section]}
          section={section}
          layout={STORAGE_LAYOUT[section]}
          slots={slotMaps[section]}
          onPressSlot={onPressSlot}
          onLongPressSlot={onLongPressSlot}
        />
      ))}
      </ScrollView>
      <AddMenuFab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { paddingHorizontal: SPACE.screen },
});
