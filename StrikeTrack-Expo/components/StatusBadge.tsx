import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Good: { bg: 'rgba(34, 197, 94, 0.22)', fg: '#4ade80' },
  Fair: { bg: 'rgba(249, 115, 22, 0.22)', fg: '#fb923c' },
  Bad: { bg: 'rgba(248, 113, 113, 0.22)', fg: '#f87171' },
  'Charge Battery': { bg: 'rgba(250, 204, 21, 0.18)', fg: '#facc15' },
};

type Props = {
  status: string;
};

export function StatusBadge({ status }: Props) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.Good;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
});
