# Skill: State Management — Zustand

## Rules
- Global state: Zustand slices — one slice per domain.
- Server state: TanStack Query — no manual fetch/loading/error state for API data.
- Local UI state: `useState` / `useReducer` — never in global store.
- Form state: `react-hook-form` — never in Zustand.

## Slice Pattern
```ts
// store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'auth-store' });

const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ user: state.user }), // persist only what's needed
    }
  )
);
```

## Selector Pattern
```ts
// Always select minimum slice — never subscribe to whole store
const user = useAuthStore((s) => s.user);
const clearAuth = useAuthStore((s) => s.clearAuth);
```

## Server State (TanStack Query)
```ts
// hooks/use-transactions.ts
export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: () => paymentsService.getTransactions(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
```
- Query keys are typed constants in `constants/query-keys.ts`.
- Mutations: `useMutation` with `onSuccess` cache invalidation.
- Optimistic updates for user-visible mutations.

## What Goes Where
| State Type | Tool |
|---|---|
| Auth session, user profile | Zustand + persist |
| Feature flags, app config | Zustand (no persist) |
| API data (lists, details) | TanStack Query |
| Form values | react-hook-form |
| Modal open/close, tab index | useState |
| Multi-step form wizard | useReducer |

## Guardrails
- ❌ No API calls inside Zustand actions — call service, then update store.
- ❌ No TanStack Query data stored in Zustand — single source of truth.
- ❌ No whole-store subscriptions — always use selectors.
- ❌ No ephemeral UI state (open/close) in global store.
- ❌ No store logic in components — use hooks as the interface layer.
- ❌ No `AsyncStorage` — use MMKV for all non-sensitive persistence (synchronous, 30× faster).
