import { SchatApiClient } from 'shared';

export type BrowserSubscriptionJson = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function buildSubscriptionRegistration(subscription: BrowserSubscriptionJson, platform: string, deviceId: string) {
  return {
    provider: 'web-push',
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys?.p256dh,
      auth: subscription.keys?.auth
    },
    platform,
    deviceId
  };
}

export async function registerWebPush(apiClient: SchatApiClient): Promise<string | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return null;
  }

  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') {
    return null;
  }

  const { publicKey } = await apiClient.get<{ publicKey: string | null }>('/notifications/vapid-public-key');
  if (!publicKey) {
    return null;
  }

  const serviceWorkerUrl = new URL('sw.js', window.location.href).pathname;
  const registration = await navigator.serviceWorker.register(serviceWorkerUrl);
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

  const saved = await apiClient.post<{ id: string }>(
    '/notifications/subscriptions',
    buildSubscriptionRegistration(subscription.toJSON() as BrowserSubscriptionJson, 'web', createSessionDeviceId())
  );
  return saved.id;
}

export async function deleteWebPushSubscription(apiClient: SchatApiClient, subscriptionId: string | null) {
  if (!subscriptionId) {
    return;
  }
  await apiClient.delete(`/notifications/subscriptions/${subscriptionId}`);
}

function createSessionDeviceId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `web-${Date.now()}`;
}
