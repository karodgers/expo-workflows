# Skill: Services & API

## API Client
```ts
// services/api/client.ts
import axios from 'axios';
import { tokenService } from 'services/auth/token.service';

export const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
apiClient.interceptors.request.use(async (req) => {
  const token = await tokenService.getAccessToken();
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// Response interceptor — refresh on 401 (single-flight)
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      await tokenService.refresh(); // handles queue internally
      return apiClient(err.config);
    }
    return Promise.reject(normalizeError(err));
  }
);
```

## Service Module Pattern
```ts
// services/api/payments.service.ts
export const paymentsService = {
  getTransactions: () =>
    apiClient.get<Transaction[]>('/transactions').then((r) => r.data),
  
  sendMoney: (payload: SendMoneyPayload) =>
    apiClient.post<TransactionResult>('/payments', payload).then((r) => r.data),
};
```
- Services return typed data — never raw `AxiosResponse`.
- Services are plain objects (not classes) — easily mockable.

## Error Normalization
```ts
// errors/api-error.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
  ) { super(message); }
}

function normalizeError(err: AxiosError): ApiError {
  const status = err.response?.status ?? 0;
  const code = err.response?.data?.code ?? 'UNKNOWN';
  const message = err.response?.data?.message ?? 'Something went wrong';
  return new ApiError(code, message, status);
}
```

## Token Service
```ts
// services/auth/token.service.ts
// - getAccessToken(): reads from SecureStore
// - getRefreshToken(): reads from SecureStore
// - refresh(): calls /auth/refresh, stores new tokens, drains queued requests
// - clear(): removes both tokens from SecureStore
```

## Storage Service
```ts
// services/storage/secure.storage.ts
export const secureStorage = {
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  get: (key: string) => SecureStore.getItemAsync(key),
  delete: (key: string) => SecureStore.deleteItemAsync(key),
};
```

## Guardrails
- ❌ No `fetch` directly — always use `apiClient`.
- ❌ No try/catch in services — throw normalized errors, handle in UI hooks.
- ❌ No response mapping logic in components — map in service or query `select`.
- ❌ No auth token logic outside `services/auth/`.
- ✅ All service functions return `Promise<TypedData>` — fully typed.
- ✅ Services mocked in tests via `jest.mock('services/api/payments.service')`.
