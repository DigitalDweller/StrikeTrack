import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  completeMatchUsageAfter,
  deleteBattery,
  getAllBatteries,
  getBatteryById,
  getMatchUsagesByBatteryId,
  getPendingMatchUsages,
  insertMatchUsageBefore,
  insertReading,
  setBatteryStoragePlacement,
} from '@/lib/batteryDb';
import { COLORS, FONT, RADIUS, SPACE } from '@/lib/constants';
import type { Battery } from '@/lib/database';
import { capChargePercentInput, clampChargePercent } from '@/lib/chargePercent';
import { STORAGE_LAYOUT, type StorageSection } from '@/lib/storageLayout';
import { minutesRestRemaining } from '@/lib/restTimer';

type WorkflowStatus = 'Unassigned' | 'Charging' | 'Cooling Down' | 'On field';
type FieldKey = 'charge' | 'ohms' | 'matchNumber' | 'preCharge' | 'preOhms' | 'postCharge' | 'postOhms';

const CHARGE_FIELD_KEYS: FieldKey[] = ['charge', 'preCharge', 'postCharge'];
type ActionKey =
  | 'start_charging'
  | 'send_to_match'
  | 'stop_charging'
  | 'resume_charging'
  | 'make_unassigned'
  | 'return_charge'
  | 'return_unassigned'
  | 'return_cooloff';

type TransitionAction = {
  key: ActionKey;
  label: string;
  nextStatus: WorkflowStatus;
  variant: 'primary' | 'secondary' | 'warning' | 'charging' | 'onField';
  fields: Array<{ key: FieldKey; label: string; placeholder: string; numeric?: boolean }>;
};

const ACTIONS_BY_STATUS: Record<WorkflowStatus, TransitionAction[]> = {
  Unassigned: [
    {
      key: 'start_charging',
      label: 'Start Charging',
      nextStatus: 'Charging',
      variant: 'primary',
      fields: [
        { key: 'charge', label: 'Charge %', placeholder: '100', numeric: true },
        { key: 'ohms', label: 'Ohms', placeholder: '0.025', numeric: true },
      ],
    },
  ],
  Charging: [
    {
      key: 'send_to_match',
      label: 'Send to Match',
      nextStatus: 'On field',
      variant: 'onField',
      fields: [
        { key: 'matchNumber', label: 'Match Number', placeholder: 'Q12' },
        { key: 'preCharge', label: 'Pre-Match Charge %', placeholder: '100', numeric: true },
        { key: 'preOhms', label: 'Pre-Match Ohms', placeholder: '0.025', numeric: true },
      ],
    },
    {
      key: 'stop_charging',
      label: 'Stop Charging',
      nextStatus: 'Cooling Down',
      variant: 'secondary',
      fields: [
        { key: 'charge', label: 'Charge %', placeholder: '95', numeric: true },
        { key: 'ohms', label: 'Ohms', placeholder: '0.027', numeric: true },
      ],
    },
  ],
  'Cooling Down': [
    {
      key: 'resume_charging',
      label: 'Add to Charger',
      nextStatus: 'Charging',
      variant: 'charging',
      fields: [
        { key: 'charge', label: 'Charge %', placeholder: '82', numeric: true },
        { key: 'ohms', label: 'Ohms', placeholder: '0.028', numeric: true },
      ],
    },
    {
      key: 'make_unassigned',
      label: 'Make Unassigned',
      nextStatus: 'Unassigned',
      variant: 'secondary',
      fields: [
        { key: 'charge', label: 'Charge %', placeholder: '90', numeric: true },
        { key: 'ohms', label: 'Ohms', placeholder: '0.029', numeric: true },
      ],
    },
  ],
  'On field': [
    {
      key: 'return_cooloff',
      label: 'Return & Cool Off',
      nextStatus: 'Cooling Down',
      variant: 'warning',
      fields: [
        { key: 'postCharge', label: 'Post-Match Charge %', placeholder: '68', numeric: true },
        { key: 'postOhms', label: 'Post-Match Ohms', placeholder: '0.032', numeric: true },
      ],
    },
    {
      key: 'return_charge',
      label: 'Return & Charge',
      nextStatus: 'Charging',
      variant: 'charging',
      fields: [
        { key: 'postCharge', label: 'Post-Match Charge %', placeholder: '68', numeric: true },
        { key: 'postOhms', label: 'Post-Match Ohms', placeholder: '0.032', numeric: true },
      ],
    },
    {
      key: 'return_unassigned',
      label: 'Make Unassigned',
      nextStatus: 'Unassigned',
      variant: 'secondary',
      fields: [
        { key: 'postCharge', label: 'Post-Match Charge %', placeholder: '68', numeric: true },
        { key: 'postOhms', label: 'Post-Match Ohms', placeholder: '0.032', numeric: true },
      ],
    },
  ],
};

function sectionToStatus(section: string | null | undefined): WorkflowStatus {
  if (section === 'charging') return 'Charging';
  if (section === 'on_field') return 'On field';
  if (section === 'not_charging') return 'Cooling Down';
  return 'Unassigned';
}

function statusToSection(status: WorkflowStatus): StorageSection {
  if (status === 'Charging') return 'charging';
  if (status === 'On field') return 'on_field';
  if (status === 'Cooling Down') return 'not_charging';
  return 'extra';
}

function statusToDashboardTab(status: WorkflowStatus): 'match' | 'charging' | 'cooling' | 'add' {
  if (status === 'On field') return 'match';
  if (status === 'Charging') return 'charging';
  if (status === 'Cooling Down') return 'cooling';
  return 'add';
}

function firstOpenSlotIndex(slotCount: number, usedSlots: Set<number>): number | null {
  for (let i = 0; i < slotCount; i += 1) {
    if (!usedSlots.has(i)) return i;
  }
  return null;
}

export type BatteryDetailPanelProps = {
  batteryId: string;
};

export function BatteryDetailPanel({ batteryId }: BatteryDetailPanelProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [battery, setBattery] = useState<Battery | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null);
  const [activeAction, setActiveAction] = useState<TransitionAction | null>(null);
  const [formValues, setFormValues] = useState<Record<FieldKey, string>>({
    charge: '',
    ohms: '',
    matchNumber: '',
    preCharge: '',
    preOhms: '',
    postCharge: '',
    postOhms: '',
  });
  const [submittingAction, setSubmittingAction] = useState(false);

  const reload = useCallback(() => {
    if (!batteryId) {
      setLoaded(true);
      return;
    }
    Promise.all([getBatteryById(batteryId), getMatchUsagesByBatteryId(batteryId)]).then(
      ([b, usages]) => {
        setBattery(b ?? null);
        setCooldownMinutes(minutesRestRemaining(usages, batteryId));
        setLoaded(true);
      }
    );
  }, [batteryId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const runDelete = async () => {
    if (!battery || deleting) return;
    try {
      setDeleting(true);
      await deleteBattery(battery.id);
      router.replace('/');
    } catch {
      Alert.alert('Delete failed', 'Unable to delete this battery right now.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!battery || deleting) return;
    if (Platform.OS === 'web') {
      const approved = globalThis.confirm(
        `Delete "${battery.name}"?\n\nAll readings will be deleted.`
      );
      if (approved) {
        void runDelete();
      }
      return;
    }
    Alert.alert(
      'Delete Battery',
      `Remove "${battery.name}"? All readings will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await runDelete();
          },
        },
      ]
    );
  };

  const currentStatus = useMemo<WorkflowStatus>(
    () => sectionToStatus(battery?.storage_section),
    [battery?.storage_section]
  );
  const actions = ACTIONS_BY_STATUS[currentStatus];

  const openActionModal = (action: TransitionAction) => {
    if (submittingAction) return;
    if (action.key === 'start_charging' && cooldownMinutes != null) {
      Alert.alert(
        'Cooling off',
        `This battery must cool off for about 1 hour after a match. ~${cooldownMinutes} minute(s) remaining.`
      );
      return;
    }
    setFormValues({
      charge: '',
      ohms: '',
      matchNumber: '',
      preCharge: '',
      preOhms: '',
      postCharge: '',
      postOhms: '',
    });
    setActiveAction(action);
  };

  const setField = (key: FieldKey, value: string) => {
    const next = CHARGE_FIELD_KEYS.includes(key) ? capChargePercentInput(value) : value;
    setFormValues((prev) => ({ ...prev, [key]: next }));
  };

  const canSubmitAction = useMemo(() => {
    if (!activeAction) return false;
    return activeAction.fields.every((f) => formValues[f.key].trim().length > 0);
  }, [activeAction, formValues]);

  const assignToSection = async (targetStatus: WorkflowStatus) => {
    if (!battery) return;
    const targetSection = statusToSection(targetStatus);
    const all = await getAllBatteries();
    const used = new Set(
      all
        .filter(
          (b) =>
            b.id !== battery.id &&
            b.storage_section === targetSection &&
            b.storage_slot != null &&
            b.storage_slot >= 0
        )
        .map((b) => b.storage_slot as number)
    );
    const slot = firstOpenSlotIndex(STORAGE_LAYOUT[targetSection].slotCount, used);
    if (slot == null) {
      throw new Error(`No free slot in ${targetStatus}`);
    }
    await setBatteryStoragePlacement(battery.id, targetSection, slot);
  };

  const addReading = async (status: WorkflowStatus, chargeValue: number, ohmsValue: number) => {
    if (!battery) return;
    await insertReading({
      id: crypto.randomUUID(),
      battery_id: battery.id,
      status,
      charge_percent: chargeValue,
      voltage_no_load: null,
      voltage_load1: null,
      voltage_load2: null,
      current_load2: null,
      internal_resistance: ohmsValue,
      raw_ocr_text: null,
      source: 'Manual',
    });
  };

  const parseNumberField = (key: FieldKey): number => {
    const n = parseFloat(formValues[key].trim().replace(',', '.'));
    if (Number.isNaN(n)) throw new Error('Please enter valid numbers in all required fields.');
    if (CHARGE_FIELD_KEYS.includes(key)) return clampChargePercent(n);
    return n;
  };

  const submitTransition = async () => {
    if (!activeAction || !battery || submittingAction) return;
    try {
      setSubmittingAction(true);
      const destinationTab = statusToDashboardTab(activeAction.nextStatus);
      if (activeAction.key === 'send_to_match') {
        const preCharge = parseNumberField('preCharge');
        const preOhms = parseNumberField('preOhms');
        const matchNumber = formValues.matchNumber.trim();
        if (!matchNumber) throw new Error('Match Number is required.');
        await insertMatchUsageBefore({
          id: crypto.randomUUID(),
          battery_id: battery.id,
          match_label: matchNumber,
          before_charge_percent: preCharge,
          before_voltage_no_load: null,
          before_internal_resistance: preOhms,
        });
        await addReading('On field', preCharge, preOhms);
        await assignToSection('On field');
      } else if (
        activeAction.key === 'return_cooloff' ||
        activeAction.key === 'return_charge' ||
        activeAction.key === 'return_unassigned'
      ) {
        const postCharge = parseNumberField('postCharge');
        const postOhms = parseNumberField('postOhms');
        const pending = await getPendingMatchUsages(battery.id);
        if (pending.length > 0) {
          await completeMatchUsageAfter(pending[0].id, {
            after_charge_percent: postCharge,
            after_voltage_no_load: null,
            after_internal_resistance: postOhms,
          });
        }
        if (activeAction.key === 'return_charge') {
          await addReading('Charging', postCharge, postOhms);
          await assignToSection('Charging');
        } else if (activeAction.key === 'return_unassigned') {
          await addReading('Unassigned', postCharge, postOhms);
          await assignToSection('Unassigned');
        } else {
          await addReading('Cooling Down', postCharge, postOhms);
          await assignToSection('Cooling Down');
        }
      } else {
        if (activeAction.key === 'start_charging' && cooldownMinutes != null) {
          throw new Error(
            `Cooldown active: ~${cooldownMinutes} minute(s) remaining before charging is allowed.`
          );
        }
        const charge = parseNumberField('charge');
        const ohms = parseNumberField('ohms');
        await addReading(activeAction.nextStatus, charge, ohms);
        await assignToSection(activeAction.nextStatus);
      }
      setActiveAction(null);
      router.replace({ pathname: '/', params: { tab: destinationTab } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update battery state.';
      Alert.alert('Transition failed', message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const scrollPad = useMemo(
    () => ({
      paddingHorizontal: SPACE.screen,
      paddingTop: Math.max(insets.top, 12) + 6,
      paddingBottom: 28,
      gap: 14,
    }),
    [insets.top]
  );

  if (!loaded) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!battery) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <Text style={styles.loadingText}>Battery not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={scrollPad} keyboardShouldPersistTaps="handled">
        <View style={styles.infoCard}>
          <Text style={styles.name}>{battery.name}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{currentStatus}</Text>
          </View>
          {cooldownMinutes != null && currentStatus !== 'Cooling Down' ? (
            <Text style={styles.cooldownText}>
              Cool off in progress: ~{cooldownMinutes} minute(s) remaining
            </Text>
          ) : null}
          {battery.notes?.trim() ? (
            <View style={styles.row}>
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.value}>{battery.notes.trim()}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsCard}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[
                styles.stateActionBtn,
                action.variant === 'primary'
                  ? styles.statePrimary
                  : action.variant === 'onField'
                    ? styles.stateOnField
                    : action.variant === 'charging'
                      ? styles.stateCharging
                      : action.variant === 'warning'
                        ? styles.stateWarning
                        : styles.stateSecondary,
              ]}
              onPress={() => openActionModal(action)}
            >
              <Text style={styles.stateActionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.adminActions}>
          <TouchableOpacity
            style={styles.settingsAction}
            onPress={() => router.push(`/edit-battery/${batteryId}`)}
          >
            <Text style={styles.settingsActionText}>Edit details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteInlineBtn}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Text style={styles.deleteInlineText}>
              {deleting ? 'Deleting battery...' : 'Delete battery'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={activeAction != null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveAction(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{activeAction?.label}</Text>
              <Pressable onPress={() => setActiveAction(null)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.modalFormStack}>
              {activeAction?.fields.map((field) => (
                <View key={field.key} style={styles.formField}>
                  <Text style={styles.formLabel}>{field.label}</Text>
                  <TextInput
                    value={formValues[field.key]}
                    onChangeText={(v) => setField(field.key, v)}
                    placeholder={field.placeholder}
                    placeholderTextColor="#52525b"
                    style={styles.formInput}
                    keyboardType={field.numeric ? 'decimal-pad' : 'default'}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.modalSubmit,
                activeAction?.nextStatus === 'Charging' ? styles.modalSubmitCharging : null,
                activeAction?.nextStatus === 'On field' ? styles.modalSubmitOnField : null,
                (!canSubmitAction || submittingAction) && styles.modalSubmitDisabled,
              ]}
              onPress={submitTransition}
              disabled={!canSubmitAction || submittingAction}
            >
              <Text style={styles.modalSubmitText}>
                {submittingAction ? 'Updating...' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: FONT.body, fontWeight: '600', color: COLORS.text },
  infoCard: {
    backgroundColor: '#18181b',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 10,
  },
  name: {
    fontSize: FONT.title + 2,
    fontWeight: '800',
    color: '#f4f4f5',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: { color: '#e4e4e7', fontSize: 12, fontWeight: '700' },
  cooldownText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: FONT.meta,
    fontWeight: '700',
    color: '#a1a1aa',
  },
  value: {
    fontSize: FONT.body,
    fontWeight: '600',
    color: '#d4d4d8',
    flexShrink: 1,
    textAlign: 'right',
  },
  actionsCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    flexDirection: 'column',
    gap: 10,
  },
  stateActionBtn: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  statePrimary: { backgroundColor: '#4f46e5' },
  stateSecondary: { backgroundColor: '#3f3f46' },
  stateWarning: { backgroundColor: '#ca8a04' },
  stateCharging: { backgroundColor: '#059669' },
  stateOnField: { backgroundColor: '#be123c' },
  stateActionText: { color: '#ffffff', fontSize: FONT.button - 1, fontWeight: '700' },
  adminActions: {
    paddingTop: 2,
    gap: 8,
  },
  settingsAction: {
    alignSelf: 'flex-start',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  settingsActionText: { color: '#d4d4d8', fontSize: 13, fontWeight: '600' },
  deleteInlineBtn: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
  },
  deleteInlineText: { color: '#f87171', fontSize: 13, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.6)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#f4f4f5',
    fontSize: 19,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
  },
  modalCloseText: { color: '#a1a1aa', fontSize: 14, fontWeight: '700' },
  modalFormStack: {
    flexDirection: 'column',
    gap: 16,
  },
  formField: {},
  formLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#f4f4f5',
    fontSize: 14,
  },
  modalSubmit: {
    marginTop: 6,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  modalSubmitCharging: {
    backgroundColor: '#059669',
  },
  modalSubmitOnField: {
    backgroundColor: '#be123c',
  },
  modalSubmitDisabled: { opacity: 0.45 },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
