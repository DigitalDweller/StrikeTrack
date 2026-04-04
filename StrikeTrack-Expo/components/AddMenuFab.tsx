import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, SPACE } from '@/lib/constants';
import { getAllBatteries, insertBattery } from '@/lib/batteryDb';
import { STORAGE_LAYOUT } from '@/lib/storageLayout';

const FAB_H = 52;
const FAB_BOTTOM = 28;
/** Compact menu width */
const MENU_WIDTH = 300;

type Props = {
  onAdded?: () => void | Promise<void>;
};

function firstOpenSlotIndex(slotCount: number, usedSlots: Set<number>): number | null {
  for (let i = 0; i < slotCount; i += 1) {
    if (!usedSlots.has(i)) return i;
  }
  return null;
}

export function AddMenuFab({ onAdded }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(8)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const menuBottom = FAB_BOTTOM + FAB_H + 8 + insets.bottom;

  useEffect(() => {
    if (!open || closingRef.current) return;
    let cancelled = false;
    scaleAnim.setValue(0);
    translateYAnim.setValue(8);
    menuOpacity.setValue(0);
    backdropOpacity.setValue(0);
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 9,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [open, scaleAnim, translateYAnim, menuOpacity, backdropOpacity]);

  const runClose = (after?: () => void) => {
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(menuOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      closingRef.current = false;
      if (finished) {
        setOpen(false);
        after?.();
      }
    });
  };

  const closeMenu = () => runClose();

  const submitBattery = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    try {
      setSaving(true);
      const id = crypto.randomUUID();
      const batteries = await getAllBatteries();
      const usedUnassignedSlots = new Set(
        batteries
          .filter((b) => b.storage_section === 'extra' && b.storage_slot != null && b.storage_slot >= 0)
          .map((b) => b.storage_slot as number)
      );
      const unassignedSlot = firstOpenSlotIndex(STORAGE_LAYOUT.extra.slotCount, usedUnassignedSlots);

      await insertBattery({
        id,
        name: trimmed,
        chemistry: 'Lead Acid',
        voltage: 12,
        amphour: 17,
        notes: null,
        rack_slot: null,
        storage_section: unassignedSlot == null ? null : 'extra',
        storage_slot: unassignedSlot,
        charging_since: null,
      });
      await onAdded?.();
      setName('');
      runClose();
    } catch {
      Alert.alert('Could not add battery', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Pressable
        style={({ hovered, pressed }) => [
          styles.fab,
          { backgroundColor: hovered || pressed ? '#6366f1' : '#4f46e5' },
        ]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Add"
      >
        <Feather name="plus-circle" size={20} color="#eef2ff" />
        <Text style={styles.fabLabel}>Add</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeMenu}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeMenu}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(0,0,0,0.4)', opacity: backdropOpacity },
              ]}
            />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.menuAnchor,
              {
                bottom: menuBottom,
                right: SPACE.screen,
                opacity: menuOpacity,
                transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.menuCard} pointerEvents="auto">
              <View style={styles.headerRow}>
                <Text style={styles.menuRowLabel}>Battery</Text>
                <Pressable
                  onPress={closeMenu}
                  style={({ hovered, pressed }) => [
                    styles.closeIconBtn,
                    hovered || pressed ? styles.closeIconBtnActive : null,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close menu"
                >
                  {({ hovered, pressed }) => (
                    <Feather
                      name="x"
                      size={16}
                      color={hovered || pressed ? '#e4e4e7' : '#71717a'}
                    />
                  )}
                </Pressable>
              </View>

              <View style={styles.menuDivider} />

              <View style={styles.formBlock}>
                <Text style={styles.fieldLabel}>Battery Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Battery 12"
                  placeholderTextColor="#52525b"
                  style={styles.input}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={submitBattery}
                />
                <Pressable
                  onPress={submitBattery}
                  disabled={!name.trim() || saving}
                  style={({ hovered, pressed }) => [
                    styles.submitBtn,
                    (hovered || pressed) && !saving ? styles.submitBtnHover : null,
                    !name.trim() || saving ? styles.submitBtnDisabled : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add battery"
                >
                  <Text style={styles.submitBtnText}>{saving ? 'Adding...' : 'Add Battery'}</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: SPACE.screen,
    bottom: FAB_BOTTOM,
    minWidth: 116,
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
    zIndex: 10,
  },
  fabLabel: {
    color: '#fff',
    fontSize: FONT.button + 1,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalRoot: {
    flex: 1,
  },
  menuAnchor: {
    position: 'absolute',
    width: MENU_WIDTH,
    alignItems: 'stretch',
  },
  menuCard: {
    width: MENU_WIDTH,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.6)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 26,
    elevation: 20,
  },
  headerRow: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuRowLabel: {
    color: '#f4f4f5',
    fontSize: FONT.body + 1,
    fontWeight: '600',
    textAlign: 'left',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginHorizontal: 16,
  },
  closeIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconBtnActive: {
    backgroundColor: '#27272a',
  },
  formBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a1a1aa',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#f4f4f5',
    fontSize: 14,
  },
  submitBtn: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnHover: {
    backgroundColor: '#6366f1',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
});
