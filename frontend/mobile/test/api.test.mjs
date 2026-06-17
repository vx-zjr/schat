import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SchatMobileApiClient } from '../.tmp-test/api.js';
import { buildNativePushRegistration, shouldAttemptNativePushRegistration } from '../.tmp-test/notifications.js';

test('mobile API client keeps tokens in memory and clears them on logout', () => {
  const client = new SchatMobileApiClient('http://127.0.0.1:3000');

  client.setTokens('access-token', 'refresh-token');
  assert.equal(client.getAccessToken(), 'access-token');
  assert.equal(client.getRefreshToken(), 'refresh-token');

  client.clearTokens();
  assert.equal(client.getAccessToken(), null);
  assert.equal(client.getRefreshToken(), null);
});

test('mobile API client refreshes access tokens in memory and retries once on 401', async () => {
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), authorization: new Headers(init.headers).get('Authorization'), body: init.body });
    if (String(url).endsWith('/user/conversations') && requests.length === 1) {
      return jsonResponse({ message: 'expired' }, 401);
    }
    if (String(url).endsWith('/auth/refresh')) {
      return jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    }
    return jsonResponse([{ id: 'conversation-1' }]);
  };
  const client = new SchatMobileApiClient('http://127.0.0.1:3000');
  client.setTokens('old-access', 'old-refresh');

  const conversations = await client.get('/user/conversations');

  assert.deepEqual(conversations, [{ id: 'conversation-1' }]);
  assert.equal(client.getAccessToken(), 'new-access');
  assert.equal(client.getRefreshToken(), 'new-refresh');
  assert.deepEqual(requests.map((request) => request.authorization), [
    'Bearer old-access',
    null,
    'Bearer new-access'
  ]);
  assert.equal(JSON.parse(requests[1].body).refreshToken, 'old-refresh');
});

test('native push registration maps platform tokens to backend providers without message content', () => {
  assert.deepEqual(buildNativePushRegistration('ios', 'apns-token', 'device-1'), {
    provider: 'apns',
    endpoint: 'apns-token',
    platform: 'ios',
    deviceId: 'device-1'
  });

  assert.deepEqual(buildNativePushRegistration('android', 'fcm-token', 'device-2'), {
    provider: 'fcm',
    endpoint: 'fcm-token',
    platform: 'android',
    deviceId: 'device-2'
  });
});

test('native push registration is opt-in for Expo Go emulator debugging', () => {
  assert.equal(shouldAttemptNativePushRegistration(undefined), false);
  assert.equal(shouldAttemptNativePushRegistration('false'), false);
  assert.equal(shouldAttemptNativePushRegistration('true'), true);
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
