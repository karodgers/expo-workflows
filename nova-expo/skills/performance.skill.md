# Skill: Performance

## Render Optimization
- `FlatList` / `FlashList` for all lists — never `ScrollView` + `.map()` for > 5 dynamic items.
- Prefer `FlashList` v2 (`@shopify/flash-list`) over `FlatList` — better recycling. v2 needs no size estimates (`estimatedItemSize` is removed — do not pass it).
- `keyExtractor` must return stable, unique string (entity ID — not index).
- `FlatList` only: set `getItemLayout` when item size is fixed; `removeClippedSubviews` on long lists; `initialNumToRender` = visible items + 2 buffer.

## Image Optimization
- `expo-image` over `<Image>` from RN — disk + memory cache, blurhash placeholders.
- Specify `contentFit` and explicit `width`/`height` — no layout shift.
- Remote images: provide `blurhash` or `thumbhash` placeholder from API.

## JavaScript Thread
- All animations on UI thread — zero JS thread involvement (see animations.skill.md).
- Heavy computation (sorting, filtering > 1000 items) → defer with `InteractionManager.runAfterInteractions` so it never blocks a gesture or transition.
- Avoid large synchronous `JSON.parse`/transform bursts during navigation or scroll — chunk or defer them.

## Bundle Size
- Import only what you use — no wildcard imports (`import * as`).
- Tree-shaking friendly: prefer named exports.
- Dynamic imports for heavy screens (modals, onboarding) via React `lazy` + `Suspense`.
- Audit bundle with Expo Atlas: `EXPO_ATLAS=1 npx expo export` then `npx expo-atlas`.

## Query & Cache
- `staleTime` set per query — not global default — based on data freshness requirements.
- `gcTime` (garbage collection) set explicitly — default 5 min is usually fine.
- Prefetch critical data on auth success — don't wait for screen mount.
- Paginated lists: `useInfiniteQuery` — never load all pages at once.

## App Startup
- Defer non-critical initialization (analytics, notifications) until after first paint.
- Use `expo-splash-screen` — hide only after fonts loaded and critical data ready.
- Fonts preloaded with `useFonts` before hiding splash.

## Hermes
- Hermes engine enabled (default in Expo SDK 50+) — do not disable.
- Avoid `eval()` and dynamic `require()` — breaks Hermes optimization.

## Guardrails
- ❌ No `ScrollView` wrapping dynamic lists.
- ❌ No anonymous object/array creation in render (`style={{ }}` inline — use StyleSheet).
- ❌ No `useEffect` that triggers on every render — always specify dependency array.
- ❌ No synchronous expensive operations in component body or hooks.
- ❌ No `console.log` in production — adds measurable overhead.
- ✅ Profile with React DevTools Profiler / `npx expo start` dev tools before optimizing (Flipper is deprecated — do not use).
