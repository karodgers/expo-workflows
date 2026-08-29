# Skill: File Structure

## Rules
- One component per file. Filename = component name in kebab-case.
- Barrel exports (`index.ts`) per folder — never import from deep paths outside that folder.
- Co-locate: styles, types, hooks, and tests live next to their component when specific to it.
- Shared logic only → `hooks/`, `utils/`, `services/`, `types/`.
- No logic in `app/` route files — they are shells only (layout + screen component import).
- `constants/` = static values only. No functions, no logic.
- `config/` = environment-bound config (API URLs, feature flags). Never hardcode in components.

## Structure
```
src/
  app/
    (auth)/         ← unauthenticated routes
    (tabs)/         ← authenticated tab navigator
    (screens)/      ← stack screens
    (modals)/       ← modal screens
  components/
    common/         ← reusable primitives (Button, Text, Icon)
    ui/             ← composed UI blocks (Card, Badge, Chip)
    layout/         ← structural wrappers (Screen, Section, Divider)
    forms/          ← form fields and form-level components
    modals/         ← modal content components
  hooks/            ← shared custom hooks
  store/            ← global state (Zustand slices)
  services/
    api/            ← HTTP client + endpoint modules
    auth/           ← auth logic (tokens, session)
    storage/        ← secure/async storage abstractions
    notifications/  ← push notification setup + handlers
    analytics/      ← event tracking abstraction
  utils/            ← pure functions only
  constants/        ← colors, spacing, typography tokens
  types/            ← shared TypeScript types/interfaces
  config/           ← env config, feature flags
  errors/           ← error classes, error boundary components
  assets/
    fonts/
    images/
    icons/
    animations/     ← Lottie / raw Reanimated JSON
```

## Naming Conventions
| Type | Convention | Example |
|---|---|---|
| Component file | kebab-case | `primary-button.tsx` |
| Hook file | kebab-case | `use-auth.ts` |
| Store slice | kebab-case | `auth.store.ts` |
| Service file | kebab-case | `payments.service.ts` |
| Type file | kebab-case | `user.types.ts` |
| Constant file | kebab-case | `colors.ts` |
| Util file | kebab-case | `format-currency.ts` |

## Guardrails
- ❌ No default exports except route files (`app/`) and screen components.
- ❌ No barrel `index.ts` exports in `src/app/` — there, `index.tsx` is a route (the folder's default screen), nothing else.
- ❌ No cross-slice store imports — slices are independent.
- ❌ No direct `fetch` calls in components — always go through `services/api/`.
- ❌ No `any` type — use `unknown` and narrow.
