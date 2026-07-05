---
title: Test Verifies Implementation, Not Behavior
qid: Q015
order: 15
category: testing
language: java
difficulty: mid
summary: A test only verifies that save() was called, so it passes even if the review is never actually approved.
tags:
  - test-quality
  - mocking
draft: false
---

## Prompt

```java
@Test
void approveReview_savesReview() {
    Review review = new Review(123L, ReviewStatus.PENDING);
    when(reviewRepository.findById(123L)).thenReturn(Optional.of(review));

    reviewService.approveReview(123L, "qa@example.com");

    verify(reviewRepository).save(review);
}
```

## Task

1. Explain what this test verifies.
2. Identify why it is weak or misleading.
3. Propose a better behavior-focused test.
4. Explain when verifying collaborator calls is useful.
5. Explain how this test could pass while the feature is still broken.

## Expected answer

The test verifies that `save(review)` was called. It does not verify that the review was actually approved, that the approver was recorded, that invalid states are rejected, that audit behavior occurs, or that the persisted object holds the right state.

## Issues

- Over-coupled to implementation details.
- Could pass even if `review.approve(...)` is never called.
- Doesn't assert the domain outcome.
- Doesn't test failure paths.
- Encourages brittle tests during refactoring.

## Better test

```java
@Test
void approveReview_whenPending_marksApprovedAndRecordsApprover() {
    Review review = new Review(123L, ReviewStatus.PENDING);
    when(reviewRepository.findById(123L)).thenReturn(Optional.of(review));

    reviewService.approveReview(123L, "qa@example.com");

    assertThat(review.getStatus()).isEqualTo(ReviewStatus.APPROVED);
    assertThat(review.getApprovedBy()).isEqualTo("qa@example.com");
    assertThat(review.getApprovedAt()).isNotNull();
}
```

For an integration test, persist the review, call the service, reload from the database, and assert the final state.

## Strong answer signals

- Names behavior vs. implementation verification.
- Writes assertions on the observable outcome.
- Keeps mock verification for true side effects (email, event publishing, external calls).
- Mentions failure-path tests.

## Common traps

- Saying "all mocks are bad."
- Only adding more `verify(...)` calls.
- Ignoring the domain invariant.

## Follow-up probe

> What would you test at the unit level versus the integration level for this approval workflow?

## Level II stretch — SE II

**Prompt**: Write the failure-path and side-effect tests the original missed: approving an already-approved review, approving a missing review, and that the approval email/event fires **exactly once** — using mock `verify` only for the genuine side effect. Show the tests.

**Model answer**: Assert domain outcomes with real objects; reserve `verify` for the true edge (the event/email):

```java
@Test
void approveReview_whenAlreadyApproved_isRejected() {
    Review review = new Review(1L, ReviewStatus.APPROVED);
    when(reviewRepository.findById(1L)).thenReturn(Optional.of(review));

    assertThatThrownBy(() -> reviewService.approveReview(1L, "qa@example.com"))
        .isInstanceOf(IllegalStateException.class);
    verify(eventPublisher, never()).publishEvent(any());   // no side effect on rejection
}

@Test
void approveReview_whenMissing_throwsNotFound() {
    when(reviewRepository.findById(9L)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> reviewService.approveReview(9L, "qa@example.com"))
        .isInstanceOf(ReviewNotFoundException.class);
}

@Test
void approveReview_whenPending_publishesApprovalEventExactlyOnce() {
    Review review = new Review(2L, ReviewStatus.PENDING);
    when(reviewRepository.findById(2L)).thenReturn(Optional.of(review));

    reviewService.approveReview(2L, "qa@example.com");

    verify(eventPublisher, times(1)).publishEvent(any(ReviewApprovedEvent.class));
}
```

The discipline: `assertThat` on state for *what the feature does*, and `verify` only for *effects you can't observe through state* — the event publish. `verify(save())` from the original tells you nothing about correctness; `times(1)` on the event guards against a double-send regression that state assertions couldn't see.

## Level III stretch — SE III

**Prompt**: Design the whole test strategy for the approval feature across the pyramid. State what each layer owns and why, and where mock-`verify` legitimately belongs. Sketch the three tests.

**Model answer**: Push logic down to where it's cheapest to test, and let each layer assert only what it owns:

```java
// 1) Pure domain unit test — the state machine, no framework, milliseconds.
@Test void approve_movesPendingToApprovedAndStampsApprover() {
    Review r = Review.pending(1L);
    r.approve("qa@example.com");
    assertThat(r.getStatus()).isEqualTo(APPROVED);
    assertThat(r.getApprovedBy()).isEqualTo("qa@example.com");
    // Rejects illegal transitions right here, closest to the invariant.
    assertThatThrownBy(() -> r.approve("x")).isInstanceOf(IllegalStateException.class);
}

// 2) Service test with fakes — orchestration + the side-effect edge.
@Test void approveReview_publishesEventAfterStateChange() {
    var svc = new ReviewService(new InMemoryReviewRepo(Review.pending(2L)), eventPublisher);
    svc.approveReview(2L, "qa@example.com");
    verify(eventPublisher, times(1)).publishEvent(any(ReviewApprovedEvent.class)); // edge only
}

// 3) One integration test — real DB, reload proves persistence + mapping.
@Test void approveReview_persistsApprovedState() {
    Long id = seedPendingReview();
    reviewService.approveReview(id, "qa@example.com");
    assertThat(reviewRepository.findById(id).orElseThrow().getStatus()).isEqualTo(APPROVED);
}
```

Ownership: the **domain unit test** owns the state machine and every illegal transition — fast, exhaustive, no mocks. The **service test** owns orchestration (lookup → mutate → publish) and is the *only* place `verify` is appropriate, because the event is a true side effect with no observable state. The **integration test** owns the one thing the others fake away: that the state actually round-trips through the DB (mapping, transaction, constraints) — so exactly one, reloaded from the database. The anti-pattern the original test embodies is testing the *middle* (a collaborator call) while asserting nothing at the *edges* (domain outcome, persistence). Most behavior lives in the fast pure layer; mocks shrink to the genuine boundaries.
