# Skill: Design System — Platform Adaptive (iOS HIG / Android M3)

## Philosophy
- One semantic token API, two platform expressions: **Apple HIG** on iOS, **Material 3 Expressive** on Android.
- The app must feel native on each platform — an iOS user sees an Apple app, an Android user sees a Material app. Same components, same props, platform-resolved appearance.
- Platform resolution lives in exactly TWO layers: `constants/` (token values) and `components/common/` (primitive behavior). Everything above them is platform-agnostic.

## Token Resolution
```ts
// constants/colors.ts — semantic roles shared by both platforms
// Roles: primary, onPrimary, primaryContainer, surface, onSurface,
//        surfaceVariant, outline, error, onError, success
import { Platform } from 'react-native';

const m3Light  = { primary: '#6750A4', surface: '#FFFBFE', onSurface: '#1C1B1F', /* full M3 roles */ };
const m3Dark   = { primary: '#D0BCFF', surface: '#141218', onSurface: '#E6E0E9', /* ... */ };
const higLight = { primary: '#007AFF', surface: '#FFFFFF', onSurface: '#000000', /* iOS system colors */ };
const higDark  = { primary: '#0A84FF', surface: '#000000', onSurface: '#FFFFFF', /* ... */ };

export const colorSchemes = Platform.select({
  ios:     { light: higLight, dark: higDark },
  default: { light: m3Light,  dark: m3Dark },
});
```
- Four palettes total (2 platforms × 2 schemes) — all expose identical semantic role names.
- Active scheme via `useColorScheme()` + theme context (`userInterfaceStyle: "automatic"` in app.json).
- Components never import a palette directly — only the theme hook.

## Typography — semantic scale, platform values
```ts
// constants/typography.ts — system font only: SF Pro on iOS, Roboto on Android
export const typescale = Platform.select({
  ios: {
    display:  { fontSize: 34, lineHeight: 41, fontWeight: '700' },  // Large Title
    headline: { fontSize: 28, lineHeight: 34, fontWeight: '700' },  // Title 1
    title:    { fontSize: 17, lineHeight: 22, fontWeight: '600' },  // Headline
    body:     { fontSize: 17, lineHeight: 22, fontWeight: '400' },
    caption:  { fontSize: 13, lineHeight: 18, fontWeight: '400' },
    label:    { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  },
  default: {  // M3 typescale
    display:  { fontSize: 45, lineHeight: 52, fontWeight: '400' },
    headline: { fontSize: 32, lineHeight: 40, fontWeight: '400' },
    title:    { fontSize: 22, lineHeight: 28, fontWeight: '400' },
    body:     { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0.5 },
    caption:  { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0.4 },
    label:    { fontSize: 14, lineHeight: 20, fontWeight: '500', letterSpacing: 0.1 },
  },
});
```

## Shape, Spacing, Elevation
```ts
// constants/dimensions.ts
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };  // shared
export const radius  = Platform.select({
  ios:     { xs: 6, sm: 10, md: 12, lg: 16, xl: 20, full: 9999 },
  default: { xs: 4, sm: 8,  md: 12, lg: 16, xl: 28, full: 9999 },  // M3
});
```
- iOS surfaces: flat, hairline borders (`StyleSheet.hairlineWidth`), soft subtle shadows, grouped backgrounds.
- Android surfaces: M3 elevation levels + surface tint.

## Interaction Feedback (encapsulated in `components/common/`)
- Android: `android_ripple` / M3 state layers (pressed 12%, dragged 16%).
- iOS: opacity dim (~0.85) or scale press (0.97 spring) — **never ripple on iOS**.
- One `Pressable` primitive wraps this; nothing above `common/` implements press feedback.

## Native Controls — never recreate
- Use the platform's own: `Switch`, `Alert.alert`, date/time pickers, share sheet, context menus.
- Screen transitions and headers: native-stack defaults from Expo Router — do not re-style navigation to look like the other platform.

## Platform Split Mechanics
- Values differ → `Platform.select` inside token files.
- Structure/behavior differs → file split: `segmented-control.ios.tsx` / `segmented-control.android.tsx` + shared types; Metro resolves automatically. Public API must stay identical.

## Guardrails
- ❌ No `Platform.OS` conditionals outside `constants/` and `components/common/`.
- ❌ No hardcoded hex colors, font sizes, radii, or spacing in component files — tokens only.
- ❌ No ripple on iOS; no iOS-style chrome on Android.
- ❌ No custom rebuilds of controls the OS provides.
- ❌ No custom fonts unless brand explicitly requires — system fonts are the native look.
- ✅ All text via the `<Text>` primitive wrapping `typescale` — never raw RN `<Text>`.
- ✅ `StyleSheet.create()` outside component body; styles reference tokens.
- ✅ Every semantic role present in all four palettes — enforced by a shared `ColorRoles` type.
