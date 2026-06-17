import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');

test('Expo config only lists packages that expose config plugins', () => {
  const config = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));

  assert.deepEqual(config.expo.plugins, ['expo-router', 'expo-notifications']);
});
