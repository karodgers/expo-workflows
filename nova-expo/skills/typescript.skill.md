# Skill: TypeScript

## Config
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
- Single alias: `@/` → `src/`. Metro resolves tsconfig paths natively in Expo — no babel module-resolver needed. Jest `moduleNameMapper` must mirror it.

## Type Rules
- `strict: true` — no exceptions. Fix the types, not the config.
- Prefer `type` over `interface` for unions, mapped types, and utility types.
- Prefer `interface` for object shapes that may be extended (component props, service responses).
- No `as` type assertions unless narrowing from `unknown` with guard.
- No `!` non-null assertions — narrow with guard or optional chain.

## Typing Patterns
```ts
// Discriminated union for state
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

// Readonly data from API
type User = Readonly<{
  id: string;
  email: string;
  fullName: string;
}>;

// Exhaustive switch
function handleState(state: RequestState<User>): string {
  switch (state.status) {
    case 'idle':    return '...';
    case 'loading': return '...';
    case 'success': return state.data.fullName;
    case 'error':   return state.error.message;
    default: { const _: never = state; return ''; }
  }
}
```

## Path Aliases
- Always use the `@/` alias over relative `../../` paths deeper than one level.
- `import { Button } from '@/components/common/button'` ✅
- `import { Button } from '../../../components/common/button'` ❌

## Utility Types
- Use built-in utilities: `Partial`, `Required`, `Pick`, `Omit`, `Readonly`, `Record`, `Extract`, `Exclude`.
- `zod` schemas are the source of truth for API/form types — derive with `z.infer<typeof schema>`.

## Guardrails
- ❌ No `any` — use `unknown` and narrow.
- ❌ No `// @ts-ignore` — fix the type error.
- ❌ No duplicate type definitions — one definition, imported everywhere.
- ❌ No implicit `object` or `{}` types — be explicit.
- ✅ All service function return types explicitly annotated.
- ✅ All component props interfaces exported — enables reuse and testing.
