const fs = require('node:fs');
const path = require('node:path');

const DIRECTORIES = [
  'src/app/(auth)',
  'src/app/(tabs)',
  'src/app/(screens)',
  'src/app/(modals)',
  'src/components/common',
  'src/components/ui',
  'src/components/layout',
  'src/components/forms',
  'src/components/modals',
  'src/components/home',
  'src/hooks',
  'src/store',
  'src/services/api',
  'src/services/auth',
  'src/services/storage',
  'src/services/notifications',
  'src/services/analytics',
  'src/utils',
  'src/constants',
  'src/types',
  'src/config',
  'src/errors',
  'src/assets/fonts',
  'src/assets/images',
  'src/assets/icons',
  'src/assets/animations',
  '__tests__',
];

const GENERATED_FILES = {
  '.env.example': `# Copy this file to .env and provide local values.
EXPO_PUBLIC_API_URL=https://api.example.com
`,
  'babel.config.js': `module.exports = function babelConfig(api) {
  api.cache(true);

  const plugins = [];
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
`,
  'tsconfig.eslint.json': `{
  "extends": "./tsconfig.json",
  "include": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  "exclude": ["node_modules", "dist", "build", ".expo"]
}
`,
  'src/app/_layout.tsx': `import type { ReactElement } from 'react';

import { Stack } from 'expo-router';

const RootLayout = (): ReactElement => {
  return <Stack />;
};

export default RootLayout;
`,
  'src/app/index.tsx': `import type { ReactElement } from 'react';

import { HomeScreen } from '@/components/home';

const HomeRoute = (): ReactElement => {
  return <HomeScreen />;
};

export default HomeRoute;
`,
  'src/constants/theme.ts': `import { Platform } from 'react-native';

export interface ColorRoles {
  background: string;
  onBackground: string;
}

const iosLight: ColorRoles = { background: '#ffffff', onBackground: '#000000' };
const iosDark: ColorRoles = { background: '#000000', onBackground: '#ffffff' };
const androidLight: ColorRoles = { background: '#fffbfe', onBackground: '#1c1b1f' };
const androidDark: ColorRoles = { background: '#141218', onBackground: '#e6e0e9' };

export const colorSchemes = Platform.select({
  ios: { light: iosLight, dark: iosDark },
  default: { light: androidLight, dark: androidDark },
});

export const spacing = { md: 16, lg: 24 } as const;

export const typography = Platform.select({
  ios: { title: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const } },
  default: { title: { fontSize: 22, lineHeight: 28, fontWeight: '400' as const } },
});
`,
  'src/hooks/use-theme.ts': `import { useColorScheme } from 'react-native';

import { colorSchemes, type ColorRoles } from '@/constants/theme';

export function useTheme(): ColorRoles {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? colorSchemes.dark : colorSchemes.light;
}
`,
  'src/components/common/index.ts': `export { AppText } from './app-text';
`,
  'src/components/common/app-text.tsx': `import type { ReactElement, ReactNode } from 'react';

import { StyleSheet, Text, type TextProps } from 'react-native';

import { colorSchemes, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface AppTextProps extends TextProps {
  children: ReactNode;
}

export const AppText = ({ children, style, ...props }: AppTextProps): ReactElement => {
  const colors = useTheme();
  const colorStyle = colors === colorSchemes.dark ? styles.dark : styles.light;

  return (
    <Text {...props} style={[styles.text, colorStyle, style]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  dark: { color: colorSchemes.dark.onBackground },
  light: { color: colorSchemes.light.onBackground },
  text: typography.title,
});
`,
  'src/components/home/index.ts': `export { HomeScreen } from './home-screen';
`,
  'src/components/home/home-screen.tsx': `import type { ReactElement } from 'react';

import { StyleSheet, View } from 'react-native';

import { StatusBar } from 'expo-status-bar';

import { AppText } from '@/components/common';
import { colorSchemes, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const HomeScreen = (): ReactElement => {
  const colors = useTheme();
  const colorStyle = colors === colorSchemes.dark ? styles.dark : styles.light;

  return (
    <View style={[styles.container, colorStyle]} testID="home-screen">
      <AppText>Your Expo project is ready.</AppText>
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dark: { backgroundColor: colorSchemes.dark.background },
  light: { backgroundColor: colorSchemes.light.background },
});
`,
  'src/components/home/home-screen.test.tsx': `import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from './home-screen';

describe('HomeScreen', () => {
  it('renders the project-ready message', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Your Expo project is ready.')).toBeOnTheScreen();
  });
});
`,
};

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, { recursive: true });
}

function copyTemplateFiles(packageRoot, projectDirectory) {
  const fileMappings = {
    'CLAUDE.md': 'CLAUDE.md',
    'eas.json': 'eas.json',
    'eslintignore': '.eslintignore',
    'eslintrc.js': '.eslintrc.js',
    'jest.config.js': 'jest.config.js',
    'jest.setup.js': 'jest.setup.js',
    'prettierignore': '.prettierignore',
    'prettierrc.js': '.prettierrc.js',
  };

  for (const [sourceName, destinationName] of Object.entries(fileMappings)) {
    fs.copyFileSync(
      path.join(packageRoot, sourceName),
      path.join(projectDirectory, destinationName),
    );
  }

  copyDirectory(path.join(packageRoot, 'husky'), path.join(projectDirectory, '.husky'));
  copyDirectory(path.join(packageRoot, 'scripts'), path.join(projectDirectory, 'scripts'));
  copyDirectory(path.join(packageRoot, 'skills'), path.join(projectDirectory, 'skills'));
}

function createDirectories(projectDirectory) {
  for (const directory of DIRECTORIES) {
    const absoluteDirectory = path.join(projectDirectory, directory);
    fs.mkdirSync(absoluteDirectory, { recursive: true });

    if (!directory.includes('components/home') && !directory.startsWith('src/app')) {
      fs.writeFileSync(path.join(absoluteDirectory, '.gitkeep'), '');
    }
  }
}

function createGeneratedFiles(projectDirectory) {
  for (const [relativePath, contents] of Object.entries(GENERATED_FILES)) {
    const destination = path.join(projectDirectory, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, contents);
  }
}

function updateAppConfig(projectDirectory, projectOptions) {
  const appConfigPath = path.join(projectDirectory, 'app.json');
  const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
  const expo = appConfig.expo;

  expo.name = projectOptions.displayName;
  expo.slug = projectOptions.packageName;
  expo.scheme = expo.slug.replace(/[^a-z0-9]/gi, '').toLowerCase();
  expo.userInterfaceStyle = 'automatic';
  if (projectOptions.appIdentifier) {
    expo.android = expo.android || {};
    expo.android.package = projectOptions.appIdentifier;
    expo.ios = expo.ios || {};
    expo.ios.bundleIdentifier = projectOptions.appIdentifier;
  }
  const selectedPackages = new Set(projectOptions.packageNames || []);
  expo.plugins = ['expo-router'];
  for (const plugin of [
    'expo-secure-store',
    'expo-local-authentication',
    'expo-notifications',
    'expo-image-picker',
    '@react-native-google-signin/google-signin',
  ]) {
    if (selectedPackages.has(plugin)) expo.plugins.push(plugin);
  }
  if (selectedPackages.has('expo-splash-screen')) {
    expo.plugins.push([
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        image: './assets/splash-icon.png',
        imageWidth: 100,
      },
    ]);
  }
  expo.experiments = { typedRoutes: true };

  fs.writeFileSync(appConfigPath, `${JSON.stringify(appConfig, null, 2)}\n`);

  const baseScheme = expo.scheme;
  const productionId = projectOptions.appIdentifier;
  if (productionId) {
    const variants = {
      development: {
        name: `${projectOptions.displayName} (Dev)`,
        appIdentifier: `${productionId}.dev`,
        scheme: `${baseScheme}dev`,
      },
      preview: {
        name: `${projectOptions.displayName} (Preview)`,
        appIdentifier: `${productionId}.preview`,
        scheme: `${baseScheme}preview`,
      },
      production: {
        name: projectOptions.displayName,
        appIdentifier: productionId,
        scheme: baseScheme,
      },
    };
    const dynamicConfig = `// Generated by Nova Expo Workflow Toolkit
const variants = ${JSON.stringify(variants, null, 2)};

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT || 'production';
  const selected = variants[variant] || variants.production;
  const baseExpo = config;

  return {
    ...baseExpo,
    name: selected.name,
    scheme: selected.scheme,
    runtimeVersion: baseExpo.runtimeVersion || { policy: 'fingerprint' },
    android: { ...(baseExpo.android || {}), package: selected.appIdentifier },
    ios: { ...(baseExpo.ios || {}), bundleIdentifier: selected.appIdentifier },
    extra: { ...(baseExpo.extra || {}), novaVariant: variant },
  };
};
`;
    fs.writeFileSync(path.join(projectDirectory, 'app.config.js'), dynamicConfig);
  }
}

function updateGitignore(projectDirectory) {
  const gitignorePath = path.join(projectDirectory, '.gitignore');
  const existing = fs.readFileSync(gitignorePath, 'utf8').trimEnd();
  const extras = `

# Environment variables
.env
.env.local
.env.*.local

# Tests and logs
coverage/
*.log
npm-debug.log*

# macOS
.DS_Store
`;

  fs.writeFileSync(gitignorePath, `${existing}${extras}`);
}

function updateTypeScriptConfig(projectDirectory) {
  const tsconfigPath = path.join(projectDirectory, 'tsconfig.json');
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

  tsconfig.compilerOptions = {
    ...tsconfig.compilerOptions,
    strict: true,
    noUncheckedIndexedAccess: true,
    noImplicitReturns: true,
    paths: { '@/*': ['./src/*'] },
    types: ['jest'],
  };
  tsconfig.include = ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'];

  fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
}

function removeBlankTemplateEntryPoints(projectDirectory) {
  for (const filename of ['App.tsx', 'index.ts']) {
    const target = path.join(projectDirectory, filename);
    if (fs.existsSync(target)) {
      fs.rmSync(target);
    }
  }
}

function configureProjectFiles(packageRoot, projectDirectory, projectOptions) {
  removeBlankTemplateEntryPoints(projectDirectory);
  copyTemplateFiles(packageRoot, projectDirectory);
  createDirectories(projectDirectory);
  createGeneratedFiles(projectDirectory);
  updateAppConfig(projectDirectory, projectOptions);
  updateGitignore(projectDirectory);
  updateTypeScriptConfig(projectDirectory);
}

module.exports = { configureProjectFiles, updateAppConfig };
