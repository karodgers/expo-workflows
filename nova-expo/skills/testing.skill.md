# Skill: Testing

## Stack
- `Jest` + `@testing-library/react-native` — unit and integration.
- `jest-expo` preset.
- Mock native modules in `jest.setup.js`.
- No Detox / E2E unless explicitly scoped.

## What to Test
| Layer | Test Type | Target |
|---|---|---|
| Utils | Unit | Pure function input → output |
| Hooks | Unit | `renderHook` — state transitions |
| Components | Integration | User interaction → correct render |
| Services | Unit | Mocked `apiClient` → correct call |
| Screens | Integration | Full screen render + user flow |

## Test File Location
- Co-located: `components/common/button.test.tsx` next to `button.tsx`.
- OR centralized: `__tests__/` for screen-level integration tests.
- Consistent per project — pick one, enforce it.

## Component Test Pattern
```tsx
// components/common/button.test.tsx
describe('Button', () => {
  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Pay" onPress={onPress} />);
    await userEvent.press(getByText('Pay'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Pay" onPress={onPress} disabled />);
    await userEvent.press(getByText('Pay'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

## Hook Test Pattern
```ts
it('returns authenticated user after signIn', async () => {
  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn(credentials); });
  expect(result.current.user).not.toBeNull();
  expect(result.current.isAuthenticated).toBe(true);
});
```

## Service Mock Pattern
```ts
jest.mock('services/api/payments.service', () => ({
  paymentsService: {
    sendMoney: jest.fn().mockResolvedValue({ id: 'txn_123', status: 'pending' }),
  },
}));
```

## Snapshot Tests
- Snapshots only for stable primitive components (Button, Badge, Chip).
- Review snapshot diffs on every PR — never auto-update without visual check.
- No snapshots for screens or feature components — too brittle.

## Guardrails
- ❌ No `getByTestId` as primary query — prefer `getByRole`, `getByText`, `getByLabelText`.
- ❌ No `act` wrapping unless testing async state updates.
- ❌ No testing implementation details (internal state, private methods).
- ❌ No `setTimeout` in tests — use `jest.useFakeTimers()`.
- ✅ Every new component ships with at least one render test.
- ✅ Mock `expo-secure-store`, `expo-router`, `react-native-mmkv` in setup.
