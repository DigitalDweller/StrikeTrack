import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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
          headerLargeTitle: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.primary,
          headerTitleStyle: {
            fontSize: 22,
            fontWeight: '700',
            color: COLORS.text,
          },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
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
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
