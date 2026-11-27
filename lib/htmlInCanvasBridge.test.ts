import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHtmlInCanvasSupport } from './htmlInCanvasBridge.ts';

test('reports supported when desktop browser exposes drawElementImage and requestPaint', () => {
  const caps = evaluateHtmlInCanvasSupport({
    hasDocument: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/157.0.0.0 Safari/537.36',
    platform: 'macOS',
    hasDrawElementImage: true,
    hasRequestPaint: true,
  });

  assert.equal(caps.supported, true);
  assert.equal(caps.reason, 'supported');
  assert.equal(caps.isAndroidBlocked, false);
});

test('falls back cleanly on Android devices even if experimental methods exist', () => {
  const caps = evaluateHtmlInCanvasSupport({
    hasDocument: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/157.0.0.0 Mobile Safari/537.36',
    platform: 'Android',
    hasDrawElementImage: true,
    hasRequestPaint: true,
  });

  assert.equal(caps.supported, false);
  assert.equal(caps.reason, 'android-fallback');
  assert.equal(caps.isAndroidBlocked, true);
});

test('reports api-unavailable on standard browsers lacking html-in-canvas', () => {
  const caps = evaluateHtmlInCanvasSupport({
    hasDocument: true,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/134.0.0.0 Safari/537.36',
    platform: 'Linux',
    hasDrawElementImage: false,
    hasRequestPaint: false,
  });

  assert.equal(caps.supported, false);
  assert.equal(caps.reason, 'api-unavailable');
});

test('reports ssr safely when document is unavailable', () => {
  const caps = evaluateHtmlInCanvasSupport({
    hasDocument: false,
    userAgent: '',
    hasDrawElementImage: false,
    hasRequestPaint: false,
  });

  assert.equal(caps.supported, false);
  assert.equal(caps.reason, 'ssr');
});
