import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBadge } from '@/components/StatusBadge';
import {
  getBatteryById,
  getReadingsByBatteryId,
  deleteBattery,
  getMatchUsagesByBatteryId,
} from '@/lib/batteryDb';
import { COLORS } from '@/lib/constants';
import type { Battery, BatteryReading, MatchUsage } from '@/lib/database';
import { minutesRestRemaining } from '@/lib/restTimer';

export default function BatteryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [battery, setBattery] = useState<Battery | null>(null);
  const [readings, setReadings] = useState<BatteryReading[]>([]);
  const [matchUsages, setMatchUsages] = useState<MatchUsage[]>([]);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    if (!id) return;
    Promise.all([
      getBatteryById(id),
      getReadingsByBatteryId(id),
      getMatchUsagesByBatteryId(id),
    ]).then(([b, r, m]) => {
      setBattery(b ?? null);
      setReadings(r ?? []);
      setMatchUsages(m ?? []);
    });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const handleDelete = () => {
    if (!battery) return;
    Alert.alert(
      'Delete Battery',
      `Remove "${battery.name}"? All readings will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBattery(battery.id);
            router.replace('/');
          },
        },
      ]
    );
  };

  if (!battery) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={{ color: COLORS.text }}>Loading...</Text>
      </View>
    );
  }

  const latest = readings[0];
  void tick;
  const restMin = id ? minutesRestRemaining(matchUsages, id) : null;

  const fmtPct = (n: number | null | undefined) =>
    n == null ? '—' : `${Math.round(n)}`;
  const fmtOhm = (n: number | null | undefined) =>
    n == null ? '—' : n.toFixed(3);
  const fmtV = (n: number | null | undefined) =>
    n == null ? '—' : n.toFixed(2);

  return (
    <View style={styles.container}>
      {latest && (
        <View style={styles.latestCard}>
          <View style={styles.latestHeader}>
            <StatusBadge status={latest.status} />
            <Text style={styles.charge}>{Math.round(latest.charge_percent)}%</Text>
          </View>
          {latest.internal_resistance != null && (
            <Text style={styles.rint}>
              Rint: {latest.internal_resistance.toFixed(3)} Ω
            </Text>
          )}
          <Text style={styles.date}>
            {new Date(latest.created_at).toLocaleDateString()}
          </Text>
          {restMin != null && (
            <Text style={styles.restBanner}>
              Post-match rest: ~{restMin} min left before charging
            </Text>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>FRC match log</Text>
      <View style={styles.matchActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/match-before/${id}`)}
        >
          <Text style={styles.actionBtnText}>＋ Before match</Text>
        </TouchableOpacity>
      </View>
      {matchUsages.length === 0 ? (
        <Text style={styles.noReadings}>No matches logged yet</Text>
      ) : (
        <View style={styles.matchList}>
          {matchUsages.map((u) => (
            <View key={u.id} style={styles.matchRow}>
              <Text style={styles.matchLabel}>{u.match_label}</Text>
              <Text style={styles.matchStats}>
                Before: {fmtPct(u.before_charge_percent)}% · {fmtV(u.before_voltage_no_load)} V ·{' '}
                {fmtOhm(u.before_internal_resistance)} Ω
              </Text>
              {u.after_recorded_at ? (
                <Text style={styles.matchStats}>
                  After: {fmtPct(u.after_charge_percent)}% · {fmtV(u.after_voltage_no_load)} V ·{' '}
                  {fmtOhm(u.after_internal_resistance)} Ω
                </Text>
              ) : (
                <TouchableOpacity
                  style={styles.afterLink}
                  onPress={() => router.push(`/match-after/${u.id}`)}
                >
                  <Text style={styles.afterLinkText}>Enter after-match stats →</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Reading History</Text>
      {readings.length === 0 ? (
        <Text style={styles.noReadings}>No readings yet</Text>
      ) : (
        <FlatList
          data={readings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.readingRow}>
              <StatusBadge status={item.status} />
              <Text style={styles.readingCharge}>
                {Math.round(item.charge_percent)}%
              </Text>
              <Text style={styles.readingDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          scrollEnabled={readings.length > 5}
        />
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/scan?batteryId=${id}`)}
        >
          <Text style={styles.actionBtnText}>📷 Scan Battery Beak</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/manual-entry/${id}`)}
        >
          <Text style={styles.actionBtnText}>✏️ Quick reading (Beak)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => router.push(`/edit-battery/${id}`)}
        >
          <Text style={styles.actionBtnText}>Edit Battery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={handleDelete}
        >
          <Text style={styles.deleteBtnText}>Delete Battery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  latestCard: {
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  latestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  charge: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  rint: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 4 },
  date: { fontSize: 13, color: COLORS.textTertiary },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  noReadings: { color: COLORS.textSecondary, padding: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  readingCharge: { fontWeight: '600', color: COLORS.text },
  readingDate: { marginLeft: 'auto', color: COLORS.textSecondary, fontSize: 14 },
  separator: { height: 8 },
  actions: { padding: 16, gap: 12 },
  actionBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  editBtn: { backgroundColor: COLORS.surfaceAlt },
  deleteBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.destructive },
  deleteBtnText: { color: COLORS.destructive, fontSize: 17, fontWeight: '600' },
  restBanner: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffcc00',
  },
  matchActions: { paddingHorizontal: 16, marginBottom: 8 },
  matchList: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  matchRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  matchLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  matchStats: { fontSize: 14, color: COLORS.textSecondary },
  afterLink: { alignSelf: 'flex-start', marginTop: 4 },
  afterLinkText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
});
