/**
 * notifications.ts
 *
 * Remote push notifications (getExpoPushTokenAsync) were removed because:
 *  - Expo Go SDK 53+ no longer supports remote push on Android.
 *  - In-app delivery is handled by GlobalNotificationContext via Supabase Realtime.
 *
 * This file is kept for API compatibility. Functions are intentional no-ops in
 * the current Expo Go environment. Replace with a proper server-side push
 * solution (e.g. Supabase Edge Function + FCM) when moving to a production build.
 */

export async function registerForPushNotifications(): Promise<null> {
  // No-op: expo-notifications module is not imported here to avoid
  // the Android "warnOfExpoGoPushUsage" auto-registration error in Expo Go.
  return null;
}

export async function sendPushNotification(
  _toUserId: string,
  _title: string,
  _body: string,
  _data?: Record<string, string>
): Promise<void> {
  // No-op in Expo Go. GlobalNotificationContext handles real-time delivery
  // via Supabase Realtime broadcast and postgres_changes channels.
}

export async function scheduleLocalNotification(
  _title: string,
  _body: string,
  _data?: Record<string, string>
): Promise<void> {
  // No-op in Expo Go. Reserved for production development build.
}
