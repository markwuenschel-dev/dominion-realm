---
title: Derived State + Missing Dependency in useEffect
qid: Q003
order: 3
category: react-ts
language: typescript
difficulty: mid
summary: A component copies props into state and re-syncs in an effect with a missing dependency — the classic derived-state anti-pattern that goes stale.
tags:
  - derived-state
  - hooks
draft: false
---

## Prompt

```tsx
interface Item {
  id: string;
  name: string;
  category: string;
}

interface Props {
  items: Item[];
  searchTerm: string;
}

const ItemFilter: React.FC<Props> = ({ items, searchTerm }) => {
  const [filtered, setFiltered] = useState<Item[]>(items);

  useEffect(() => {
    setFiltered(items.filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [searchTerm]); // items is missing

  return (
    <ul>
      {filtered.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
};
```

## Task

1. Explain the intended behavior vs. what actually happens when `items` changes after mount or when `searchTerm` is cleared.
2. Identify the React rules violation and the resulting bugs (stale data, extra re-renders).
3. Propose the **smallest safe fix** (consider both "fix the effect" and "do we even need state + effect here?").
4. Write a **minimal test** (React Testing Library) that catches the stale-data bug.
5. Explain when you'd choose `useMemo` vs. state + effect vs. a fully controlled parent.

## Expected answer

Intended: keep a filtered list in sync with the current search term.

Actual: `filtered` is initialized once from the initial `items`. The effect only re-runs when `searchTerm` changes, so if the parent re-renders with a **new `items` array** (common after a fetch), `filtered` goes stale. Every keystroke also re-filters even when `items` didn't change.

## Issues

- **Stale closure / missing dependency**: `items` is read in the effect but not listed — an ESLint rule violation.
- **Derived-state anti-pattern**: `filtered` is fully determined by `items` + `searchTerm`; storing it in state creates sync bugs and extra renders.
- **Performance**: filtering runs on every `searchTerm` change even when the `items` reference is stable.
- **Initial-state bug**: if `items` is empty on first render and later populated, `filtered` stays empty forever.

## Smallest safe fix

**Best**: remove state + effect entirely; derive with `useMemo`.

```tsx
const filtered = useMemo(
  () => items.filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase())),
  [items, searchTerm],
);
```

This is the modern React answer ("You Might Not Need an Effect"). If forced to keep local state, at least add `items` to the dependency array — but `useMemo` is still better.

## Regression test (RTL)

```tsx
it('updates the filtered list when the items prop changes', () => {
  const { rerender } = render(<ItemFilter items={initialItems} searchTerm="foo" />);
  expect(screen.getByText('foo-item')).toBeInTheDocument();

  rerender(<ItemFilter items={newItems} searchTerm="foo" />);
  expect(screen.getByText('new-foo-item')).toBeInTheDocument();
  expect(screen.queryByText('foo-item')).not.toBeInTheDocument();
});
```

## Strong answer signals

- Recognizes the "derived state" smell and paraphrases "You Might Not Need an Effect."
- Suggests `useMemo` rather than just adding the missing dependency.
- The test exercises a prop change (the realistic failure), not just typing.
- Discusses re-render characteristics.

## Common traps

- Only saying "add `items` to the dependency array" (treats the symptom).
- Defending state + effect ("we might want to debounce later").
- Writing a test that only types in the input and never changes `items`.

## Follow-up probe

> The parent now wants to let the user also filter by `category`. How does your solution scale, and would you lift state up or keep the filtering logic here?

## Level II stretch — SE II

**Prompt**: This filtering is needed across many components and must support search + category + sort. Design a reusable, well-typed hook whose result is referentially stable when inputs don't change. Show the hook and its types.

**Model answer**: Extract a generic hook driven by a declarative, extensible options object; memoize internally so consumers don't re-render on stable inputs:

```tsx
interface FilterSort<T> {
  search?: string;
  searchKey: (item: T) => string;
  category?: string;
  categoryKey?: (item: T) => string;
  sortBy?: (a: T, b: T) => number;
}

function useFilteredItems<T>(items: T[], opts: FilterSort<T>): T[] {
  return useMemo(() => {
    const term = opts.search?.toLowerCase() ?? '';
    let out = items.filter((i) => {
      const matchesSearch = !term || opts.searchKey(i).toLowerCase().includes(term);
      const matchesCat = !opts.category || opts.categoryKey?.(i) === opts.category;
      return matchesSearch && matchesCat;
    });
    if (opts.sortBy) out = [...out].sort(opts.sortBy);
    return out;
  }, [items, opts.search, opts.category, opts.searchKey, opts.categoryKey, opts.sortBy]);
}
```

Key API decisions: filters are a **declarative object** (extensible to price, inStock, etc. without new params); the return is a **stable reference** via `useMemo` so children relying on `===` don't churn; and the generic `T` gives consumers full type inference and autocomplete. For a UI with many controls, this could graduate into a `<FilterableList>` compound component — but the hook is the right primitive for most cases.

## Level III stretch — SE III

**Prompt**: You find ~40 components across the codebase with this same derived-state-in-an-effect bug. Rather than fix them by hand, write the **detection** for an automated pass (an ESLint rule or codemod) that flags the pattern, and describe how you'd roll the fix out safely.

**Model answer**: The pattern is mechanically detectable: a `useState` whose setter is called *only* inside a `useEffect`, from props/state that aren't all in the dependency array. A minimal ESLint rule matches that AST shape:

```js
// eslint-plugin-local/rules/no-derived-state-effect.js
module.exports = {
  meta: { type: 'problem', docs: { description: 'Derived state should be useMemo, not state + effect' } },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.name !== 'useEffect') return;
        const body = node.arguments[0]?.body?.body ?? [];
        // Heuristic: effect body is a single setState(props.x.filter(...)) call.
        const onlyStmt = body.length === 1 && body[0];
        const isSetterOnly =
          onlyStmt?.expression?.callee?.name?.startsWith('set');
        if (isSetterOnly) {
          context.report({ node, message: 'Likely derived state — prefer useMemo (You Might Not Need an Effect).' });
        }
      },
    };
  },
};
```

Rollout is the senior part: (1) run the rule in **report-only** mode across the repo to get an accurate count and rank files by blast radius (customer-facing / perf-sensitive first); (2) publish a short RFC showing the `useMemo` / `useFilteredItems` target pattern; (3) migrate 2–3 high-traffic teams as reference PRs; (4) migrate the rest in waves; (5) flip the rule to **error** in CI so no new instances land. For the mechanical majority, a `jscodeshift` codemod can rewrite `useState` + single-setter-effect into a `useMemo` automatically, shipped in "suggest" mode first. (Under React Server Components a lot of this filtering can also move server-side, receiving already-filtered props — but the "don't store derived state" principle is unchanged; only where the computation runs moves.)
