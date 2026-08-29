# Skill: Component Patterns

## Rules
- Components are pure UI — no API calls, no store writes, no navigation inside.
- Props drive behavior — side effects belong in hooks or parent screens.
- Compound components for complex UI (e.g., `Card`, `Card.Header`, `Card.Body`).
- Controlled vs. uncontrolled: forms are controlled — always.
- Every component has a single, clear responsibility.
- Sizing, extraction, and folder rules: see composition.skill.md — it governs when and how to split.

## Component Tiers
| Tier | Location | Rule |
|---|---|---|
| Primitive | `components/common/` | Single-element, token-driven, no business logic |
| UI Block | `components/ui/` | Composed from primitives, no data fetching |
| Feature | `components/<feature>/` | Uses hooks, wired to store/services via props |
| Screen | `app/(screens)/` | Layout shell — composes feature components |

## Anatomy
```tsx
// components/common/button.tsx
// React 19: ref is a regular prop — no forwardRef.
export interface ButtonProps {
  label: string;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  testID?: string;
  ref?: Ref<View>;
}

export function Button({ label, variant = 'filled', onPress, loading, disabled, icon, testID, ref }: ButtonProps) {
  // animation logic
  // render
}
```

## Hook Pattern
```ts
// hooks/use-auth.ts
export function useAuth() {
  // reads from store, calls services
  // returns state + actions only
  return { user, isLoading, signIn, signOut };
}
```
- Hooks expose state and callbacks — no JSX, no side-effect triggers on mount without user action.
- One hook per concern — do not build mega-hooks.

## Memoization Rules
- `React.memo` only when parent re-renders frequently and child is expensive.
- `useCallback` on callbacks passed as props to memoized children.
- `useMemo` only for expensive derivations (sorting, filtering large lists) — not for objects to "prevent re-renders".
- Profile before memoizing — premature memoization adds overhead.

## Error Boundaries
- Wrap each screen in an `ErrorBoundary` component from `errors/`.
- `ErrorBoundary` renders a fallback UI with retry action — never a blank screen.

## Accessibility
- All interactive elements: `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` where needed.
- `accessibilityState={{ disabled, busy: loading }}` on buttons.
- Minimum touch target: 44×44pt.

## Guardrails
- ❌ No anonymous inline components (`() =>` inside JSX render).
- ❌ No `useEffect` for derived state — use `useMemo`.
- ❌ No component file > 200 lines — split into sub-components.
- ❌ No prop drilling > 2 levels — lift to context or store.
- ❌ No business logic in `components/common/` or `components/ui/`.
- ✅ `testID` prop on all interactive and key display elements.
