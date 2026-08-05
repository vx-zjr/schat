import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyTheme,
  readLanguage,
  readTheme,
  writeLanguage,
  writeTheme
} from '../dist/preferences.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

test('defaults language and follows system theme before persisting choices', () => {
  const storage = createMemoryStorage();
  assert.equal(readLanguage(storage), 'zh-CN');
  assert.equal(readTheme(storage, true), 'dark');
  writeLanguage(storage, 'en-US');
  writeTheme(storage, 'light');
  assert.equal(readLanguage(storage), 'en-US');
  assert.equal(readTheme(storage, true), 'light');
});

test('applies the selected theme to the document root contract', () => {
  const root = { dataset: {}, style: {} };

  applyTheme(root, 'dark');

  assert.equal(root.dataset.theme, 'dark');
  assert.equal(root.style.colorScheme, 'dark');
});
