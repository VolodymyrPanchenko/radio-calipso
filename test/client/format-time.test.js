const test = require('node:test');
const assert = require('node:assert/strict');
const { formatTime } = require('../../public/format-time');

test('formats whole minutes and seconds', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(600), '10:00');
});

test('pads single-digit seconds', () => {
  assert.equal(formatTime(61), '1:01');
});

test('returns 0:00 for non-finite or negative input', () => {
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatTime(Infinity), '0:00');
  assert.equal(formatTime(-5), '0:00');
});
