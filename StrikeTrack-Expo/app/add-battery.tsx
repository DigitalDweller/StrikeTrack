import { useState, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { insertBattery, insertReading } from '@/lib/batteryDb';
import { COLORS, FONT, RADIUS, SPACE } from '@/lib/constants';

export default function AddBatteryScreen() {
  const router = useRouter();
  const nameRef = useRef<TextInput>(null);
  const chargeRef = useRef<TextInput>(null);
  const ohmsRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [chargePercent, setChargePercent] = useState('100');
  const [internalResistance, setInternalResistance] = useState('');

  const rawCharge = parseFloat(chargePercent);
  const parsedCharge = Number.isNaN(rawCharge)
    ? NaN
    : Math.min(130, Math.max(0, rawCharge));
  const trimmedOhms = internalResistance.trim();
  const parsedOhms =
    trimmedOhms.length > 0 ? parseFloat(trimmedOhms) : NaN;
  const canSave =
    name.trim().length > 0 &&
    !Number.isNaN(parsedCharge) &&
    !Number.isNaN(parsedOhms) &&
    parsedOhms >= 0;

  const handleSave = async () => {
    if (!canSave) return;
    const id = crypto.randomUUID();
    await insertBattery({
      id,
      name: name.trim(),
      chemistry: 'Lead Acid',
      voltage: 12,
      amphour: 17,
      notes: null,
      rack_slot: null,
      storage_section: null,
      storage_slot: null,
    });
    await insertReading({
      id: crypto.randomUUID(),
      battery_id: id,
      status: 'Good',
      charge_percent: parsedCharge,
      voltage_no_load: null,
      voltage_load1: null,
      voltage_load2: null,
      current_load2: null,
      internal_resistance: parsedOhms,
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
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.screenTitle}>New battery</Text>

        <View style={styles.block}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            ref={nameRef}
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Battery 3"
            placeholderTextColor={COLORS.textTertiary}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => chargeRef.current?.focus()}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Charge %</Text>
          <TextInput
            ref={chargeRef}
            style={styles.input}
            value={chargePercent}
            onChangeText={setChargePercent}
            placeholder="0–130"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => ohmsRef.current?.focus()}
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Ohms</Text>
          <TextInput
            ref={ohmsRef}
            style={styles.input}
            value={internalResistance}
            onChangeText={setInternalResistance}
            placeholder="0.025"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>

        <TouchableOpacity
          style={[styles.addButton, !canSave && styles.addButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonText}>Add battery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40, paddingHorizontal: SPACE.screen },
  screenTitle: {
    fontSize: FONT.hero,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.8,
    marginTop: 8,
    marginBottom: SPACE.block,
  },
  block: { marginBottom: SPACE.block },
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
    minHeight: 60,
  },
  addButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { fontSize: FONT.button, fontWeight: '700', color: '#fff' },
  cancelLink: { alignItems: 'center', marginTop: 20, padding: 14 },
  cancelLinkText: { fontSize: FONT.body, color: COLORS.textSecondary, fontWeight: '600' },
});
