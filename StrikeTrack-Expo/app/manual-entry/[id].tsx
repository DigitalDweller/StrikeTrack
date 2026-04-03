import { useState } from 'react';
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
import { insertReading } from '@/lib/batteryDb';
import { BATTERY_STATUSES, COLORS, FONT, RADIUS, SPACE, type BatteryStatus } from '@/lib/constants';

export default function ManualEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<BatteryStatus>('Good');
  const [chargePercent, setChargePercent] = useState('100');
  const [voltageNoLoad, setVoltageNoLoad] = useState('');
  const [voltageLoad1, setVoltageLoad1] = useState('');
  const [voltageLoad2, setVoltageLoad2] = useState('');
  const [internalResistance, setInternalResistance] = useState('');

  const handleSave = async () => {
    if (!id) return;
    const charge = Math.min(130, Math.max(0, parseFloat(chargePercent) || 0));
    await insertReading({
      id: crypto.randomUUID(),
      battery_id: id,
      status,
      charge_percent: charge,
      voltage_no_load: voltageNoLoad ? parseFloat(voltageNoLoad) : null,
      voltage_load1: voltageLoad1 ? parseFloat(voltageLoad1) : null,
      voltage_load2: voltageLoad2 ? parseFloat(voltageLoad2) : null,
      current_load2: null,
      internal_resistance: internalResistance
        ? parseFloat(internalResistance)
        : null,
      raw_ocr_text: null,
      source: 'Manual',
    });
    router.back();
  };

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
        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            {BATTERY_STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pill, status === s && styles.pillActive]}
                onPress={() => setStatus(s)}
              >
                <Text
                  style={[styles.pillText, status === s && styles.pillTextActive]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
          <Text style={styles.label}>V0</Text>
          <TextInput
            style={styles.input}
            value={voltageNoLoad}
            onChangeText={setVoltageNoLoad}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>V1</Text>
          <TextInput
            style={styles.input}
            value={voltageLoad1}
            onChangeText={setVoltageLoad1}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>V2</Text>
          <TextInput
            style={styles.input}
            value={voltageLoad2}
            onChangeText={setVoltageLoad2}
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
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: FONT.meta, fontWeight: '700', color: COLORS.text },
  pillTextActive: { color: '#fff' },
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
});
