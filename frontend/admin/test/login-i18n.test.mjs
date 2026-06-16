import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Login from '../.tmp-test/Login.js';
import { createTranslator, DEFAULT_LANGUAGE } from 'shared';

test('admin login screen exposes language choices before authentication', () => {
  const html = renderToStaticMarkup(
    React.createElement(Login, {
      onLogin: () => undefined,
      error: null,
      t: createTranslator(DEFAULT_LANGUAGE),
      language: DEFAULT_LANGUAGE,
      onLanguageChange: () => undefined,
    })
  );

  assert.match(html, /语言/);
  assert.match(html, /中文/);
  assert.match(html, /English/);
});
