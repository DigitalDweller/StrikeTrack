import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getBatteryById,
  updateBattery,
} from '@/lib/batteryDb';
import {
  CHEMISTRIES,
  VOLTAGES,
  AMP_HOURS,
  COLORS,
  type Chemistry,
} from '@/lib/constants';

export default function EditBatteryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [chemistry, setChemistry] = useState<Chemistry>('Lead Acid');
  const [voltage, setVoltage] = useState(12);
  const [amphour, setAmphour] = useState(17);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getBatteryById(id).then((b) => {
      if (b) {
        setName(b.name);
        setChemistry(b.chemistry as Chemistry);
        setVoltage(b.voltage);
        setAmphour(b.amphour);
        setNotes(b.notes ?? '');
      }
      setLoading(false);
    });
  }, [id]);

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!id || !canSave) return;
    await updateBattery(id, {
      name: name.trim(),
      chemistry,
      voltage,
      amphour,
      notes: notes.trim() || null,
    });
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={{ color: COLORS.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.label}>Battery Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Battery 1, A-17"
          placeholderTextColor={COLORS.textTertiary}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Chemistry</Text>
        <View style={styles.pickerRow}>
          {CHEMISTRIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.pill, chemistry === c && styles.pillActive]}
              onPress={() => setChemistry(c)}
            >
              <Text
                style={[styles.pillText, chemistry === c && styles.pillTextActive]}
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

      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes"
          placeholderTextColor={COLORS.textTertiary}
          multiline
          numberOfLines={3}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { padding: 16, paddingBottom: 0 },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
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
  buttonDisabled: { opacity: 0.5 },
});
