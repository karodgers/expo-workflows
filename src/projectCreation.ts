import * as path from 'node:path';

export interface OptionalPackage {
  name: string;
  label: string;
  description: string;
  category: string;
  selected: boolean;
}

export type CreationFailureKind = 'validation' | 'setup' | 'creation';

export function classifyCreationFailure(
  targetExists: boolean,
  manifestExists: boolean,
  output: string,
): CreationFailureKind {
  if (manifestExists && output.includes('Validate the finished project')) return 'validation';
  return targetExists ? 'setup' : 'creation';
}

export const OPTIONAL_PACKAGES: OptionalPackage[] = [
  {
    name: '@expo/vector-icons',
    label: 'Expo Vector Icons',
    description: 'Ready-to-use icon families for native interfaces',
    category: 'UI',
    selected: false,
  },
  {
    name: '@hookform/resolvers',
    label: 'Hook Form Resolvers',
    description: 'Connect schema validation to React Hook Form',
    category: 'Forms',
    selected: false,
  },
  {
    name: '@react-native-community/netinfo',
    label: 'Network Info',
    description: 'Connectivity state and connection details',
    category: 'Device',
    selected: false,
  },
  {
    name: '@react-native-google-signin/google-signin',
    label: 'Google Sign-In',
    description: 'Native Google authentication',
    category: 'Authentication',
    selected: false,
  },
  {
    name: '@shopify/flash-list',
    label: 'FlashList',
    description: 'High-performance lists for large datasets',
    category: 'UI',
    selected: false,
  },
  {
    name: '@tanstack/react-query',
    label: 'TanStack Query',
    description: 'Server-state fetching, caching, and mutations',
    category: 'Data',
    selected: false,
  },
  {
    name: 'axios',
    label: 'Axios',
    description: 'HTTP client with interceptors and request helpers',
    category: 'Data',
    selected: false,
  },
  {
    name: 'expo-dev-client',
    label: 'Expo Dev Client',
    description: 'Custom development builds with native modules',
    category: 'Development',
    selected: false,
  },
  {
    name: 'expo-device',
    label: 'Expo Device',
    description: 'Read physical device information',
    category: 'Device',
    selected: false,
  },
  {
    name: 'expo-font',
    label: 'Expo Font',
    description: 'Load and manage custom fonts',
    category: 'UI',
    selected: false,
  },
  {
    name: 'expo-image',
    label: 'Expo Image',
    description: 'Performant image rendering and caching',
    category: 'UI',
    selected: false,
  },
  {
    name: 'expo-image-picker',
    label: 'Image Picker',
    description: 'Select images and videos from the device',
    category: 'Device',
    selected: false,
  },
  {
    name: 'expo-local-authentication',
    label: 'Local Authentication',
    description: 'Face ID, Touch ID, and device biometrics',
    category: 'Authentication',
    selected: false,
  },
  {
    name: 'expo-notifications',
    label: 'Expo Notifications',
    description: 'Local and push notification support',
    category: 'Device',
    selected: false,
  },
  {
    name: 'expo-secure-store',
    label: 'Secure Store',
    description: 'Encrypted key-value storage for credentials',
    category: 'Storage',
    selected: false,
  },
  {
    name: 'expo-splash-screen',
    label: 'Splash Screen',
    description: 'Control the native launch screen',
    category: 'UI',
    selected: false,
  },
  {
    name: 'lottie-react-native',
    label: 'Lottie',
    description: 'Render lightweight vector animations',
    category: 'UI',
    selected: false,
  },
  {
    name: 'react-hook-form',
    label: 'React Hook Form',
    description: 'Performant form state and validation',
    category: 'Forms',
    selected: false,
  },
  {
    name: 'react-native-gesture-handler',
    label: 'Gesture Handler',
    description: 'Native-driven touch and gesture handling',
    category: 'UI',
    selected: false,
  },
  {
    name: 'react-native-mmkv',
    label: 'MMKV',
    description: 'Fast on-device key-value storage',
    category: 'Storage',
    selected: false,
  },
  {
    name: 'react-native-reanimated',
    label: 'Reanimated',
    description: 'Native-thread animations and interactions',
    category: 'UI',
    selected: false,
  },
  {
    name: 'react-native-worklets',
    label: 'Worklets',
    description: 'Run JavaScript worklets on dedicated runtimes',
    category: 'UI',
    selected: false,
  },
  {
    name: 'zod',
    label: 'Zod',
    description: 'TypeScript-first schema validation',
    category: 'Forms',
    selected: false,
  },
  {
    name: 'zustand',
    label: 'Zustand',
    description: 'Small, composable client-state management',
    category: 'State',
    selected: false,
  },
];

export function toPackageName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toDisplayName(value: string): string {
  return path
    .basename(value)
    .replace(/[-_.]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function toDefaultAppIdentifier(packageName: string): string {
  let suffix = packageName.replace(/[^a-z0-9]/g, '');
  if (!/^[a-z]/.test(suffix)) suffix = `app${suffix}`;
  return `com.example.${suffix || 'app'}`;
}

export function validateProjectFolderName(value: string): string | undefined {
  if (!value.trim()) return 'Enter a project folder name.';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) {
    return 'Use letters, numbers, dots, underscores, or hyphens; start with a letter or number.';
  }
  if (value.endsWith('.')) return 'The project folder cannot end with a dot.';
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)) {
    return 'Choose a folder name that is valid on Windows, macOS, and Linux.';
  }
  return undefined;
}

/**
 * Values collected from a prompt are appended to a command line, where a
 * leading dash would be parsed as an option by the workflow runtime or the
 * underlying CLI instead of as the value the user typed.
 */
export function validateCommandValue(value: string): string | undefined {
  return value.startsWith('-') ? 'Values cannot start with a dash.' : undefined;
}

export function validateDisplayName(value: string): string | undefined {
  if (!value.trim()) return 'Enter the app name shown on the device.';
  if (value.trim().length > 50) return 'Keep the display name to 50 characters or fewer.';
  return validateCommandValue(value);
}

export function validatePackageName(value: string): string | undefined {
  if (value.length > 214) return 'Keep the package name to 214 characters or fewer.';
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? undefined
    : 'Use lowercase letters, numbers, and single hyphens only.';
}

export function validateAppIdentifier(value: string): string | undefined {
  return /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/.test(value)
    ? undefined
    : 'Use lowercase reverse-domain format with letters and numbers, such as com.yourcompany.myapp.';
}

export function parseAdditionalPackages(value: string): { packages: string[]; error?: string } {
  const entries = value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const packages: string[] = [];
  for (const entry of entries) {
    const scoped = entry.startsWith('@');
    const separator = entry.lastIndexOf('@');
    const hasVersion = separator > (scoped ? entry.indexOf('/') : 0);
    const name = hasVersion ? entry.slice(0, separator) : entry;
    const version = hasVersion ? entry.slice(separator + 1) : undefined;
    if (!/^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/.test(name)) {
      return { packages: [], error: `“${entry}” is not a valid npm package name.` };
    }
    if (version !== undefined && !version) {
      return { packages: [], error: `“${entry}” is missing a package version.` };
    }
    if (!packages.includes(entry)) packages.push(entry);
  }
  return { packages };
}
