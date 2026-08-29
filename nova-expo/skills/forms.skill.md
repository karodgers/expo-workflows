# Skill: Forms

## Stack
- `react-hook-form` + `zod` — always. No exceptions.
- Schema defines validation — shared between form and types.
- `zodResolver` connects schema to form.

## Pattern
```ts
// schemas/send-money.schema.ts
export const sendMoneySchema = z.object({
  amount:    z.number().positive().min(1).max(10_000),
  recipient: z.string().uuid(),
  note:      z.string().max(140).optional(),
});
export type SendMoneyForm = z.infer<typeof sendMoneySchema>;
```

```tsx
// hooks/use-send-money-form.ts
export function useSendMoneyForm() {
  const form = useForm<SendMoneyForm>({
    resolver: zodResolver(sendMoneySchema),
    defaultValues: { amount: 0, note: '' },
    mode: 'onBlur',  // validate on blur, not on every keystroke
  });

  const { mutate, isPending } = useMutation({ mutationFn: paymentsService.sendMoney });

  const onSubmit = form.handleSubmit((data) => mutate(data));

  return { form, onSubmit, isPending };
}
```

```tsx
// components/forms/amount-input.tsx
interface AmountInputProps {
  control: Control<SendMoneyForm>;
  name: Path<SendMoneyForm>;
}
export function AmountInput({ control, name }: AmountInputProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextInput
          value={String(field.value)}
          onChangeText={(v) => field.onChange(Number(v))}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
```

## Validation Modes
| Event | Mode |
|---|---|
| Submission | always re-validate |
| Field touch | `onBlur` |
| Real-time (amount, search) | `onChange` only for specific fields |

## Error Display
- Field errors inline below input — not in a toast.
- Form-level errors (API errors mapped back to fields) via `form.setError('fieldName', ...)`.
- Use `fieldState.isTouched && fieldState.error` — don't show errors on pristine fields.

## Multi-Step Forms
```ts
// useReducer for step state — not global store
type StepAction = { type: 'NEXT' } | { type: 'BACK' } | { type: 'RESET' };
```
- Each step is a separate component receiving `control` and `errors` as props.
- Form data accumulated at root — submit only on final step.

## Guardrails
- ❌ No `useState` for form field values.
- ❌ No validation logic outside zod schema.
- ❌ No form submission inside components — in hooks only.
- ❌ No uncontrolled inputs in forms.
- ❌ No schema duplication — one schema per form, shared via import.
- ✅ Disable submit button when `isSubmitting` or `isPending`.
- ✅ Reset form after successful submission.
