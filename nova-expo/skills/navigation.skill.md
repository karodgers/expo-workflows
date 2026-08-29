# Skill: Navigation — Expo Router

## Structure
```
src/app/
  _layout.tsx          ← root layout (providers, auth guard)
  (auth)/
    _layout.tsx        ← auth stack layout
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx        ← tab navigator layout
    index.tsx          ← home tab
    activity.tsx
    account.tsx
  (screens)/
    _layout.tsx        ← modal stack layout
    transaction/[id].tsx
    send-money.tsx
  (modals)/
    _layout.tsx        ← modal presentation
    confirm-payment.tsx
```

## Auth Guard — Protected Routes
```tsx
// src/app/_layout.tsx — declarative guards, no useEffect redirects
export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(screens)" />
        <Stack.Screen name="(modals)" />
      </Stack.Protected>
    </Stack>
  );
}
```
- `Stack.Protected` redirects automatically when the guard flips — never hand-roll `useEffect` + `router.replace` guards.

## Navigation Rules
- Use `router.push` for forward navigation, `router.back()` for back, `router.replace` for auth redirects.
- Dynamic routes typed — define `params` type in route file and validate on entry.
- Pass minimal data via params (IDs only) — fetch full data in destination screen.
- Modals use `presentation: 'modal'` in `_layout.tsx` Stack.Screen options.
- Tab bar defined entirely in `(tabs)/_layout.tsx` — icons, labels, active tint from theme.

## Screen Pattern
```tsx
// src/app/(screens)/transaction/[id].tsx
export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useTransaction(id);

  if (isLoading) return <ScreenSkeleton />;
  if (isError) return <ScreenError />;
  return <TransactionDetail transaction={data} />;
}
```

## Deep Links
- Scheme defined in `app.json` (`scheme: 'myapp'`).
- All deep link paths map to Expo Router file paths — no custom linking config needed.
- Validate and sanitize params before use (see security.skill.md).

## Guardrails
- ❌ No `react-navigation` imports — use `expo-router` exclusively.
- ❌ No navigation calls inside components — only in event handlers or hooks.
- ❌ No business logic in route files — screens are layout shells.
- ❌ No params containing full objects — pass IDs, fetch in destination.
- ✅ Every stack/tab layout typed with `Stack.Screen` / `Tabs.Screen` options defined explicitly.
