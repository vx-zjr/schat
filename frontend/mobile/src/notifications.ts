import { SchatMobileApiClient } from './api';

export function buildNativePushRegistration(platform: 'ios' | 'android' | string, token: string, deviceId: string) {
  return {
    provider: platform === 'ios' ? 'apns' : 'fcm',
    endpoint: token,
    platform,
    deviceId
  };
}

export function shouldAttemptNativePushRegistration(value = process.env.EXPO_PUBLIC_ENABLE_NATIVE_PUSH) {
  return value === 'true';
}

export async function registerNativePush(apiClient: SchatMobileApiClient): Promise<string | null> {
  if (!shouldAttemptNativePushRegistration()) {
    return null;
  }

  const Notifications = await import('expo-notifications');
  const { Platform } = await import('react-native');
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const token = await Notifications.getDevicePushTokenAsync();
  const saved = await apiClient.post<{ id: string }>(
    '/notifications/subscriptions',
    buildNativePushRegistration(Platform.OS, String(token.data), createSessionDeviceId())
  );
  return saved.id;
}

export async function deleteNativePush(apiClient: SchatMobileApiClient, subscriptionId: string | null) {
  if (!subscriptionId) {
    return;
  }
  await apiClient.delete(`/notifications/subscriptions/${subscriptionId}`);
}

function createSessionDeviceId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `mobile-${Date.now()}`;
}
