import test from 'node:test';
import assert from 'node:assert/strict';
import { computeClothAudioParams } from './audioEngine.ts';

test('muted state silences all audio gains completely', () => {
  const params = computeClothAudioParams({
    pointerSpeed: 2.5,
    isHovering: true,
    isDragging: true,
    glitchEnergy: 1.0,
    touchU: 0.8,
    displacement: 0.9,
    muted: true,
  });

  assert.equal(params.masterGain, 0);
  assert.equal(params.swishGain, 0);
  assert.equal(params.neonHumGain, 0);
  assert.equal(params.neonBuzzGain, 0);
});

test('idle unmuted bathroom keeps gentle neon hum floor with zero fabric swish', () => {
  const idle = computeClothAudioParams({
    pointerSpeed: 0,
    isHovering: false,
    isDragging: false,
    glitchEnergy: 0,
    touchU: 0.5,
    displacement: 0.05,
    muted: false,
  });

  assert.equal(idle.swishGain, 0);
  assert.ok(idle.neonHumGain > 0 && idle.neonHumGain <= 0.03, `Expected subtle hum floor, got ${idle.neonHumGain}`);
  assert.equal(idle.neonBuzzGain, 0);
  assert.equal(idle.swishPan, 0);
});

test('fast mouse brushing and dragging ramps fabric swish, sweeps filter higher, pans, and boosts neon buzz', () => {
  const slowBrush = computeClothAudioParams({
    pointerSpeed: 0.3,
    isHovering: true,
    isDragging: false,
    glitchEnergy: 0.2,
    touchU: 0.15,
    displacement: 0.12,
    muted: false,
  });

  const fastDrag = computeClothAudioParams({
    pointerSpeed: 2.0,
    isHovering: true,
    isDragging: true,
    glitchEnergy: 0.95,
    touchU: 0.85,
    displacement: 0.5,
    muted: false,
  });

  assert.ok(slowBrush.swishGain > 0);
  assert.ok(fastDrag.swishGain > slowBrush.swishGain, 'Fast drag should produce louder swish than slow brush');
  assert.ok(fastDrag.swishFilterFreq > slowBrush.swishFilterFreq, 'Fast drag should sweep bandpass filter higher');
  assert.ok(slowBrush.swishPan < 0, 'Left-side touch should pan slightly left');
  assert.ok(fastDrag.swishPan > 0, 'Right-side touch should pan slightly right');
  assert.ok(fastDrag.neonHumGain > slowBrush.neonHumGain, 'High glitch/drag should swell neon hum');
  assert.ok(fastDrag.neonBuzzGain > slowBrush.neonBuzzGain, 'High glitch/drag should swell neon electric buzz');
  assert.ok(fastDrag.neonDetuneCents > slowBrush.neonDetuneCents, 'Glitch should introduce subtle neon pitch shimmer');
});

test('clamps extreme and non-finite telemetry values safely without NaN', () => {
  const params = computeClothAudioParams({
    pointerSpeed: Number.NaN,
    isHovering: true,
    isDragging: true,
    glitchEnergy: 999,
    touchU: -50,
    displacement: Number.POSITIVE_INFINITY,
    muted: false,
  });

  for (const [key, value] of Object.entries(params)) {
    assert.ok(Number.isFinite(value), `Expected ${key} to be finite, got ${value}`);
  }
  assert.ok(params.swishGain <= 0.18);
  assert.ok(params.neonHumGain <= 0.088);
  assert.ok(params.swishPan >= -0.55 && params.swishPan <= 0.55);
});
