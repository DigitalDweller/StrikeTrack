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
import { COLORS, FONT, RADIUS, SPACE } from '@/lib/constants';
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
        <Text style={styles.loadingText}>Loading…</Text>
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
            <Text style={styles.ohms}>
              {latest.internal_resistance.toFixed(3)} Ω
            </Text>
          )}
          <Text style={styles.date}>
            {new Date(latest.created_at).toLocaleDateString()}
          </Text>
          {restMin != null && (
            <Text style={styles.restBanner}>
              Rest ~{restMin} min before charging
            </Text>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Match log</Text>
      <View style={styles.matchActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/match-before/${id}`)}
        >
          <Text style={styles.actionBtnText}>Before match</Text>
        </TouchableOpacity>
      </View>
      {matchUsages.length === 0 ? (
        <Text style={styles.mutedBlock}>No matches logged</Text>
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
                  <Text style={styles.afterLinkText}>After match →</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>History</Text>
      {readings.length === 0 ? (
        <Text style={styles.mutedBlock}>No readings</Text>
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
          <Text style={styles.actionBtnText}>Scan Beak</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/manual-entry/${id}`)}
        >
          <Text style={styles.actionBtnText}>New reading</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => router.push(`/edit-battery/${id}`)}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={handleDelete}
        >
          <Text style={styles.deleteBtnText}>Delete battery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: FONT.body, fontWeight: '600', color: COLORS.text },
  latestCard: {
    backgroundColor: COLORS.surface,
    margin: SPACE.screen,
    padding: 20,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  latestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  charge: { fontSize: 36, fontWeight: '800', color: COLORS.text, letterSpacing: -1 },
  ohms: { fontSize: FONT.body, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  date: { fontSize: FONT.meta, fontWeight: '600', color: COLORS.textSecondary },
  sectionTitle: {
    fontSize: FONT.section,
    fontWeight: '800',
    color: COLORS.text,
    marginHorizontal: SPACE.screen,
    marginTop: 8,
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  mutedBlock: {
    fontSize: FONT.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingHorizontal: SPACE.screen,
    paddingBottom: 12,
  },
  listContent: { paddingHorizontal: SPACE.screen, paddingBottom: 16 },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: RADIUS.md,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  readingCharge: { fontSize: FONT.body, fontWeight: '800', color: COLORS.text },
  readingDate: { marginLeft: 'auto', color: COLORS.textSecondary, fontSize: FONT.meta, fontWeight: '600' },
  separator: { height: 10 },
  actions: { padding: SPACE.screen, gap: 12, paddingBottom: 28 },
  actionBtn: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: FONT.button, fontWeight: '700' },
  editBtn: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  editBtnText: { color: COLORS.text, fontSize: FONT.button, fontWeight: '700' },
  deleteBtn: { backgroundColor: 'transparent', borderWidth: 2, borderColor: COLORS.destructive },
  deleteBtnText: { color: COLORS.destructive, fontSize: FONT.button, fontWeight: '700' },
  restBanner: {
    marginTop: 14,
    fontSize: FONT.meta,
    fontWeight: '700',
    color: COLORS.warning,
  },
  matchActions: { paddingHorizontal: SPACE.screen, marginBottom: 10 },
  matchList: { paddingHorizontal: SPACE.screen, gap: 12, marginBottom: 8 },
  matchRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  matchLabel: { fontSize: FONT.body, fontWeight: '800', color: COLORS.text },
  matchStats: { fontSize: FONT.meta, fontWeight: '600', color: COLORS.text },
  afterLink: { alignSelf: 'flex-start', marginTop: 4 },
  afterLinkText: { fontSize: FONT.body, fontWeight: '700', color: COLORS.primary },
});
