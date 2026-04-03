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
import { COLORS } from '@/lib/constants';
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
        'Enable notifications in system settings to get the 30-minute “plug in” reminder.'
      );
    }

    router.back();
  };

  if (!usage) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={{ color: COLORS.text }}>Loading...</Text>
      </View>
    );
  }

  if (usage.after_recorded_at) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background, padding: 24 }]}>
        <Text style={{ color: COLORS.textSecondary, textAlign: 'center' }}>
          After-match stats are already saved for this match.
        </Text>
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
      >
        <Text style={styles.hint}>
          After match — {usage.match_label} ({batteryName}). Saving schedules a reminder in 30 minutes
          to plug the battery back in.
        </Text>

        <View style={styles.beforeCard}>
          <Text style={styles.beforeTitle}>Before (saved)</Text>
          <Text style={styles.beforeLine}>
            % {fmt(usage.before_charge_percent)} · V {fmt(usage.before_voltage_no_load)} · Ω{' '}
            {fmt(usage.before_internal_resistance)}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Charge % (after)</Text>
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
          <Text style={styles.label}>Voltage no-load V (after)</Text>
          <TextInput
            style={styles.input}
            value={voltageNoLoad}
            onChangeText={setVoltageNoLoad}
            placeholder="e.g. 12.4"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Internal resistance Ω (after)</Text>
          <TextInput
            style={styles.input}
            value={internalResistance}
            onChangeText={setInternalResistance}
            placeholder="e.g. 0.028"
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
            <Text style={styles.saveButtonText}>Save after match</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: {
    margin: 16,
    marginBottom: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  beforeCard: {
    marginHorizontal: 16,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  beforeTitle: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  beforeLine: { fontSize: 16, color: COLORS.text },
  field: { padding: 16, paddingBottom: 0 },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 16,
    fontSize: 17,
    color: COLORS.text,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: COLORS.surfaceAlt },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  saveButton: { backgroundColor: COLORS.primary },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  backBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backBtnText: { color: '#fff', fontWeight: '600' },
});
