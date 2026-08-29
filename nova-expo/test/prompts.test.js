const test = require('node:test');
const assert = require('node:assert/strict');

const { askYesNo } = require('../lib/prompts');

function fakeReadline(answer) {
  return { question: async () => answer };
}

test('yes/no prompts accept the default on Enter', async () => {
  assert.equal(await askYesNo(fakeReadline(''), 'Continue', true), true);
  assert.equal(await askYesNo(fakeReadline(''), 'Continue', false), false);
});

test('yes/no prompts understand full answers', async () => {
  assert.equal(await askYesNo(fakeReadline('yes'), 'Continue'), true);
  assert.equal(await askYesNo(fakeReadline('no'), 'Continue'), false);
});
