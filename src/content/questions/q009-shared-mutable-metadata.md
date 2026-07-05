---
title: Shared Mutable Metadata Bug in RAG Chunking
qid: Q009
order: 9
category: python-ml
language: python
difficulty: mid
summary: Every chunk reuses and mutates the same metadata dict, so all rows end up with the last chunk_index — and the source document is corrupted too.
tags:
  - aliasing
  - mutation
draft: false
---

## Prompt

```python
def chunk_documents(documents: list[Document]) -> list[dict]:
    rows = []

    for doc in documents:
        metadata = doc.metadata
        chunks = split_text(doc.text, chunk_size=500, overlap=50)

        for i, chunk in enumerate(chunks):
            metadata["chunk_index"] = i
            metadata["chunk_count"] = len(chunks)
            rows.append({
                "text": chunk,
                "metadata": metadata,
            })

    return rows
```

## Task

1. Explain what the function intends to produce.
2. Identify the mutable-aliasing bug and how it corrupts chunk metadata.
3. Propose the **smallest safe fix**.
4. Write one regression test.
5. Explain why this matters for retrieval evaluation and citation accuracy.

## Expected answer

The function intends to produce one row per chunk with metadata such as source document and chunk index. But `metadata = doc.metadata` reuses the **same dictionary object** for every chunk of the document. Each loop mutates that one dict, so all rows end up with the final `chunk_index`, and the original `doc.metadata` is mutated too.

## Issues

- Shared mutable dictionary across all rows.
- Original document metadata modified as a side effect.
- Chunk indexes/citations can point to the wrong location.
- Nested metadata objects would remain shared even after a shallow copy.
- Retrieval evals and audit logs become untrustworthy.

## Smallest safe fix

```python
def chunk_documents(documents: list[Document]) -> list[dict]:
    rows = []

    for doc in documents:
        chunks = split_text(doc.text, chunk_size=500, overlap=50)

        for i, chunk in enumerate(chunks):
            metadata = {
                **doc.metadata,
                "chunk_index": i,
                "chunk_count": len(chunks),
            }
            rows.append({"text": chunk, "metadata": metadata})

    return rows
```

If metadata has nested mutable values, use `copy.deepcopy(doc.metadata)` before adding chunk fields.

## Regression test

```python
def test_chunk_documents_uses_independent_metadata_per_chunk():
    doc = Document(text="alpha beta gamma delta epsilon", metadata={"document_id": "doc-1"})

    rows = chunk_documents([doc])

    assert rows[0]["metadata"] is not rows[1]["metadata"]
    assert rows[0]["metadata"]["chunk_index"] == 0
    assert rows[1]["metadata"]["chunk_index"] == 1
    assert "chunk_index" not in doc.metadata     # original untouched
```

## Strong answer signals

- Spots aliasing/mutation, not just "add more metadata."
- Connects the bug to wrong citations and evaluation contamination.
- Discusses shallow vs. deep copy.
- Writes a test asserting object identity and values.

## Common traps

- Copying the metadata once per document instead of once per chunk.
- Ignoring mutation of the original `doc.metadata`.
- Treating it as harmless because "the text is still correct."

## Follow-up probe

> If metadata includes a nested `source` object with page ranges, when is a shallow copy insufficient?

## Level II stretch — SE II

**Prompt**: Metadata now has a nested `source` dict with a mutable `page_range` list. Show the bug the shallow-copy fix (`{**doc.metadata, ...}`) still has, fix it minimally, and write a test proving both the original doc and sibling chunks are unaffected.

**Model answer**: A shallow spread copies the top level but **shares the nested `source` object**, so mutating `page_range` on one chunk mutates it everywhere:

```python
# Still buggy: source is shared across chunks and with doc.metadata
md = {**doc.metadata, "chunk_index": i}
md["source"]["page_range"].append(page)   # mutates the shared nested list!
```

Minimal correct fix — deep-copy the nested part you touch (or the whole metadata):

```python
import copy

for i, chunk in enumerate(chunks):
    metadata = copy.deepcopy(doc.metadata)          # independent nesting
    metadata["chunk_index"] = i
    metadata["chunk_count"] = len(chunks)
    metadata["source"]["page_range"] = page_range_for(chunk)
    rows.append({"text": chunk, "metadata": metadata})
```

```python
def test_nested_source_is_independent_per_chunk():
    doc = Document(text="a b c d", metadata={"source": {"page_range": [1]}})
    rows = chunk_documents([doc])
    rows[0]["metadata"]["source"]["page_range"].append(99)
    assert rows[1]["metadata"]["source"]["page_range"] == [1]   # sibling unaffected
    assert doc.metadata["source"]["page_range"] == [1]          # original untouched
```

`deepcopy` is the right default when nesting exists; if hot-path cost matters, copy only the specific nested keys you mutate.

## Level III stretch — SE III

**Prompt**: Make correctness structural instead of relying on remembering to copy. Redesign so chunk metadata *can't* alias, and back it with a test that fuzzes nesting depth. Sketch it.

**Model answer**: Replace the mutable dict with an **immutable value object** that copies on construction, so there's no shared mutable state to leak:

```python
from dataclasses import dataclass, replace
from types import MappingProxyType
import copy

@dataclass(frozen=True)
class ChunkMetadata:
    document_id: str
    source: dict          # deep-copied on build; exposed read-only
    chunk_index: int = 0
    chunk_count: int = 0

    @staticmethod
    def for_chunk(base: dict, i: int, n: int) -> "ChunkMetadata":
        return ChunkMetadata(
            document_id=base["document_id"],
            source=copy.deepcopy(base.get("source", {})),
            chunk_index=i,
            chunk_count=n,
        )
```

`frozen=True` blocks accidental attribute reassignment; building each chunk's metadata through `for_chunk` deep-copies the nested `source` exactly once, at the one seam. Derivations use `replace(md, chunk_index=j)` rather than in-place mutation. Wrapping dict-typed fields in `MappingProxyType` makes even nested reads read-only. Back it with a property-based test:

```python
from hypothesis import given, strategies as st

@given(depth=st.integers(1, 5))
def test_chunk_metadata_never_aliases(depth):
    base = nested_dict(depth)                      # fuzz arbitrary nesting
    a = ChunkMetadata.for_chunk(base, 0, 2)
    b = ChunkMetadata.for_chunk(base, 1, 2)
    mutate_deep(a.source)                          # scribble on a's nested source
    assert b.source == base["source"]              # b and the original are pristine
```

The senior point: the original bug is a *class* of defect (shared mutable state), and vigilance ("remember to `deepcopy`") doesn't scale across a team. Making the type immutable-by-construction removes the failure mode entirely, and the property test guards it against future nesting the author never imagined — which is exactly where wrong citations and contaminated evals come from.
