import { View, Text, StyleSheet } from 'react-native';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Good: { bg: 'rgba(34, 197, 94, 0.2)', fg: '#22c55e' },
  Fair: { bg: 'rgba(249, 115, 22, 0.2)', fg: '#f97316' },
  Bad: { bg: 'rgba(239, 68, 68, 0.2)', fg: '#ef4444' },
  'Charge Battery': { bg: 'rgba(249, 115, 22, 0.2)', fg: '#f97316' },
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
