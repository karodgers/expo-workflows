#!/usr/bin/env node

function parseArguments(argumentsList) {
  const options = {};
  for (let index = 0; index < argumentsList.length; index += 1) {
    const key = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Invalid argument: ${key || '(missing)'}`);
    options[key.slice(2)] = value;
    index += 1;
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!options.token || !options.title || !options.body) {
    throw new Error('--token, --title, and --body are required');
  }
  if (!/^Expo(nent)?PushToken\[.+\]$/.test(options.token)) {
    throw new Error('The token does not look like an Expo push token');
  }
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: options.token, title: options.title, body: options.body }),
  });
  const result = await response.json();
  if (!response.ok || result?.data?.status === 'error') {
    throw new Error(result?.data?.message || `Expo Push Service returned HTTP ${response.status}`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exitCode = 1;
});
