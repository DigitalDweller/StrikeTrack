export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function schedulePlugInReminder(_batteryName: string): Promise<string | null> {
  return null;
}
