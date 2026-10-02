import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTextureRepeat } from '../lib/texture-scale.mjs';

void test('calculates independent U/V repeats from real-world centimeters', () => {
  const repeat = calculateTextureRepeat({
    productWidthCm: 200,
    productLengthCm: 230,
    patchWidthCm: 9,
    patchLengthCm: 9,
  });
  assert.ok(Math.abs(repeat[0] - 22.2222222222) < 1e-9);
  assert.ok(Math.abs(repeat[1] - 25.5555555556) < 1e-9);
});

void test('rejects dimensions that cannot represent a physical scale', () => {
  assert.throws(() => calculateTextureRepeat({
    productWidthCm: 200,
    productLengthCm: 230,
    patchWidthCm: 0,
    patchLengthCm: 9,
  }), RangeError);
});
