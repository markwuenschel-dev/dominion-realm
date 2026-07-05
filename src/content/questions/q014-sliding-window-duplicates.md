---
title: Sliding Window Duplicate Handling Bug
qid: Q014
order: 14
category: algorithms
language: python
difficulty: mid
summary: A longest-unique-substring window increments left once and never removes from the seen set, so the set no longer matches the window.
tags:
  - sliding-window
  - invariants
draft: false
---

## Prompt

```python
def longest_unique_substring(s: str) -> int:
    seen = set()
    left = 0
    best = 0

    for right, ch in enumerate(s):
        if ch in seen:
            left += 1

        seen.add(ch)
        best = max(best, right - left + 1)

    return best
```

## Task

1. Explain what the function is trying to compute.
2. Find the bug using a concrete input.
3. Propose the **smallest safe fix**.
4. Write two tests.
5. Explain the time complexity of the fixed version.

## Expected answer

The function tries to compute the length of the longest substring with no repeated characters. The bug: when it sees a duplicate, it only increments `left` once and never removes characters from `seen`, so the set no longer represents the current window.

## Failing example

For `"abba"`, the correct answer is `2` (`"ab"` or `"ba"`). The buggy function reports an invalid longer window because `seen` is stale.

## Smallest safe fix

```python
def longest_unique_substring(s: str) -> int:
    seen = set()
    left = 0
    best = 0

    for right, ch in enumerate(s):
        while ch in seen:
            seen.remove(s[left])
            left += 1
        seen.add(ch)
        best = max(best, right - left + 1)

    return best
```

## Regression tests

```python
def test_longest_unique_substring_handles_repeated_middle_char():
    assert longest_unique_substring("abba") == 2

def test_longest_unique_substring_handles_all_unique_and_empty():
    assert longest_unique_substring("abcde") == 5
    assert longest_unique_substring("") == 0
```

## Strong answer signals

- Traces the window state on `"abba"`.
- States the invariant: `seen` must equal the characters in `s[left:right+1]`.
- Uses `while`, not `if`, because multiple removals may be needed.
- Gives O(n) time because each character enters and leaves the window at most once.

## Common traps

- Clearing the whole set on a duplicate (correct-ish but less precise).
- Returning the substring instead of the length without being asked.
- Claiming the nested `while` makes it O(n squared); amortized analysis keeps it O(n).

## Follow-up probe

> How would you modify this to return the actual substring, not just the length?

## Level II stretch — SE II

**Prompt**: Return the substring itself (not just the length), and if several windows tie for the maximum length, return them all in order of appearance. Code + tests.

**Model answer**: Track the window bounds, and collect every window that reaches the current best length:

```python
def longest_unique_substrings(s: str) -> list[str]:
    seen: dict[str, int] = {}       # char -> last index, lets left jump directly
    left = best = 0
    results: list[str] = []

    for right, ch in enumerate(s):
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1     # jump past the previous occurrence
        seen[ch] = right
        length = right - left + 1
        if length > best:
            best, results = length, [s[left : right + 1]]
        elif length == best:
            results.append(s[left : right + 1])
    return results
```

```python
def test_returns_all_max_windows_in_order():
    assert longest_unique_substrings("abcabc") == ["abc", "bca", "cab", "abc"]

def test_single_and_empty():
    assert longest_unique_substrings("aaaa") == ["a", "a", "a", "a"]
    assert longest_unique_substrings("") == []
```

Switching `seen` from a set to a `char -> index` map lets `left` jump straight past the prior occurrence instead of stepping one at a time — still amortized O(n), and it makes "collect all ties" clean.

## Level III stretch — SE III

**Prompt**: Generalize to "longest substring with at most K distinct characters" using the same window discipline. State the invariant and the amortized complexity. Code + tests.

**Model answer**: Keep a count map of characters in the window; when the number of distinct chars exceeds `K`, shrink from the left until it's back to `K`:

```python
from collections import defaultdict

def longest_substring_k_distinct(s: str, k: int) -> int:
    if k <= 0:
        return 0
    counts: dict[str, int] = defaultdict(int)
    left = best = 0

    for right, ch in enumerate(s):
        counts[ch] += 1
        while len(counts) > k:            # invariant: window holds <= k distinct chars
            lch = s[left]
            counts[lch] -= 1
            if counts[lch] == 0:
                del counts[lch]           # drop it so len(counts) tracks distinct count
            left += 1
        best = max(best, right - left + 1)
    return best
```

```python
def test_k_distinct():
    assert longest_substring_k_distinct("eceba", 2) == 3    # "ece"
    assert longest_substring_k_distinct("aa", 1) == 2
    assert longest_substring_k_distinct("abc", 0) == 0
```

The invariant is the whole design: *the window `s[left:right+1]` always contains at most `k` distinct characters, and `counts` is exactly its character histogram.* Every `right` extends the window; the `while` restores the invariant by shrinking left, deleting a key when its count hits zero so `len(counts)` stays equal to the distinct count. Amortized O(n): `left` only ever moves forward, so across the whole run each index is added once and removed once — the nested `while` doesn't make it quadratic. This is the same skeleton as the original problem (which is just the `k = len(alphabet)` / all-distinct case), which is the point worth making to the interviewer: recognize the family, reuse the invariant.
