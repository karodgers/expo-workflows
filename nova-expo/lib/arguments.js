const HELP_TEXT = `Usage: nova-expo [project-directory] [options]

Create a production-ready Expo project with the Nova dependency stack.
Run without a project directory for the beginner-friendly guided setup.

Options:
  --interactive          Run the guided setup even when a directory is provided
  --name <display-name>  App name shown on the device
  --package-name <name>  package.json name and Expo slug
  --app-id <identifier>  Android package and iOS bundle identifier
  --sdk <latest|major>   Expo SDK to use (default: latest stable)
  --exclude <package>    Omit an optional Nova package (repeatable)
  --add <package[@ver]>  Add a runtime npm package (repeatable)
  --add-dev <package>    Add a development npm package (repeatable)
  --skip-install         Create and configure without installing packages
  --skip-validation      Install packages without running the final checks
  -h, --help             Show this help
  -v, --version          Show the initializer version

Examples:
  nova-expo
  nova-expo my-app
  nova-expo ./apps/mobile --name "My App" --package-name my-app --app-id com.acme.myapp
  nova-expo my-app --sdk 57 --skip-validation
  npm create nova-expo-app@latest my-app
`;

function takeValue(argumentsList, index, flag) {
  const value = argumentsList[index + 1];

  if (!value || value.startsWith('-')) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function parseArguments(argumentsList) {
  const options = {
    appIdentifier: undefined,
    additionalDevPackages: [],
    additionalPackages: [],
    cancelled: false,
    displayName: undefined,
    excludedPackages: [],
    help: false,
    interactive: false,
    packageName: undefined,
    projectDirectory: undefined,
    sdk: 'latest',
    skipInstall: false,
    skipValidation: false,
    version: false,
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    switch (argument) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      case '--skip-install':
        options.skipInstall = true;
        break;
      case '--skip-validation':
        options.skipValidation = true;
        break;
      case '--interactive':
        options.interactive = true;
        break;
      case '--exclude':
        options.excludedPackages.push(takeValue(argumentsList, index, '--exclude'));
        index += 1;
        break;
      case '--add':
        options.additionalPackages.push(takeValue(argumentsList, index, '--add'));
        index += 1;
        break;
      case '--add-dev':
        options.additionalDevPackages.push(takeValue(argumentsList, index, '--add-dev'));
        index += 1;
        break;
      case '--name':
        options.displayName = takeValue(argumentsList, index, '--name');
        index += 1;
        break;
      case '--package-name':
      case '--slug':
        options.packageName = takeValue(argumentsList, index, argument);
        index += 1;
        break;
      case '--app-id':
      case '--package':
        options.appIdentifier = takeValue(argumentsList, index, argument);
        index += 1;
        break;
      case '--sdk':
        options.sdk = takeValue(argumentsList, index, '--sdk');
        index += 1;
        break;
      default:
        if (argument.startsWith('-')) {
          throw new Error(`Unknown option: ${argument}`);
        }

        if (options.projectDirectory) {
          throw new Error('Only one project directory can be provided.');
        }

        options.projectDirectory = argument;
    }
  }

  if (options.sdk !== 'latest' && !/^\d+$/.test(options.sdk)) {
    throw new Error('--sdk must be "latest" or a numeric SDK major, such as 57.');
  }

  return options;
}

module.exports = { HELP_TEXT, parseArguments };
