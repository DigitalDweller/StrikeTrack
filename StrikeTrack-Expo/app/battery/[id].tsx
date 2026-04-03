import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getBatteryById, deleteBattery } from '@/lib/batteryDb';
import { COLORS, FONT, RADIUS, SPACE } from '@/lib/constants';
import type { Battery } from '@/lib/database';
import { normalizeRouteParam } from '@/lib/routeParams';

export default function BatteryDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = normalizeRouteParam(params.id);
  const router = useRouter();
  const [battery, setBattery] = useState<Battery | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    if (!id) {
      setLoaded(true);
      return;
    }
    getBatteryById(id).then((b) => {
      setBattery(b ?? null);
      setLoaded(true);
    });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

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

  if (!loaded) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!battery) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={styles.loadingText}>Battery not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoCard}>
        <Text style={styles.name}>{battery.name}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.value}>{battery.notes?.trim() || '—'}</Text>
        </View>
      </View>

      <View style={styles.actions}>
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
  infoCard: {
    backgroundColor: COLORS.surface,
    margin: SPACE.screen,
    padding: 20,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  name: {
    fontSize: FONT.title,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: FONT.meta,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: FONT.body,
    fontWeight: '700',
    color: COLORS.text,
    flexShrink: 1,
    textAlign: 'right',
  },
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
});
