# Nova Expo Project Initializer

`nova-expo` creates a new Expo project from Expo's official TypeScript template,
adds the standard Nova dependencies and project structure, and verifies that the
result is compatible with the selected Expo SDK.

The default SDK is npm's current stable `expo` release. The initializer always
uses an explicit versioned Expo template (`blank-typescript@sdk-N`) so Expo SDK
transition periods cannot silently create an older project.

## Install globally

```sh
npm install --global create-nova-expo-app
```

Or scaffold a project without installing anything:

```sh
npm create nova-expo-app my-app
```

To work from a clone of this repository instead:

```sh
npm install
npm run validate
npm install --global .
```

For the beginner-friendly guided setup, run the root helper:

```sh
./setup-project.sh
```

You can also run the same guided setup from any directory by entering the
global command without arguments:

```sh
nova-expo
```

It asks for the project folder, display name, package name, Android/iOS app
identifier, and whether to run the complete validation suite.

Advanced users can provide everything directly:

```sh
nova-expo my-app \
  --name "My App" \
  --package-name my-app \
  --app-id com.acme.myapp
cd my-app
npm start
```

If the complete toolkit is installed, open the guided workflow assistant from
inside the generated project:

```sh
npm run workflow
```

For local development of the initializer, `npm link` is also supported:

```sh
npm link
nova-expo my-app
```

If the package is published to npm, it can be used without a global install:

```sh
npm create nova-expo-app@latest my-app
```

## Options

```text
--interactive          Run the guided setup
--name <display-name>  Set the app name shown on the device
--package-name <name>  Set the package.json name and Expo slug
--app-id <identifier>  Set the Android package and iOS bundle identifier
--sdk <latest|major>   Use the latest stable SDK or a specific SDK major
--skip-install         Scaffold files without installing dependencies
--skip-validation      Install and align packages without running the checks
```

Run `nova-expo --help` for the complete command reference.

## What gets created

- Expo Router with routes under `src/app`
- the exact direct dependency names in `template/dependencies.json`
- Expo-managed versions aligned by `npx expo install --fix`
- a deduplicated npm tree so each native module resolves to one version
- TypeScript strict mode and the `@/` to `src/` path alias
- ESLint, Prettier, Jest, Testing Library, Husky, and lint-staged
- the repository's engineering skills and modular project structure
- `eas.json` with development, simulator, preview, production, and APK profiles
- independently installable development, preview, and production app variants
- matching EAS environments/update channels and fingerprint runtime compatibility
- `.env.example` plus safe `.gitignore` defaults

The initializer does not use `--legacy-peer-deps`. A peer dependency conflict is
treated as a real failure that must be resolved in the dependency contract.
Generated Jest mocks remain valid when their corresponding optional packages
are not selected.

## Validation

Every normal initialization runs these checks before reporting success:

```sh
npx expo install --check
npx expo-doctor@latest
npm run typecheck
npm run format:check
npm test -- --runInBand
```

Strict lint remains available after creation through `npm run lint:strict`. The
generated project also exposes the full combined command:

```sh
npm run validate
```

## Maintaining the dependency contract

`template/dependencies.json` is the only list of direct app dependencies. To add
or remove a package, change that file and run an end-to-end scaffold test. Expo's
blank template supplies the selected SDK's versions for core packages; after
installation, Expo CLI corrects every SDK-managed package to the compatible
version and updates the generated lockfile.

Before publishing a new initializer version:

1. Run `npm run validate` in this repository.
2. Create a disposable project with `nova-expo <temporary-path>`.
3. Confirm the generated `package.json` contains only the contract's package
   names.
4. Commit contract changes and bump this package's version.
5. Run `npm pack --dry-run`, then publish through the normal release process.

## EAS

The generated `eas.json` keeps separate profiles for development devices, the
iOS simulator, internal previews, store production builds, and production APKs.
The guided setup writes the selected application identifier to both
`android.package` and `ios.bundleIdentifier`. EAS project ownership remains
project-specific and is intentionally left for `eas build:configure`.
