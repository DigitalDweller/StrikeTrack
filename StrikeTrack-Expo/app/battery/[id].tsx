import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { normalizeRouteParam } from '@/lib/routeParams';

/** Deep links and legacy `/battery/:id` URLs open the home sheet via `?battery=` */
export default function BatteryDeepLinkScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = normalizeRouteParam(params.id);
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace({ pathname: '/', params: { battery: id } });
    } else {
      router.replace('/');
    }
  }, [id, router]);

  return (
    <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
