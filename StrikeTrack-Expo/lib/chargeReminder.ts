import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

const REST_SECONDS = 30 * 60;

let androidChannelReady = false;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  await Notifications.setNotificationChannelAsync('charge-rest', {
    name: 'Rest timer',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  androidChannelReady = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Schedules a local notification 30 minutes from now (after post-match stats are saved). */
export async function schedulePlugInReminder(batteryName: string): Promise<string | null> {
  await ensureAndroidChannel();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Plug battery in',
      body: `${batteryName}: 30 min rest is up — safe to put back on the charger.`,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: REST_SECONDS,
      repeats: false,
      ...(Platform.OS === 'android' ? { channelId: 'charge-rest' } : {}),
    },
  });
  return id;
}
