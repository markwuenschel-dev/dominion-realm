---
title: Optional.get() Turns Not Found into 500
qid: Q005
order: 5
category: backend
language: java
difficulty: mid
summary: An unchecked Optional.get() turns an expected missing-resource case into a 500, and the controller bypasses the service boundary.
tags:
  - error-handling
  - api-semantics
draft: false
---

## Prompt

```java
@GetMapping("/api/reviews/{id}")
public ResponseEntity<ReviewDto> getReview(@PathVariable Long id) {
    Review review = reviewRepository.findById(id).get();
    return ResponseEntity.ok(reviewMapper.toDto(review));
}
```

## Task

1. Explain what the code does when the review exists vs. when it does not.
2. Identify the API design, error-handling, layering, and security issues.
3. Propose the **smallest safe fix** for a pairing session.
4. Write **one focused regression test** that catches the primary bug.
5. Explain the tradeoff between fixing this locally and using a global exception strategy.

## Expected answer

- **Exists**: the repository returns an `Optional`, `.get()` unwraps it, the mapper converts it, the endpoint returns `200 OK`.
- **Missing**: `.get()` throws `NoSuchElementException`, which becomes a generic `500 Internal Server Error`.

A missing resource is a normal API condition and should be a `404 Not Found`, not a server failure.

## Issues

- `Optional.get()` without a presence check creates an avoidable runtime exception.
- A missing row is a domain/API condition, not an unexpected server error.
- The controller calls the repository directly, bypassing the service boundary where authorization, ownership, and audit usually live.
- No structured error response or stable error code.
- No validation on `id`.
- If the resource is user-scoped, returning 404 vs 403 may leak existence information.

## Smallest safe fix

```java
@GetMapping("/api/reviews/{id}")
public ResponseEntity<ReviewDto> getReview(@PathVariable @Positive Long id) {
    return ResponseEntity.ok(reviewService.getReviewDto(id));
}
```

```java
public ReviewDto getReviewDto(Long id) {
    Review review = reviewRepository.findById(id)
        .orElseThrow(() -> new ReviewNotFoundException(id));
    return reviewMapper.toDto(review);
}
```

Map `ReviewNotFoundException` to `404` via the existing handler (or a small local one).

## Regression test

```java
@Test
void getReview_whenReviewDoesNotExist_returns404() throws Exception {
    when(reviewService.getReviewDto(42L)).thenThrow(new ReviewNotFoundException(42L));

    mockMvc.perform(get("/api/reviews/42"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.errorCode").value("REVIEW_NOT_FOUND"));
}
```

## Strong answer signals

- Spots that `.get()` turns an expected missing-resource case into an accidental 500.
- Moves the lookup through a service instead of piling logic into the controller.
- Raises authorization/ownership as a real-world concern.
- The test asserts the HTTP contract, not the repository detail.

## Common traps

- Replacing `.get()` with `.orElse(null)` and creating a later `NullPointerException`.
- Returning `200 OK` with a null body.
- Mapping all exceptions to 404.
- Talking only about Optional style without addressing API semantics.

## Follow-up probe

> For security reasons, product wants unauthorized users to see the same response as missing reviews. Would you return 403 or 404, and how would you keep that behavior consistent?

## Level II stretch — SE II

**Prompt**: Reviews are user-scoped: only the owner may fetch one, and an unauthorized request must be **indistinguishable** from a missing one (both `404`). Implement it in the service so the endpoint can't leak existence. Show the code and a test proving a non-owner gets 404, not 403.

**Model answer**: Fold the ownership check into the same lookup and throw the *same* exception for "missing" and "not yours":

```java
public ReviewDto getReviewDtoFor(Long id, UserId caller) {
    Review review = reviewRepository.findById(id)
        .filter(r -> r.getOwnerId().equals(caller))   // non-owner => empty => 404
        .orElseThrow(() -> new ReviewNotFoundException(id));
    return reviewMapper.toDto(review);
}
```

Using `filter` before `orElseThrow` means a wrong owner and a missing row take the identical path — no timing or status-code oracle. The test:

```java
@Test
void getReview_whenCallerIsNotOwner_returns404NotForbidden() throws Exception {
    Review other = new Review(7L, ownerId("alice"));
    when(reviewRepository.findById(7L)).thenReturn(Optional.of(other));

    mockMvcAs("bob").perform(get("/api/reviews/7"))
        .andExpect(status().isNotFound());   // NOT 403 — existence must not leak
}
```

## Level III stretch — SE III

**Prompt**: "404-not-403 for unauthorized" must hold uniformly across dozens of endpoints, not be re-implemented per handler. Design a small, testable authorization seam that enforces it consistently, and note how you'd stop a new endpoint from regressing it.

**Model answer**: Centralize the decision in a policy object and make "deny looks like missing" the *default* outcome, so an engineer has to opt out deliberately:

```java
interface ResourceAccessPolicy<T> {
    // Return the resource if the caller may see it; otherwise signal "not visible".
    Optional<T> visible(T resource, UserId caller);
}

class OwnerOnlyPolicy implements ResourceAccessPolicy<Review> {
    public Optional<Review> visible(Review r, UserId caller) {
        return r.getOwnerId().equals(caller) ? Optional.of(r) : Optional.empty();
    }
}

// One reusable lookup: not-found and not-authorized converge on the same 404.
<T> T loadVisibleOrNotFound(Optional<T> found, UserId caller, ResourceAccessPolicy<T> policy, Supplier<RuntimeException> notFound) {
    return found.flatMap(r -> policy.visible(r, caller)).orElseThrow(notFound);
}
```

Every read goes through `loadVisibleOrNotFound`, so the leak-prevention is structural, not per-developer vigilance. Enforce it two ways: a `@PostAuthorize`/policy-check convention that reviewers look for, and — the durable guard — a **contract test suite** parameterized over every resource endpoint that asserts "authenticated non-owner receives 404 with an empty body," so a new endpoint that forgets the policy fails CI. The alternative framing (return 403 when the user *should* know the resource exists but lacks permission) is a legitimate product choice; the senior point is that whichever you pick must be one enforced policy, uniformly testable, not scattered `if` statements.
