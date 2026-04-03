import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { recognizeBatteryBeak } from '@/lib/ocr';
import { insertReading, getAllBatteries } from '@/lib/batteryDb';
import type { BatteryStatus } from '@/lib/constants';
import { BATTERY_STATUSES, COLORS, FONT, RADIUS, SPACE } from '@/lib/constants';

type Phase = 'capture' | 'processing' | 'confirmation';

export default function ScanScreen() {
  const router = useRouter();
  const { batteryId } = useLocalSearchParams<{ batteryId?: string }>();
  const [phase, setPhase] = useState<Phase>('capture');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [selectedBatteryId, setSelectedBatteryId] = useState<string | null>(
    batteryId ?? null
  );
  const [batteries, setBatteries] = useState<{ id: string; name: string }[]>([]);

  const [editedStatus, setEditedStatus] = useState<BatteryStatus>('Good');
  const [editedCharge, setEditedCharge] = useState('');
  const [editedV0, setEditedV0] = useState('');
  const [editedV1, setEditedV1] = useState('');
  const [editedV2, setEditedV2] = useState('');
  const [editedRint, setEditedRint] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      processImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setImageUri(uri);
    setPhase('processing');
    try {
      const { text, parsed: p } = await recognizeBatteryBeak(uri);
      setRawText(text);
      setEditedStatus((p.status as BatteryStatus) ?? 'Good');
      setEditedCharge(
        p.chargePercent != null ? String(Math.round(p.chargePercent)) : ''
      );
      setEditedV0(
        p.voltageNoLoad != null ? p.voltageNoLoad.toFixed(3) : ''
      );
      setEditedV1(p.voltageLoad1 != null ? p.voltageLoad1.toFixed(3) : '');
      setEditedV2(p.voltageLoad2 != null ? p.voltageLoad2.toFixed(3) : '');
      setEditedRint(
        p.internalResistance != null ? p.internalResistance.toFixed(3) : ''
      );
      const all = await getAllBatteries();
      setBatteries(all.map((b) => ({ id: b.id, name: b.name })));
      if (!selectedBatteryId && all.length > 0) {
        setSelectedBatteryId(all[0].id);
      }
      setPhase('confirmation');
    } catch {
      setEditedStatus('Good');
      setEditedCharge('');
      setEditedV0('');
      setEditedV1('');
      setEditedV2('');
      setEditedRint('');
      const all = await getAllBatteries();
      setBatteries(all.map((b) => ({ id: b.id, name: b.name })));
      if (!selectedBatteryId && all.length > 0) {
        setSelectedBatteryId(all[0].id);
      }
      setPhase('confirmation');
    }
  };

  const retake = () => {
    setPhase('capture');
    setImageUri(null);
    setRawText('');
  };

  const handleSave = async () => {
    const charge = Math.min(
      130,
      Math.max(0, parseFloat(editedCharge) || 0)
    );
    await insertReading({
      id: crypto.randomUUID(),
      battery_id: selectedBatteryId,
      status: editedStatus,
      charge_percent: charge,
      voltage_no_load: editedV0 ? parseFloat(editedV0) : null,
      voltage_load1: editedV1 ? parseFloat(editedV1) : null,
      voltage_load2: editedV2 ? parseFloat(editedV2) : null,
      current_load2: null,
      internal_resistance: editedRint ? parseFloat(editedRint) : null,
      raw_ocr_text: rawText || null,
      source: 'Photo',
    });
    router.back();
  };

  if (phase === 'capture') {
    return (
      <View style={styles.container}>
        <Text style={styles.captureTitle}>Photo of Beak screen</Text>
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
            <Text style={styles.primaryBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
            <Text style={styles.secondaryBtnText}>Library</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'processing') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.processingText}>Reading…</Text>
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
        contentContainerStyle={styles.confirmScroll}
      >
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.preview}
            resizeMode="contain"
          />
        )}
        <Text style={styles.sectionTitle}>Values</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            {BATTERY_STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusPill,
                  editedStatus === s && styles.statusPillActive,
                ]}
                onPress={() => setEditedStatus(s)}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    editedStatus === s && styles.statusPillTextActive,
                  ]}
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
            value={editedCharge}
            onChangeText={setEditedCharge}
            placeholder="0–130"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>V0</Text>
          <TextInput
            style={styles.input}
            value={editedV0}
            onChangeText={setEditedV0}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>V1</Text>
          <TextInput
            style={styles.input}
            value={editedV1}
            onChangeText={setEditedV1}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>V2</Text>
          <TextInput
            style={styles.input}
            value={editedV2}
            onChangeText={setEditedV2}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Ohms</Text>
          <TextInput
            style={styles.input}
            value={editedRint}
            onChangeText={setEditedRint}
            placeholder="0.025"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        {batteries.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Battery</Text>
            <View style={styles.pickerRow}>
              <TouchableOpacity
                style={[
                  styles.batteryPill,
                  !selectedBatteryId && styles.batteryPillActive,
                ]}
                onPress={() => setSelectedBatteryId(null)}
              >
                <Text
                  style={[
                    styles.batteryPillText,
                    !selectedBatteryId && styles.batteryPillTextActive,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {batteries.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.batteryPill,
                    selectedBatteryId === b.id && styles.batteryPillActive,
                  ]}
                  onPress={() => setSelectedBatteryId(b.id)}
                >
                  <Text
                    style={[
                      styles.batteryPillText,
                      selectedBatteryId === b.id && styles.batteryPillTextActive,
                    ]}
                  >
                    {b.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.saveRow}>
          <TouchableOpacity style={styles.retakeBtn} onPress={retake}>
            <Text style={styles.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  captureTitle: {
    fontSize: FONT.title,
    fontWeight: '800',
    paddingHorizontal: SPACE.screen,
    paddingTop: 24,
    textAlign: 'center',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  buttons: { padding: SPACE.screen, gap: 14, marginTop: 28 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: FONT.button, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 20,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: { fontSize: FONT.button, fontWeight: '700', color: COLORS.text },
  processingText: {
    marginTop: 20,
    color: COLORS.text,
    fontSize: FONT.section,
    fontWeight: '700',
  },
  confirmScroll: { paddingBottom: 32 },
  preview: {
    height: 220,
    width: '100%',
    borderRadius: RADIUS.md,
    marginHorizontal: SPACE.screen,
    marginTop: 12,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  sectionTitle: {
    fontSize: FONT.section,
    fontWeight: '800',
    paddingHorizontal: SPACE.screen,
    marginTop: 20,
    marginBottom: 16,
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  field: { paddingHorizontal: SPACE.screen, marginBottom: SPACE.block },
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
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusPillText: { fontSize: FONT.meta, fontWeight: '700', color: COLORS.text },
  statusPillTextActive: { color: '#fff' },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  batteryPill: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  batteryPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  batteryPillText: { fontSize: FONT.meta, fontWeight: '700', color: COLORS.text },
  batteryPillTextActive: { color: '#fff' },
  saveRow: { flexDirection: 'row', gap: 12, padding: SPACE.screen, marginTop: 12 },
  retakeBtn: {
    flex: 1,
    padding: 18,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  retakeBtnText: { fontSize: FONT.button, fontWeight: '700', color: COLORS.text },
  saveBtn: {
    flex: 2,
    padding: 18,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: FONT.button, fontWeight: '700' },
});
