# Skill: Security

## Secrets & Config
- Zero secrets in source code or `app.json` — all via EAS Secrets or environment variables.
- `config/env.ts` reads from `process.env` with required-field validation at startup.
- `.env` files in `.gitignore` — `.env.example` committed with placeholder values only.

## Authentication
- Access tokens stored in `expo-secure-store` only — never MMKV or any unencrypted store.
- Refresh tokens encrypted at rest — `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
- Token rotation on every refresh — invalidate old token server-side immediately.
- On auth failure (401): clear tokens, emit auth event, redirect to login — no silent retry loop.

## API Security
```ts
// services/api/client.ts
- Attach Authorization header via request interceptor
- Refresh token in response interceptor on 401 — single flight (queue concurrent requests)
- HTTPS only — reject any http:// base URL at config validation
- Certificate pinning only if the threat model demands it — via native network config (`expo-build-properties`), not a JS-level library
```

## PIN / Biometrics
- PIN never stored — store only the hash (bcrypt/argon2 via native module or derive key).
- Biometric auth via `expo-local-authentication` — fallback to PIN, never password.
- Lock app after N seconds backgrounded — tracked via `AppState`.
- Failed attempts: exponential backoff + lockout after 5 failures.

## Data Storage
| Data Type | Storage |
|---|---|
| Auth tokens | `expo-secure-store` |
| User preferences | `MMKV` (non-sensitive only) |
| PII / sensitive fields | `expo-secure-store` |
| Cache | `MMKV` with expiry metadata |

## Input Validation
- Validate all user input client-side (UX) AND server-side enforced (never trust client).
- Sanitize before display — escape dynamic strings rendered in WebView.
- Use typed form schemas (`zod`) — parse, don't validate.

## Deep Links
- Validate all incoming deep link params before use.
- Never auto-execute actions from deep link params without auth check.

## Error Handling
- Strip sensitive data from error logs — no tokens, PII, or stack traces to analytics in production.
- Use error boundaries — unhandled errors must not expose internal state to UI.

## Build
- Android release: R8/ProGuard minification via `expo-build-properties`. (Bitcode is dead — Apple removed it; nothing to enable on iOS.)
- Disable `console.*` in production via Babel plugin.

## Guardrails
- ❌ No MMKV for tokens, PIN, or PII — MMKV is unencrypted; use `expo-secure-store`.
- ❌ No hardcoded API keys, client secrets, or URLs in source.
- ❌ No `console.log` in production — strip via `babel-plugin-transform-remove-console`.
- ❌ No `dangerouslySetInnerHTML` or unescaped dynamic WebView content.
- ❌ No auth logic in components — auth lives in `services/auth/`.
