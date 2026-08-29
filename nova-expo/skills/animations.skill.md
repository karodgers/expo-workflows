# Skill: Animations — Motion + React Native Reanimated

## Principles
- Screen transitions are the platform's native-stack defaults — never re-animate navigation.
- In-screen choreography: springs feel right on both platforms; the M3 easing tokens below are for Android-flavored moments (see design-system.skill.md for the platform-adaptive rule).
- All animations via `react-native-reanimated` v4 (worklets run via `react-native-worklets`) — never `Animated` API.
- Gestures via `react-native-gesture-handler` v2 `Gesture` API + `GestureDetector` — never `PanResponder`, never the removed `useAnimatedGestureHandler`.
- Motion must feel intentional: enter, exit, transition, feedback.
- Prefer spring over timing for UI interactions — springs feel physical.

## M3 Motion Tokens
```ts
// constants/motion.ts
export const motion = {
  // Durations (ms)
  duration: {
    short1: 50,   short2: 100,  short3: 150,  short4: 200,
    medium1: 250, medium2: 300, medium3: 350, medium4: 400,
    long1: 450,   long2: 500,   long3: 550,   long4: 600,
    extraLong1: 700, extraLong2: 800, extraLong3: 900, extraLong4: 1000,
  },
  // Easing — map to Reanimated Easing
  easing: {
    standard:         Easing.bezier(0.2, 0.0, 0, 1.0),
    standardDecelerate: Easing.bezier(0, 0, 0, 1),
    standardAccelerate: Easing.bezier(0.3, 0, 1, 1),
    emphasized:         Easing.bezier(0.2, 0.0, 0, 1.0),
    emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1.0),
    emphasizedAccelerate: Easing.bezier(0.3, 0.0, 0.8, 0.15),
  },
  // Spring presets
  spring: {
    default:  { damping: 20, stiffness: 300 },
    bouncy:   { damping: 14, stiffness: 300 },
    snappy:   { damping: 28, stiffness: 400 },
    gentle:   { damping: 26, stiffness: 170 },
  },
};
```

## Patterns

### Pressable State Layer
```ts
const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: withSpring(scale.value, motion.spring.snappy) }],
}));
// onPressIn: scale.value = 0.97  onPressOut: scale.value = 1
```

### Screen Enter / Exit (Expo Router layout animations)
```tsx
// Use react-native-reanimated layout animations
entering={FadeInDown.duration(motion.duration.medium2).easing(motion.easing.emphasizedDecelerate)}
exiting={FadeOutUp.duration(motion.duration.short4).easing(motion.easing.emphasizedAccelerate)}
```

### List Item Stagger
```ts
entering={FadeInDown.delay(index * 50).springify().damping(20)}
```

### Shared Element Transitions
- Not supported in Reanimated 4 (`sharedTransitionTag` was experimental in v3 and removed). Do not use.
- For hero-style continuity, animate within the screen (entering/exiting + layout transitions) instead.

### Bottom Sheet / Modal
- Build custom — do not install third-party bottom sheet libraries.
- Drive with `useSharedValue` for translateY, `Gesture.Pan()` + `GestureDetector` for drag, `withSpring` for snap.
- Snap points as absolute pixel values derived from screen height: `height * 0.5`, `height * 0.9`.
- Backdrop: animated `opacity` overlay, dismiss on press via `withTiming`.

### Skeleton Loading
- Animate `opacity` between `0.4` and `1.0` with `withRepeat(withTiming(...))`.
- Use `motion.duration.long2` for loop duration.

## Guardrails
- ❌ No `useEffect` to drive animations — use `useAnimatedReaction` or derived values.
- ❌ No JS-thread animations for transforms/opacity — always use `useAnimatedStyle`.
- ❌ No layout animations on FlatList items while scrolling — gate with `isFocused`.
- ❌ No arbitrary durations — use `motion.duration` tokens.
- ✅ `worklet` directive on all functions called from animated handlers.
- ✅ Cancel animations on component unmount via `cancelAnimation`.
