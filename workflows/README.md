# Expo Workflow Toolkit

One guided assistant plus small Bash entry points for Expo CLI and Expo
Application Services. Every script runs against any Expo project; nothing is
tied to `nova-expo`.

## Quick start

Install the assistant once from the toolkit repository:

```sh
./install.sh
```

Then use it from any Nova Expo project:

```sh
cd my-app
nova-workflows
```

The assistant asks what you want to do in plain language, discovers the project's
build profiles and cloud workflows, collects required values, and returns to the
menu after a failed or cancelled command. Preview commands without changing
anything with `run.sh --dry-run`.

In an interactive terminal, the assistant opens a full terminal UI with a project
dashboard, arrow-key navigation, styled forms, confirmations, and live task
output. Use ↑/↓ or `j`/`k`, Enter to select, and `q` to go back. It automatically
falls back to the numbered interface for piped input and CI:

```sh
nova-workflows --classic
nova-workflows --dry-run
nova-workflows gui              # Open this project in VS Code
```

The individual scripts below remain available for automation and experienced
users. Run one with `--help` for its actions. Arguments not consumed by the
wrapper are passed to Expo/EAS, so new CLI flags remain usable.

## Scripts

| Script | Area |
| --- | --- |
| `run.sh` | Guided workflow assistant (recommended) |
| `variants.sh` | Development/preview/production app variants |
| `workflow-templates.sh` | Nova CI/CD and Maestro recipes |
| `release-check.sh` | Production build/update/submission safety gate |
| `notifications.sh` | Notification code, credentials, and test pushes |
| `store.sh` | App-store metadata setup |
| `version.sh` | Toolkit/runtime versions and updates |
| `auth.sh` | Expo account login and status |
| `account.sh` | Account details, usage, and security audit |
| `project.sh` | Expo config, EAS linking, Build/Update setup |
| `doctor.sh` | SDK alignment, Expo Doctor, project validation |
| `dev.sh` | Metro, Expo Go, development clients, web |
| `native.sh` | Prebuild and local Android/iOS compilation |
| `build.sh` | EAS Build, build history, simulator installs, versions |
| `submit.sh` | EAS Submit and submission status |
| `update.sh` | OTA publishing, rollouts, rollback, update insights |
| `channels.sh` | EAS Update branches and channels |
| `deploy.sh` | Web export and EAS Hosting deployments |
| `env.sh` | EAS environment variables |
| `credentials.sh` | Android/iOS signing credentials |
| `metadata.sh` | App-store metadata sync |
| `fingerprint.sh` | Native runtime fingerprinting |
| `devices.sh` | Apple internal-distribution devices |
| `webhooks.sh` | Build and Submit webhooks |
| `workflow.sh` | Create, validate, run, and inspect EAS Workflows |
| `integrations.sh` | ASC, Convex, PostHog, and Supabase integrations |
| `observe.sh` | EAS application observability |
| `sim.sh` | EAS cloud simulators |
| `testflight.sh` | TestFlight crashes and tester feedback |
| `upload.sh` | Shareable local build uploads |
| `expo.sh`, `eas.sh` | Raw CLI passthrough for future commands |

## Dynamic configuration

All scripts accept `--project`, `--dry-run`, `--non-interactive`, and
`--interactive`. These environment variables avoid repeating common flags:

```sh
EXPO_PROJECT_DIR=./my-app
EXPO_PLATFORM=android            # android, ios, or all where supported
EAS_PROFILE=preview              # build/submit profile
EAS_ENVIRONMENT=preview          # EAS environment variable environment
EAS_UPDATE_CHANNEL=preview
EAS_UPDATE_MESSAGE="Release notes"
EAS_CLI_VERSION=^22.2.0          # overrides the pinned EAS CLI range
EXPO_DOCTOR_VERSION=^1.20.3      # overrides the pinned Expo Doctor range
```

The runtime prefers project-local CLIs, then a global `eas`, then downloads the
selected EAS CLI through `npx`. Downloaded tools default to the ranges pinned in
`nova.pinned` so an unattended run never installs a newly published major. Set `EXPO_TOKEN` in CI; do not place tokens in a
script. `CI=1` automatically enables non-interactive mode where supported.

## EAS Workflows

Cloud workflow files belong in the target app's `.eas/workflows/` directory:

```sh
./workflows/workflow.sh create --project ./my-app --template build
./workflows/workflow.sh validate --project ./my-app build.yml
./workflows/workflow.sh run --project ./my-app build.yml --wait
```

The guided setup can install five maintained recipes into the project:

- validation on pushes and pull requests;
- fingerprint-aware preview builds;
- pull-request preview updates;
- Android Maestro end-to-end tests;
- production builds/submissions or an OTA update when compatible builds exist.

## Production safety

Production actions in the assistant run a release gate first. It checks application
identifiers, profiles, environments, update channels, dependency alignment, Expo
Doctor, metadata, git state, and fingerprint runtime compatibility. Production
updates offer a staged 10%, 25%, or full rollout and a guided rollback.

Run a deeper local check manually with:

```sh
nova-workflows
# Release or publish the app → Check production readiness
```

## Updates

```sh
nova-workflows --version
nova-workflows update
```

`update` installs `nova-expo-workflows@latest` from npm. During local development,
set `NOVA_WORKFLOWS_UPDATE_SOURCE=/path/to/expo-toolkit/workflows` to reinstall the
working copy instead.

## Validation

```sh
./workflows/test/run.sh
```

References: [EAS CLI](https://docs.expo.dev/eas/cli/),
[EAS Workflows](https://docs.expo.dev/eas/workflows/introduction/),
[EAS Update](https://docs.expo.dev/eas-update/introduction/), and
[EAS Hosting](https://docs.expo.dev/deploy/web/).
