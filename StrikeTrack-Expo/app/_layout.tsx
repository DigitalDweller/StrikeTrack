import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { initDatabase } from '@/lib/database';
import { COLORS } from '@/lib/constants';
import { registerNotificationHandler } from '@/lib/registerNotificationHandler';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setReady(true));
  }, []);

  useEffect(() => {
    registerNotificationHandler();
  }, []);

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerLargeTitle: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Batteries',
            headerRight: () => <HeaderAddButton />,
          }}
        />
        <Stack.Screen
          name="battery/[id]"
          options={{ title: 'Battery', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="add-battery"
          options={{ title: 'Add Battery', presentation: 'modal' }}
        />
        <Stack.Screen
          name="edit-battery/[id]"
          options={{ title: 'Edit Battery', presentation: 'modal' }}
        />
        <Stack.Screen
          name="scan"
          options={{ title: 'Scan Battery Beak', presentation: 'modal' }}
        />
        <Stack.Screen
          name="manual-entry/[id]"
          options={{ title: 'Manual Entry', presentation: 'modal' }}
        />
        <Stack.Screen
          name="match-before/[batteryId]"
          options={{ title: 'Before match', presentation: 'modal' }}
        />
        <Stack.Screen
          name="match-after/[usageId]"
          options={{ title: 'After match', presentation: 'modal' }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

function HeaderAddButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push('/add-battery')}
      style={{ marginRight: 16 }}
    >
      <Text style={{ fontSize: 17, color: COLORS.primary, fontWeight: '600' }}>Add</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
