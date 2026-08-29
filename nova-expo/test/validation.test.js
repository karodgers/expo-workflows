const test = require('node:test');
const assert = require('node:assert/strict');

const { validateProject } = require('../lib/cli');

test('project creation validation does not make strict lint a success gate', () => {
  const source = validateProject.toString();
  assert.doesNotMatch(source, /lint:strict/);
  assert.match(source, /typecheck/);
  assert.match(source, /expo-doctor/);
});
