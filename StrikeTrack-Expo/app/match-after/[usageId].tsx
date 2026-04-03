import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getMatchUsageById,
  getBatteryById,
  completeMatchUsageAfter,
} from '@/lib/batteryDb';
import { schedulePlugInReminder, requestNotificationPermission } from '@/lib/chargeReminder';
import { COLORS, FONT, RADIUS, SPACE } from '@/lib/constants';
import type { MatchUsage } from '@/lib/database';

export default function MatchAfterScreen() {
  const { usageId } = useLocalSearchParams<{ usageId: string }>();
  const router = useRouter();
  const [usage, setUsage] = useState<MatchUsage | null>(null);
  const [batteryName, setBatteryName] = useState('');
  const [chargePercent, setChargePercent] = useState('');
  const [voltageNoLoad, setVoltageNoLoad] = useState('');
  const [internalResistance, setInternalResistance] = useState('');

  useEffect(() => {
    if (!usageId) return;
    (async () => {
      const u = await getMatchUsageById(usageId);
      setUsage(u);
      if (u) {
        const b = await getBatteryById(u.battery_id);
        setBatteryName(b?.name ?? '');
      }
    })();
  }, [usageId]);

  const handleSave = async () => {
    if (!usageId || !usage || usage.after_recorded_at) return;
    const charge = Math.min(130, Math.max(0, parseFloat(chargePercent) || 0));

    await completeMatchUsageAfter(usageId, {
      after_charge_percent: charge,
      after_voltage_no_load: voltageNoLoad.trim() ? parseFloat(voltageNoLoad) : null,
      after_internal_resistance: internalResistance.trim()
        ? parseFloat(internalResistance)
        : null,
    });

    const allowed = await requestNotificationPermission();
    if (allowed) {
      await schedulePlugInReminder(batteryName || 'Battery');
    } else if (Platform.OS !== 'web') {
      Alert.alert(
        'Notifications off',
        'Turn on notifications for the plug-in reminder.'
      );
    }

    router.back();
  };

  if (!usage) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (usage.after_recorded_at) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background, padding: SPACE.screen }]}>
        <Text style={styles.doneText}>Already saved.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fmt = (n: number | null | undefined) =>
    n == null ? '—' : typeof n === 'number' && !Number.isInteger(n) ? n.toFixed(3) : String(n);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.headline}>
          {usage.match_label}
          {batteryName ? ` · ${batteryName}` : ''}
        </Text>

        <View style={styles.beforeCard}>
          <Text style={styles.beforeTitle}>Before</Text>
          <Text style={styles.beforeLine}>
            {fmt(usage.before_charge_percent)}% · {fmt(usage.before_voltage_no_load)} V ·{' '}
            {fmt(usage.before_internal_resistance)} Ω
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Charge %</Text>
          <TextInput
            style={styles.input}
            value={chargePercent}
            onChangeText={setChargePercent}
            placeholder="0–130"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Voltage</Text>
          <TextInput
            style={styles.input}
            value={voltageNoLoad}
            onChangeText={setVoltageNoLoad}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ohms</Text>
          <TextInput
            style={styles.input}
            value={internalResistance}
            onChangeText={setInternalResistance}
            placeholder="0.028"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: SPACE.screen, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: FONT.body, fontWeight: '600', color: COLORS.text },
  doneText: {
    fontSize: FONT.section,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: FONT.title,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: SPACE.block,
    letterSpacing: -0.5,
  },
  beforeCard: {
    padding: 18,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACE.block,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  beforeTitle: {
    fontSize: FONT.label,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  beforeLine: { fontSize: FONT.body, fontWeight: '600', color: COLORS.text },
  field: { marginBottom: SPACE.block },
  label: {
    fontSize: FONT.label,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
    fontSize: FONT.input,
    fontWeight: '500',
    color: COLORS.text,
    minHeight: 58,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 18,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { fontSize: FONT.button, fontWeight: '700', color: COLORS.text },
  saveButton: { backgroundColor: COLORS.primary },
  saveButtonText: { fontSize: FONT.button, fontWeight: '700', color: '#fff' },
  backBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.button },
});
