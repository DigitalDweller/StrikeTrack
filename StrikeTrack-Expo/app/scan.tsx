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
import { StatusBadge } from '@/components/StatusBadge';
import type { ParsedBatteryReading } from '@/lib/batteryBeakParser';
import type { BatteryStatus } from '@/lib/constants';
import { BATTERY_STATUSES, COLORS } from '@/lib/constants';

type Phase = 'capture' | 'processing' | 'confirmation';

export default function ScanScreen() {
  const router = useRouter();
  const { batteryId } = useLocalSearchParams<{ batteryId?: string }>();
  const [phase, setPhase] = useState<Phase>('capture');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedBatteryReading>({});
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
      setParsed(p);
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
    setParsed({});
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
        <Text style={styles.title}>Capture Battery Beak Screen</Text>
        <Text style={styles.desc}>
          Take a photo or choose from your library. Fill the frame with the
          display and reduce glare.
        </Text>
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
            <Text style={styles.primaryBtnText}>📷 Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
            <Text style={styles.secondaryBtnText}>🖼️ Choose from Library</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'processing') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text style={styles.processingText}>Reading Battery Beak display…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.preview}
            resizeMode="contain"
          />
        )}
        <Text style={styles.sectionTitle}>Review & edit</Text>

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
            placeholder="0-130"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>V0 (no load)</Text>
          <TextInput
            style={styles.input}
            value={editedV0}
            onChangeText={setEditedV0}
            placeholder="e.g. 13.682"
            placeholderTextColor={COLORS.textTertiary}
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
          <Text style={styles.label}>Rint (Ohms)</Text>
          <TextInput
            style={styles.input}
            value={editedRint}
            onChangeText={setEditedRint}
            placeholder="e.g. 0.025"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        {batteries.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Save to Battery</Text>
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
                  (Don't assign)
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
            <Text style={styles.saveBtnText}>Save Reading</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', padding: 16, textAlign: 'center', color: COLORS.text },
  desc: {
    fontSize: 16,
    color: COLORS.textSecondary,
    paddingHorizontal: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  buttons: { padding: 16, gap: 12 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  processingText: { marginTop: 16, color: COLORS.textSecondary },
  preview: { height: 200, width: '100%', borderRadius: 12, margin: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 16,
    color: COLORS.text,
  },
  field: { paddingHorizontal: 16, marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 16,
    fontSize: 17,
    color: COLORS.text,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  statusPillActive: { backgroundColor: COLORS.primary },
  statusPillText: { fontSize: 15, color: COLORS.text },
  statusPillTextActive: { color: '#fff', fontWeight: '600' },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  batteryPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  batteryPillActive: { backgroundColor: COLORS.primary },
  batteryPillText: { fontSize: 15, color: COLORS.text },
  batteryPillTextActive: { color: '#fff', fontWeight: '600' },
  saveRow: { flexDirection: 'row', gap: 12, padding: 16, marginTop: 24 },
  retakeBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
  },
  retakeBtnText: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  saveBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
