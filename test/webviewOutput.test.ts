import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendOutput, createOutputBuffer, MAX_OUTPUT_LINES } from '../src/webview/output';

test('splits streamed chunks into lines regardless of where a chunk ends', () => {
  const buffer = createOutputBuffer();
  appendOutput(buffer, 'first li');
  appendOutput(buffer, 'ne\nsecond line\r\nthird');
  assert.deepEqual(buffer.lines, ['first line', 'second line', 'third']);
});

test('a carriage return rewrites the line in progress like a progress meter', () => {
  const buffer = createOutputBuffer();
  appendOutput(buffer, 'progress 10%\rprogress 90%\rdone\n');
  assert.deepEqual(buffer.lines, ['done', '']);
});

test('keeps a bounded window of the most recent lines', () => {
  const buffer = createOutputBuffer();
  for (let index = 0; index < MAX_OUTPUT_LINES + 500; index += 1)
    appendOutput(buffer, `line ${index}\n`);
  assert.equal(buffer.lines.length, MAX_OUTPUT_LINES);
  assert.equal(buffer.lines[buffer.lines.length - 2], `line ${MAX_OUTPUT_LINES + 499}`);
});
