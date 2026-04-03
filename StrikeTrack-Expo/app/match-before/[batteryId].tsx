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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { insertMatchUsageBefore, getBatteryById } from '@/lib/batteryDb';
import { COLORS } from '@/lib/constants';
import type { Battery } from '@/lib/database';

export default function MatchBeforeScreen() {
  const { batteryId } = useLocalSearchParams<{ batteryId: string }>();
  const router = useRouter();
  const [battery, setBattery] = useState<Battery | null>(null);
  const [matchLabel, setMatchLabel] = useState('');
  const [chargePercent, setChargePercent] = useState('');
  const [voltageNoLoad, setVoltageNoLoad] = useState('');
  const [internalResistance, setInternalResistance] = useState('');

  useEffect(() => {
    if (!batteryId) return;
    getBatteryById(batteryId).then(setBattery);
  }, [batteryId]);

  const handleSave = async () => {
    if (!batteryId || !matchLabel.trim()) return;
    const charge = chargePercent.trim()
      ? Math.min(130, Math.max(0, parseFloat(chargePercent) || 0))
      : null;
    await insertMatchUsageBefore({
      id: crypto.randomUUID(),
      battery_id: batteryId,
      match_label: matchLabel.trim(),
      before_charge_percent: charge,
      before_voltage_no_load: voltageNoLoad.trim() ? parseFloat(voltageNoLoad) : null,
      before_internal_resistance: internalResistance.trim()
        ? parseFloat(internalResistance)
        : null,
    });
    router.back();
  };

  const canSave = Boolean(batteryId && matchLabel.trim().length > 0);

  if (!battery) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={{ color: COLORS.text }}>Loading...</Text>
      </View>
    );
  }

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
          Before match — {battery.name}. After the match, open this battery and tap “After match”
          on this log to add post-match stats (starts the 30 min rest timer).
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Match</Text>
          <TextInput
            style={styles.input}
            value={matchLabel}
            onChangeText={setMatchLabel}
            placeholder="e.g. QM12, Playoff 3"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Charge % (before)</Text>
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
          <Text style={styles.label}>Voltage no-load V (before)</Text>
          <TextInput
            style={styles.input}
            value={voltageNoLoad}
            onChangeText={setVoltageNoLoad}
            placeholder="e.g. 12.6"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Internal resistance Ω (before)</Text>
          <TextInput
            style={styles.input}
            value={internalResistance}
            onChangeText={setInternalResistance}
            placeholder="e.g. 0.025"
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
            style={[styles.button, styles.saveButton, !canSave && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveButtonText}>Save before match</Text>
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
  buttonDisabled: { opacity: 0.5 },
});
