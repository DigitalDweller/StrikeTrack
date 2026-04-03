import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SPACE } from '@/lib/constants';

const FAB_W = 92;
const FAB_H = 56;
const FAB_BOTTOM = 28;
/** Compact menu width */
const MENU_WIDTH = 200;

export function AddMenuFab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const menuBottom = FAB_BOTTOM + FAB_H + 10 + insets.bottom;

  useEffect(() => {
    if (!open || closingRef.current) return;
    let cancelled = false;
    scaleAnim.setValue(0);
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
          duration: 180,
          delay: 40,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [open, scaleAnim, menuOpacity, backdropOpacity]);

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

  const onBattery = () => {
    runClose(() => router.push('/add-battery'));
  };

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setOpen(true)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Add"
      >
        <Text style={styles.fabLabel}>Add</Text>
      </TouchableOpacity>

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
                transform: [{ scale: scaleAnim }],
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.menuCard} pointerEvents="auto">
              <TouchableOpacity
                style={styles.menuRow}
                onPress={onBattery}
                activeOpacity={0.85}
              >
                <Text style={styles.menuRowLabel}>Battery</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                onPress={closeMenu}
                style={styles.closeRow}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
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
    minWidth: FAB_W,
    height: FAB_H,
    paddingHorizontal: 22,
    borderRadius: FAB_H / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10,
  },
  fabLabel: {
    color: '#fff',
    fontSize: FONT.button,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuRowLabel: {
    color: COLORS.text,
    fontSize: FONT.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  closeRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 20,
    fontWeight: '600',
    marginTop: Platform.OS === 'ios' ? 1 : 0,
  },
});
