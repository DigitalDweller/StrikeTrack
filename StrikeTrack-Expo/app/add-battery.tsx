import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { insertBattery } from '@/lib/batteryDb';
import {
  CHEMISTRIES,
  VOLTAGES,
  AMP_HOURS,
  COLORS,
  type Chemistry,
} from '@/lib/constants';

export default function AddBatteryScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [chemistry, setChemistry] = useState<Chemistry>('Lead Acid');
  const [voltage, setVoltage] = useState(12);
  const [amphour, setAmphour] = useState(17);

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    const id = crypto.randomUUID();
    await insertBattery({
      id,
      name: name.trim(),
      chemistry,
      voltage,
      amphour,
      notes: null,
      rack_slot: null,
    });
    router.back();
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.label}>Battery Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Battery 1, A-17, Pit Alpha"
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Chemistry</Text>
        <View style={styles.pickerRow}>
          {CHEMISTRIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.pill,
                chemistry === c && styles.pillActive,
              ]}
              onPress={() => setChemistry(c)}
            >
              <Text
                style={[
                  styles.pillText,
                  chemistry === c && styles.pillTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Voltage</Text>
        <View style={styles.pickerRow}>
          {VOLTAGES.map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.pill, voltage === v && styles.pillActive]}
              onPress={() => setVoltage(v)}
            >
              <Text
                style={[styles.pillText, voltage === v && styles.pillTextActive]}
              >
                {v}V
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Amp Hour</Text>
        <View style={styles.pickerRow}>
          {AMP_HOURS.map((ah) => (
            <TouchableOpacity
              key={ah}
              style={[styles.pill, amphour === ah && styles.pillActive]}
              onPress={() => setAmphour(ah)}
            >
              <Text
                style={[styles.pillText, amphour === ah && styles.pillTextActive]}
              >
                {ah} Ah
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
          <Text style={styles.saveButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  section: { padding: 16, paddingBottom: 0 },
  label: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 16,
    fontSize: 17,
    color: COLORS.text,
  },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { fontSize: 16, color: COLORS.text },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    marginTop: 24,
  },
  button: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: COLORS.surfaceAlt },
  cancelButtonText: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  saveButton: { backgroundColor: COLORS.primary },
  saveButtonText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  buttonDisabled: { opacity: 0.5 },
});
