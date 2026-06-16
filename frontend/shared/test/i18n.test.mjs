import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_LANGUAGE, getText, languages } from '../dist/i18n.js';

test('defaults to Chinese and exposes language options', () => {
  assert.equal(DEFAULT_LANGUAGE, 'zh-CN');
  assert.deepEqual(languages, [
    { code: 'zh-CN', label: '中文' },
    { code: 'en-US', label: 'English' }
  ]);
});

test('returns Chinese and English text for shared keys', () => {
  assert.equal(getText('zh-CN', 'common.language'), '语言');
  assert.equal(getText('en-US', 'common.language'), 'Language');
  assert.equal(getText('zh-CN', 'admin.nav.users'), '用户目录');
  assert.equal(getText('en-US', 'admin.nav.users'), 'User Directory');
  assert.equal(getText('zh-CN', 'user.chat.send'), '发送');
  assert.equal(getText('en-US', 'user.chat.send'), 'Transmit');
});

test('falls back to Chinese text for unknown language', () => {
  assert.equal(getText('fr-FR', 'common.logout'), '退出');
});
