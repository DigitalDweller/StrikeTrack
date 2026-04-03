import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Pressable,
  TextInput,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  BackHandler,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatterySection } from '@/components/BatterySection';
import { BatteryDetailPanel } from '@/components/BatteryDetailPanel';
import {
  getAllBatteries,
  getAllMatchUsages,
  insertBattery,
  setBatteryStoragePlacement,
} from '@/lib/batteryDb';
import { FONT, SPACE } from '@/lib/constants';
import type { Battery, BatteryReading } from '@/lib/database';
import { minutesRestRemaining } from '@/lib/restTimer';
import {
  STORAGE_LAYOUT,
  STORAGE_SECTION_LABELS,
  type StorageSection,
} from '@/lib/storageLayout';
import { normalizeRouteParam } from '@/lib/routeParams';

type BatteryWithLatest = Battery & {
  latest_reading?: {
    status: string;
    charge_percent: number;
    created_at: string;
  };
};

type CellBattery = Battery & { latest_reading?: BatteryReading };
type DashboardTab = 'match' | 'charging' | 'add' | 'cooling' | 'stats';
const TABS: DashboardTab[] = ['match', 'charging', 'add', 'cooling', 'stats'];
const SWIPE_TABS: DashboardTab[] = ['match', 'charging', 'cooling'];

const TAB_ACTIVE_COLORS: Record<DashboardTab, string> = {
  match: '#fb7185',
  charging: '#34d399',
  add: '#818cf8',
  cooling: '#fbbf24',
  stats: '#60a5fa',
};

/** Fixed inset for sheet/backdrop so height does not change when nav switches (tabs ↔ X). */
const NAV_BAR_ROW_MIN = 52;

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

function firstOpenSlotIndex(slotCount: number, usedSlots: Set<number>): number | null {
  for (let i = 0; i < slotCount; i += 1) {
    if (!usedSlots.has(i)) return i;
  }
  return null;
}

/** Reassign charging slots 0..n-1 so highest charge % is leftmost (slot 0). */
async function reorderChargingByHighestChargePercent(
  batteries: BatteryWithLatest[]
): Promise<boolean> {
  const charging = batteries.filter(
    (b) =>
      b.storage_section === 'charging' &&
      b.storage_slot != null &&
      b.storage_slot >= 0
  );
  if (charging.length <= 1) return false;

  const chargeOf = (b: BatteryWithLatest) => {
    const p = b.latest_reading?.charge_percent;
    return typeof p === 'number' && !Number.isNaN(p) ? p : -1;
  };

  const sorted = [...charging].sort((a, b) => chargeOf(b) - chargeOf(a));
  const bySlot = [...charging].sort(
    (a, b) => (a.storage_slot ?? 0) - (b.storage_slot ?? 0)
  );
  const orderChanged = sorted.some((b, i) => b.id !== bySlot[i]?.id);
  if (!orderChanged) return false;

  for (const b of charging) {
    await setBatteryStoragePlacement(b.id, null, null);
  }
  for (let i = 0; i < sorted.length; i += 1) {
    await setBatteryStoragePlacement(sorted[i].id, 'charging', i);
  }
  return true;
}

export default function BatteryListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string | string[]; battery?: string | string[] }>();
  const routeBatteryId = normalizeRouteParam(params.battery);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 14);
  const { width, height: windowHeight } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const previousTabRef = useRef<DashboardTab>('match');
  const swipeIndexRef = useRef(0);
  const pendingRouteTabRef = useRef<DashboardTab | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('match');
  const [batteries, setBatteries] = useState<BatteryWithLatest[]>([]);
  const [cooldownMinutesByBatteryId, setCooldownMinutesByBatteryId] = useState<Record<string, number>>({});
  const [newBatteryName, setNewBatteryName] = useState('');
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetBatteryId, setSheetBatteryId] = useState<string | null>(routeBatteryId);
  const bottomChrome = NAV_BAR_ROW_MIN + Math.max(insets.bottom, 8);
  const panelHeight = Math.max(0, windowHeight - bottomChrome);
  const sheetSlideY = useRef(new Animated.Value(panelHeight)).current;
  const prevSheetIdRef = useRef<string | null>(null);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    if (routeBatteryId) {
      setSheetBatteryId(routeBatteryId);
    } else {
      setSheetBatteryId(null);
    }
  }, [routeBatteryId]);

  const load = useCallback(async (opts?: { showRefreshing?: boolean }) => {
    const showRefreshing = opts?.showRefreshing === true;
    const gen = ++loadGenerationRef.current;
    if (showRefreshing) setRefreshing(true);
    try {
      const [data, usages] = await Promise.all([getAllBatteries(), getAllMatchUsages()]);
      if (gen !== loadGenerationRef.current) return;
      let list = data as BatteryWithLatest[];
      const reordered = await reorderChargingByHighestChargePercent(list);
      if (gen !== loadGenerationRef.current) return;
      if (reordered) {
        list = (await getAllBatteries()) as BatteryWithLatest[];
      }
      if (gen !== loadGenerationRef.current) return;
      const nextCooldowns: Record<string, number> = {};
      for (const b of list) {
        const mins = minutesRestRemaining(usages, b.id);
        if (mins != null) nextCooldowns[b.id] = mins;
      }
      setCooldownMinutesByBatteryId(nextCooldowns);
      setBatteries(list);
    } finally {
      if (showRefreshing && gen === loadGenerationRef.current) {
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const closeBatterySheet = useCallback(() => {
    if (!routeBatteryId) return;
    Animated.timing(sheetSlideY, {
      toValue: panelHeight,
      duration: 280,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      router.replace({
        pathname: '/',
        params: { tab: activeTab },
      });
    });
  }, [routeBatteryId, panelHeight, sheetSlideY, router, activeTab]);

  useEffect(() => {
    if (!routeBatteryId) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeBatterySheet();
      return true;
    });
    return () => sub.remove();
  }, [routeBatteryId, closeBatterySheet]);

  useEffect(() => {
    if (!sheetBatteryId) {
      sheetSlideY.setValue(panelHeight);
    }
  }, [panelHeight, sheetBatteryId, sheetSlideY]);

  useLayoutEffect(() => {
    if (!sheetBatteryId) {
      prevSheetIdRef.current = null;
      return;
    }
    if (prevSheetIdRef.current !== sheetBatteryId) {
      sheetSlideY.setValue(panelHeight);
      prevSheetIdRef.current = sheetBatteryId;
      requestAnimationFrame(() => {
        Animated.spring(sheetSlideY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 68,
          friction: 11,
        }).start();
      });
    }
  }, [sheetBatteryId, panelHeight, sheetSlideY]);

  const openBatterySheet = useCallback(
    (batteryId: string) => {
      router.replace({
        pathname: '/',
        params: { tab: activeTab, battery: batteryId },
      });
    },
    [router, activeTab]
  );

  const slotMaps = useMemo(() => {
    const list = batteries as CellBattery[];
    const out: Record<StorageSection, (CellBattery | null)[]> = {} as Record<
      StorageSection,
      (CellBattery | null)[]
    >;
    const sections: StorageSection[] = ['on_field', 'charging', 'not_charging', 'extra'];
    for (const section of sections) {
      const { slotCount } = STORAGE_LAYOUT[section];
      out[section] = buildSlots(list, section, slotCount);
    }
    return out;
  }, [batteries]);

  const assignableBatteries = useMemo(
    () => batteries.filter((b) => !isPlaced(b) || b.storage_section === 'extra'),
    [batteries]
  );
  const unassignedBatteries = useMemo(
    () => batteries.filter((b) => b.storage_section === 'extra' || !isPlaced(b)),
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
      openBatterySheet(battery.id);
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

  const tabIndex = useMemo(() => SWIPE_TABS.indexOf(activeTab), [activeTab]);

  const addBatteryFromTab = async () => {
    const trimmed = newBatteryName.trim();
    if (!trimmed || adding) return;
    try {
      setAdding(true);
      const id = crypto.randomUUID();
      const usedUnassignedSlots = new Set(
        batteries
          .filter((b) => b.storage_section === 'extra' && b.storage_slot != null && b.storage_slot >= 0)
          .map((b) => b.storage_slot as number)
      );
      const unassignedSlot = firstOpenSlotIndex(STORAGE_LAYOUT.extra.slotCount, usedUnassignedSlots);
      await insertBattery({
        id,
        name: trimmed,
        chemistry: 'Lead Acid',
        voltage: 12,
        amphour: 17,
        notes: null,
        rack_slot: null,
        storage_section: unassignedSlot == null ? null : 'extra',
        storage_slot: unassignedSlot,
      });
      setNewBatteryName('');
      await load();
    } catch {
      Alert.alert('Could not add battery', 'Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const renderTabPage = (tab: DashboardTab) => {
    if (tab === 'add') {
      return (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingTop: topInset + 10, paddingBottom: 148 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>Add Battery</Text>
          <Text style={styles.panelLabel}>Battery Name</Text>
          <TextInput
            value={newBatteryName}
            onChangeText={setNewBatteryName}
            placeholder="Battery 12"
            placeholderTextColor="#52525b"
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={addBatteryFromTab}
          />
          <Pressable
            onPress={addBatteryFromTab}
            disabled={!newBatteryName.trim() || adding}
            style={({ hovered, pressed }) => [
              styles.addButton,
              hovered || pressed ? styles.addButtonHover : null,
              !newBatteryName.trim() || adding ? styles.addButtonDisabled : null,
            ]}
          >
            <Text style={styles.addButtonText}>{adding ? 'Adding...' : 'Add Battery'}</Text>
          </Pressable>

          <View style={styles.unassignedWrap}>
            <Text style={styles.unassignedTitle}>Unassigned Batteries</Text>
            {unassignedBatteries.length === 0 ? (
              <Text style={styles.unassignedEmpty}>No unassigned batteries.</Text>
            ) : (
              unassignedBatteries.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => openBatterySheet(b.id)}
                  style={styles.unassignedRow}
                >
                  <Text style={styles.unassignedName} numberOfLines={1}>
                    {b.name}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
          </View>
        </ScrollView>
      );
    }

    if (tab === 'stats') {
      return (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingTop: topInset + 10, paddingBottom: 148 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Stats</Text>
            <Text style={styles.comingSoonText}>Coming soon</Text>
          </View>
        </ScrollView>
      );
    }

    const section: StorageSection = tab === 'match' ? 'on_field' : tab === 'charging' ? 'charging' : 'not_charging';
    const sectionTitle =
      tab === 'match'
        ? 'Match'
        : tab === 'cooling'
          ? 'Cooling'
          : STORAGE_SECTION_LABELS[section];
    return (
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingTop: topInset + 10, paddingBottom: 148 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load({ showRefreshing: true })} />
        }
        showsVerticalScrollIndicator={false}
      >
        <BatterySection
          title={sectionTitle}
          section={section}
          layout={STORAGE_LAYOUT[section]}
          slots={slotMaps[section]}
          cooldownMinutesByBatteryId={cooldownMinutesByBatteryId}
          onPressSlot={onPressSlot}
          onLongPressSlot={onLongPressSlot}
        />
      </ScrollView>
    );
  };

  const goToTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    if (routeBatteryId) {
      router.replace({ pathname: '/', params: { tab } });
    }
    if (tab === 'add' || tab === 'stats') return;
    const idx = SWIPE_TABS.indexOf(tab);
    if (idx < 0) return;
    swipeIndexRef.current = idx;
    pagerRef.current?.scrollTo({ x: idx * width, animated: true });
  };

  useEffect(() => {
    const raw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    if (!raw) return;
    const normalized = String(raw).toLowerCase();
    const nextTab: DashboardTab =
      normalized === 'match' ||
      normalized === 'charging' ||
      normalized === 'add' ||
      normalized === 'cooling' ||
      normalized === 'stats'
        ? (normalized as DashboardTab)
        : 'match';
    pendingRouteTabRef.current = nextTab;
  }, [params.tab]);

  useEffect(() => {
    const target = pendingRouteTabRef.current;
    if (!target) return;
    if (target !== activeTab) {
      setActiveTab(target);
    }
    if (target !== 'add' && target !== 'stats') {
      const idx = SWIPE_TABS.indexOf(target);
      if (idx >= 0) {
        swipeIndexRef.current = idx;
        requestAnimationFrame(() => {
          pagerRef.current?.scrollTo({ x: idx * width, animated: false });
        });
      }
    }
    if (target === activeTab) {
      pendingRouteTabRef.current = null;
    }
  }, [activeTab, width]);

  const onPagerEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const rawIdx = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    const max = SWIPE_TABS.length - 1;
    const clampedRaw = Math.max(0, Math.min(max, rawIdx));
    const prev = swipeIndexRef.current;
    const target = Math.max(0, Math.min(max, Math.max(prev - 1, Math.min(prev + 1, clampedRaw))));
    swipeIndexRef.current = target;
    if (target !== clampedRaw) {
      pagerRef.current?.scrollTo({ x: target * width, animated: true });
    }
    const nextTab = SWIPE_TABS[target];
    if (nextTab && nextTab !== activeTab) {
      if (routeBatteryId) {
        router.replace({ pathname: '/', params: { tab: nextTab } });
      }
      setActiveTab(nextTab);
    }
  };

  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    const nextTab = SWIPE_TABS[Math.max(0, Math.min(SWIPE_TABS.length - 1, idx))];
    if (nextTab && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  };

  useEffect(() => {
    const prev = previousTabRef.current;
    const enteringSwipePager =
      (prev === 'add' || prev === 'stats') &&
      activeTab !== 'add' &&
      activeTab !== 'stats';

    if (enteringSwipePager) {
      const idx = SWIPE_TABS.indexOf(activeTab);
      if (idx >= 0) {
        swipeIndexRef.current = idx;
        requestAnimationFrame(() => {
          pagerRef.current?.scrollTo({ x: idx * width, animated: false });
        });
      }
    }

    previousTabRef.current = activeTab;
  }, [activeTab, width]);

  useEffect(() => {
    if (activeTab === 'add' || activeTab === 'stats') return;
    const idx = SWIPE_TABS.indexOf(activeTab);
    if (idx >= 0) {
      swipeIndexRef.current = idx;
      pagerRef.current?.scrollTo({ x: idx * width, animated: false });
    }
  }, [width]);

  return (
    <View style={styles.container}>
      {activeTab === 'add' || activeTab === 'stats' ? (
        <View style={styles.pager}>
          {renderTabPage(activeTab)}
        </View>
      ) : (
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          disableIntervalMomentum
          snapToInterval={width}
          snapToAlignment="start"
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onPagerScroll}
          onMomentumScrollEnd={onPagerEnd}
          style={styles.pager}
        >
          {SWIPE_TABS.map((tab) => (
            <View key={tab} style={{ width, flex: 1 }}>
              {renderTabPage(tab)}
            </View>
          ))}
        </ScrollView>
      )}

      {sheetBatteryId ? (
        <>
          <Pressable
            style={[styles.sheetBackdrop, { bottom: bottomChrome }]}
            onPress={closeBatterySheet}
          />
          <Animated.View
            style={[
              styles.sheetPanel,
              {
                bottom: bottomChrome,
                transform: [{ translateY: sheetSlideY }],
              },
            ]}
          >
            <BatteryDetailPanel key={sheetBatteryId} batteryId={sheetBatteryId} />
          </Animated.View>
        </>
      ) : null}

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {sheetBatteryId ? (
          <View style={styles.bottomNavRowCentered}>
            <Pressable
              onPress={closeBatterySheet}
              style={({ pressed }) => [
                styles.navCloseCenter,
                pressed ? styles.navCloseSlotPressed : null,
              ]}
              accessibilityLabel="Close battery details"
            >
              <Feather name="x" size={26} color="#ffffff" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.bottomNavRow}>
            <View style={styles.navTabsCluster}>
              <Pressable style={styles.navItem} onPress={() => goToTab('match')}>
                <Feather name="play" size={18} color={TAB_ACTIVE_COLORS.match} />
                <Text style={[styles.navLabel, { color: TAB_ACTIVE_COLORS.match }]}>Match</Text>
                <View
                  style={[
                    styles.navUnderline,
                    { backgroundColor: TAB_ACTIVE_COLORS.match, opacity: activeTab === 'match' ? 1 : 0 },
                  ]}
                />
              </Pressable>

              <Pressable style={styles.navItem} onPress={() => goToTab('charging')}>
                <Feather name="zap" size={18} color={TAB_ACTIVE_COLORS.charging} />
                <Text style={[styles.navLabel, { color: TAB_ACTIVE_COLORS.charging }]}>Charging</Text>
                <View
                  style={[
                    styles.navUnderline,
                    {
                      backgroundColor: TAB_ACTIVE_COLORS.charging,
                      opacity: activeTab === 'charging' ? 1 : 0,
                    },
                  ]}
                />
              </Pressable>

              <Pressable style={styles.navItem} onPress={() => goToTab('add')}>
                <Feather name="plus-circle" size={22} color={TAB_ACTIVE_COLORS.add} />
                <Text style={[styles.navLabel, { color: TAB_ACTIVE_COLORS.add }]}>Add</Text>
                <View
                  style={[
                    styles.navUnderline,
                    { backgroundColor: TAB_ACTIVE_COLORS.add, opacity: activeTab === 'add' ? 1 : 0 },
                  ]}
                />
              </Pressable>

              <Pressable style={styles.navItem} onPress={() => goToTab('cooling')}>
                <Feather name="wind" size={18} color={TAB_ACTIVE_COLORS.cooling} />
                <Text style={[styles.navLabel, { color: TAB_ACTIVE_COLORS.cooling }]}>Cooling</Text>
                <View
                  style={[
                    styles.navUnderline,
                    {
                      backgroundColor: TAB_ACTIVE_COLORS.cooling,
                      opacity: activeTab === 'cooling' ? 1 : 0,
                    },
                  ]}
                />
              </Pressable>

              <Pressable style={styles.navItem} onPress={() => goToTab('stats')}>
                <Feather name="bar-chart-2" size={18} color={TAB_ACTIVE_COLORS.stats} />
                <Text style={[styles.navLabel, { color: TAB_ACTIVE_COLORS.stats }]}>Stats</Text>
                <View
                  style={[
                    styles.navUnderline,
                    { backgroundColor: TAB_ACTIVE_COLORS.stats, opacity: activeTab === 'stats' ? 1 : 0 },
                  ]}
                />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  pager: { flex: 1 },
  list: { paddingHorizontal: SPACE.screen },
  panelCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    gap: 10,
  },
  panelTitle: {
    fontSize: FONT.section,
    fontWeight: '800',
    color: '#f4f4f5',
    marginBottom: 2,
  },
  panelLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f4f4f5',
    fontSize: 14,
  },
  addButton: {
    marginTop: 4,
    width: '100%',
    backgroundColor: '#4f46e5',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonHover: {
    backgroundColor: '#6366f1',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  unassignedWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingTop: 10,
    gap: 8,
  },
  unassignedTitle: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unassignedEmpty: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '500',
  },
  unassignedRow: {
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#111113',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  unassignedName: {
    color: '#d4d4d8',
    fontSize: 14,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statKey: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '500',
  },
  statVal: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '700',
  },
  comingSoonText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 6,
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 41,
    backgroundColor: '#09090b',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(24, 24, 27, 0.92)',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingHorizontal: 4,
  },
  bottomNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  bottomNavRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  navCloseCenter: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  navCloseSlotPressed: {
    backgroundColor: 'rgba(63, 63, 70, 0.5)',
  },
  navTabsCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    zIndex: 1,
  },
  navLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '500',
  },
  navUnderline: {
    marginTop: 2,
    width: 16,
    height: 2,
    borderRadius: 999,
  },
});
