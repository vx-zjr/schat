import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSubscriptionRegistration, urlBase64ToUint8Array } from '../.tmp-test/push.js';

test('converts a VAPID public key into bytes for PushManager', () => {
  assert.deepEqual(Array.from(urlBase64ToUint8Array('AQID')), [1, 2, 3]);
});

test('builds the backend subscription registration payload without local chat data', () => {
  const payload = buildSubscriptionRegistration(
    {
      endpoint: 'https://push.example/sub',
      keys: { p256dh: 'p256dh', auth: 'auth' }
    },
    'web',
    'browser-1'
  );

  assert.deepEqual(payload, {
    provider: 'web-push',
    endpoint: 'https://push.example/sub',
    keys: { p256dh: 'p256dh', auth: 'auth' },
    platform: 'web',
    deviceId: 'browser-1'
  });
});
