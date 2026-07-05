---
title: Index Keys Preserve the Wrong Row State
qid: Q010
order: 10
category: react-ts
language: typescript
difficulty: mid
summary: Using the array index as a React key ties component state to position, so removing or reordering a row leaks state onto the wrong item.
tags:
  - keys
  - list-state
draft: false
---

## Prompt

```tsx
interface ReviewItem {
  id: string;
  title: string;
}

const ReviewList = ({ items }: { items: ReviewItem[] }) => {
  return (
    <ul>
      {items.map((item, index) => (
        <ReviewRow key={index} item={item} />
      ))}
    </ul>
  );
};

const ReviewRow = ({ item }: { item: ReviewItem }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <li>
      <button onClick={() => setExpanded(!expanded)}>{item.title}</button>
      {expanded && <div>Details for {item.title}</div>}
    </li>
  );
};
```

## Task

1. Explain the intended behavior.
2. Identify what goes wrong when an item is inserted, removed, or sorted.
3. Propose the **smallest safe fix**.
4. Write one React Testing Library test that catches the bug.
5. Explain when index keys are acceptable and when they are dangerous.

## Expected answer

React uses keys to preserve component identity. With `key={index}`, identity follows position, not the actual review. If item 0 is removed, the row previously at index 1 inherits the expanded state from the removed/shifted row.

## Issues

- State can appear attached to the wrong item after insert/delete/reorder.
- Bugs are intermittent and data-dependent.
- Especially dangerous for editable rows, selected rows, expanded panels, and forms.
- Can also cause unnecessary re-renders.

## Smallest safe fix

```tsx
{items.map((item) => (
  <ReviewRow key={item.id} item={item} />
))}
```

If the item has no stable id, create one at ingestion time rather than generating a new key each render.

## Regression test

```tsx
it('keeps expanded state attached to the same review after removing another row', async () => {
  const user = userEvent.setup();
  const initial = [
    { id: 'a', title: 'Alpha' },
    { id: 'b', title: 'Beta' },
  ];

  const { rerender } = render(<ReviewList items={initial} />);
  await user.click(screen.getByRole('button', { name: 'Beta' }));
  expect(screen.getByText('Details for Beta')).toBeInTheDocument();

  rerender(<ReviewList items={[initial[1]]} />);
  expect(screen.getByText('Details for Beta')).toBeInTheDocument();
  expect(screen.queryByText('Details for Alpha')).not.toBeInTheDocument();
});
```

## Strong answer signals

- Explains keys as identity, not just "clean up the React warning."
- Uses a stable domain id.
- Writes a test involving reorder/remove, not just initial render.
- Mentions forms/selection as high-risk cases.

## Common traps

- Using `Math.random()` or `Date.now()` as the key.
- Saying index is always wrong; it's fine for static, never-reordered lists.
- Moving state into the parent before trying stable keys.

## Follow-up probe

> If the list is virtualized and only some rows are mounted at once, does your key choice become more or less important?

## Level II stretch — SE II

**Prompt**: The items come from a CSV upload and have no stable id. Generate stable ids at **ingestion** (not render) so expanded state survives sort and remove. Show the ingestion step and a test that reorders the list.

**Model answer**: Assign ids once, when the data enters the app, and never regenerate them per render:

```tsx
// At ingestion — runs once when the upload is parsed.
function ingest(rows: RawRow[]): ReviewItem[] {
  return rows.map((r) => ({ id: crypto.randomUUID(), title: r.title }));
}
```

```tsx
// Render uses the stable id; sorting/removing keeps identity intact.
{items.map((item) => <ReviewRow key={item.id} item={item} />)}
```

```tsx
it('keeps expanded state on the same review after sorting', async () => {
  const user = userEvent.setup();
  const items = ingest([{ title: 'Beta' }, { title: 'Alpha' }]);

  const { rerender } = render(<ReviewList items={items} />);
  await user.click(screen.getByRole('button', { name: 'Beta' }));

  rerender(<ReviewList items={[...items].sort((a, b) => a.title.localeCompare(b.title))} />);
  expect(screen.getByText('Details for Beta')).toBeInTheDocument(); // still Beta, now first
});
```

The rule: generate the id at the data boundary and carry it through sort/filter/paginate. Generating `crypto.randomUUID()` *inside* the map (per render) is the same bug wearing a disguise — the key changes every render and React remounts everything.

## Level III stretch — SE III

**Prompt**: Row expand/selection state is lost whenever a virtualized list unmounts an off-screen row. Redesign so the state survives unmount, and explain why "index key + local row state" is doubly wrong here. Sketch it.

**Model answer**: Lift the per-row UI state **out of the row** and key it by the stable id in a parent-owned map, so a row can unmount and remount without losing anything:

```tsx
function ReviewList({ items }: { items: ReviewItem[] }) {
  // id -> expanded. Survives row unmount/remount in a virtualized window.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = useCallback(
    (id: string) => setExpanded((m) => ({ ...m, [id]: !m[id] })),
    [],
  );

  return (
    <VirtualList
      items={items}
      renderRow={(item) => (
        <ReviewRow
          key={item.id}
          item={item}
          expanded={!!expanded[item.id]}
          onToggle={() => toggle(item.id)}
        />
      )}
    />
  );
}
```

`ReviewRow` becomes controlled (no `useState`). Why the original is *doubly* wrong under virtualization: (1) `key={index}` already mis-binds identity on reorder; (2) even with a correct `key={item.id}`, storing `expanded` in the row means the state dies when the virtualizer unmounts the off-screen row — so scrolling away and back silently collapses it. Both failure modes vanish once identity is a stable id *and* the state lives in a keyed store the parent owns (local `Record`, a `Map` in state, or a small Zustand slice for large lists). That store is also what you'd persist to the URL or server for "remember my expanded rows."
