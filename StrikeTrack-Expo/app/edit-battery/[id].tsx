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
import { normalizeRouteParam } from '@/lib/routeParams';
import {
  COLORS,
  FONT,
  RADIUS,
  SPACE,
} from '@/lib/constants';

export default function EditBatteryScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = normalizeRouteParam(params.id);
  const router = useRouter();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getBatteryById(id).then((b) => {
      if (b) {
        setName(b.name);
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
      notes: notes.trim() || null,
    });
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!id) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={styles.loadingText}>Battery not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Battery name"
          placeholderTextColor={COLORS.textTertiary}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
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
  scroll: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: FONT.body, fontWeight: '600', color: COLORS.text },
  section: { paddingHorizontal: SPACE.screen, marginBottom: SPACE.block },
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
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: SPACE.screen,
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
