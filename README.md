# Nova Expo for VS Code

Nova Expo turns the Expo and EAS release lifecycle into an organized VS Code
workflow. Use the Activity Bar dashboard to move from local development through
builds, updates, store submission, and production checks without memorizing CLI
commands.

## What the dashboard provides

- guided Nova Expo project creation with SDK, package, and validation choices;
- automatic Expo project discovery at the workspace root and in monorepos;
- an always-available project switcher for workspace apps or another folder;
- guided development, build, update, submit, and release-readiness flows;
- build profiles and project configuration at a glance;
- more than 40 searchable workflows grouped by purpose;
- cancellable live output for deterministic tasks;
- real integrated terminals for login, credentials, and other interactive EAS
  workflows;
- confirmation before project-changing or remote release operations;
- retained task output and stop controls for persistent development processes;
- context-aware failure recovery links in notifications and retained task
  output;
- guided next-step notices for dependency installation and EAS onboarding.
- a retained Open Project action when the new-project workflow completes.

Open the **Nova Expo** icon in the Activity Bar. The extension finds every local
`package.json` that declares `expo`, excluding generated and dependency folders.

## Requirements

- VS Code 1.94 or newer;
- an Expo project with Node.js and its dependencies installed;
- Bash on macOS or Linux. On Windows, set `novaExpo.shellPath` to a compatible
  Git Bash or WSL shell;
- an Expo account for EAS cloud operations.

The maintained workflow scripts are bundled with the extension. A separate
toolkit installation is not required.

## Settings

- `novaExpo.toolkitPath`: optional local `workflows` directory override;
- `novaExpo.shellPath`: Bash-compatible shell used for workflow execution.
- `novaExpo.nodePath`: Node.js 22.13+ executable used to create new projects.

Dashboard tasks run deterministically without prompts. Tasks that require a TTY
always open in VS Code's integrated terminal.

Nova Expo runs no command in an untrusted or virtual workspace. In an untrusted
workspace the dashboard still reads the project configuration and explains what
trusting the workspace unlocks.

The maintained execution and validation policy is included in
`FAILURE-MODES.md`.

## Local development

```sh
npm install
npm test
npm run watch
```

The extension host code in `src/` and the dashboard webview in `src/webview/`
are bundled separately, type-checked against different libraries, and share only
the message contract in `src/webviewProtocol.ts`. `npm test` type-checks both
before running the unit tests.

Press **F5** to launch an Extension Development Host. To create an installable
build, run `npm run package` and then package the directory with `@vscode/vsce`.

## Privacy

The extension does not collect telemetry. Commands execute locally against the
active project; Expo and EAS commands communicate with their normal services.

## License

MIT
