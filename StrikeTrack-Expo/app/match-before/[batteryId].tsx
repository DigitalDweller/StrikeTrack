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
import { COLORS, FONT, RADIUS, SPACE } from '@/lib/constants';
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
        <Text style={styles.loadingText}>Loading…</Text>
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
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.batteryName}>{battery.name}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Match</Text>
          <TextInput
            style={styles.input}
            value={matchLabel}
            onChangeText={setMatchLabel}
            placeholder="QM12"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="characters"
          />
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
            placeholder="0.025"
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
  batteryName: {
    fontSize: FONT.title,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: SPACE.block,
    letterSpacing: -0.5,
  },
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
  buttonDisabled: { opacity: 0.45 },
});
