# Skill: Component Composition — Modularity

## Philosophy
- The project is component-heavy by design: parents are assemblies of small, named children — never monolithic files.
- A screen should read like a table of contents: `<Header />`, `<BalanceCard />`, `<RecentActivity />` — the detail lives one level down.
- Small files are the unit of reuse, testing, and review. Bloat in one file is a design failure, not a style issue.

## Composition Hierarchy (top-down)
| Level | Size budget | Contains |
|---|---|---|
| Route file (`src/app/`) | ≤ 40 lines | Imports screen component, route params — nothing else |
| Screen (feature root) | ≤ 100 lines | Composes feature components, wires hooks |
| Feature component | ≤ 150 lines | Composes UI blocks + primitives, receives data via props |
| UI block / primitive | ≤ 100 lines | Pure presentation |

## Extraction Rules — when to split
- A JSX section has its own concern (you could name it) → extract a child component.
- The same JSX shape appears twice → extract and parameterize — never copy-paste variants.
- A component exceeds its size budget or needs > 7 props → wrong abstraction: split it, or switch to compound/slot pattern.
- `renderItem` bodies are always a named, memoized component — never inline JSX in the list.

## Folder-per-Component
When a component has more than one file, give it a folder with a barrel:
```
components/transactions/transaction-list/
  index.ts                    ← barrel: exports TransactionList only
  transaction-list.tsx        ← parent: composes the children below
  transaction-item.tsx
  transaction-item-skeleton.tsx
  transaction-list-empty.tsx
  use-transaction-list.ts     ← co-located hook (data wiring)
```
- Loading, empty, and error variants are sibling components — not conditionals bloating the parent.
- Children not exported from the barrel are private to the folder.

## Patterns
- **Compound components** for structured UI: `Card`, `Card.Header`, `Card.Body`, `Card.Footer`.
- **Slot props** for injection points: `<Screen header={<Header />} footer={<Actions />}>`.
- **Children over config**: prefer `<List>{items.map(...)}</List>` composition to giant config-object props.
- **Promote on second use**: a feature-local component needed by a second feature moves up to `components/ui/` — never import across feature folders.

## Reuse Before Create
- Before writing any component, check `components/common/` and `components/ui/` for an existing fit.
- Extend by props/variants, not by duplicating with a suffix (`ButtonNew`, `Card2` are forbidden).

## Guardrails
- ❌ No file over 200 lines — split before it gets there.
- ❌ No anonymous inline components defined inside render.
- ❌ No cross-feature imports (`components/payments/` importing from `components/profile/`) — shared pieces live in `ui/` or `common/`.
- ❌ No prop bags (`config={...}` mega-objects) to dodge the prop-count rule.
- ❌ No conditionals rendering three unrelated layouts in one component — one component per state/variant.
- ✅ Every extracted child is independently testable and receives everything via props.
- ✅ Barrel `index.ts` per component folder — deep imports into a folder are forbidden.
