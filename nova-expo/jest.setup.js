/* eslint-env jest */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */

// Mock react-native-worklets
const mockWorklets = {
  createSerializable: (v) => v,
  isWorkletFunction: () => false,
  runOnUI: (fn) => fn,
  runOnJS: (fn) => fn,
  makeShareable: (v) => v,
  RuntimeKind: {
    ReactNative: 0,
    Web: 1,
  },
  Worklets: {
    createRunOnJS: (fn) => fn,
    createWorkletRuntime: () => ({}),
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
  },
  executeOnUIRuntimeSync: (fn) => fn,
  serializableMappingCache: new Map(),
};

jest.mock('react-native-worklets', () => mockWorklets, { virtual: true });

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return Reanimated;
}, { virtual: true });

// Mock @expo/vector-icons to prevent "act(...)" warnings and rendering issues
jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    Ionicons: View,
    MaterialIcons: View,
    FontAwesome: View,
    MaterialCommunityIcons: View,
    // Add other icon sets as needed
  };
}, { virtual: true });

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    SafeAreaProvider: ({ children }) => children,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: jest.fn().mockReturnValue(inset),
  };
});

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}), { virtual: true });

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn().mockReturnValue({}),
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    delete: jest.fn(),
    getString: jest.fn(),
    set: jest.fn(),
  })),
}), { virtual: true });
