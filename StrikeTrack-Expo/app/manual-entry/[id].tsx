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
import { BATTERY_STATUSES, COLORS, type BatteryStatus } from '@/lib/constants';

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
            placeholder="0-130"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>V0 (no load)</Text>
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
          <Text style={styles.label}>Internal Resistance (Ohms)</Text>
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
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { fontSize: 15, color: COLORS.text },
  pillTextActive: { color: '#fff', fontWeight: '600' },
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
  cancelButtonText: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  saveButton: { backgroundColor: COLORS.primary },
  saveButtonText: { fontSize: 17, fontWeight: '600', color: '#fff' },
});
