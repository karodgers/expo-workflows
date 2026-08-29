#!/usr/bin/env node

const { runCli } = require('../lib/cli');

runCli(process.argv.slice(2)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`\n  Error: ${message}\n\n`);
  process.exitCode = 1;
});
