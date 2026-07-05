---
title: Transactional Side Effect Before Commit
qid: Q007
order: 7
category: backend
language: java
difficulty: senior
summary: An email is sent inside a DB transaction — if the transaction rolls back after, the user gets an approval email for a review that isn't approved.
tags:
  - transactions
  - outbox
draft: false
---

## Prompt

```java
@Transactional
public void approveReview(Long reviewId, String approverEmail) {
    Review review = reviewRepository.findById(reviewId)
        .orElseThrow(() -> new ReviewNotFoundException(reviewId));

    review.approve(approverEmail);
    emailClient.sendApprovalEmail(review.getSubmitterEmail(), review.getId());
    auditRepository.save(AuditEvent.reviewApproved(review.getId(), approverEmail));
}
```

## Task

1. Explain what this code does in order.
2. Identify what can go wrong if the transaction rolls back after the email is sent.
3. Propose the **smallest safe fix**.
4. Describe a regression/integration test strategy.
5. Explain when you'd use `TransactionSynchronization`, domain events, or an outbox table.

## Expected answer

The method mutates review state, sends an email, then saves an audit event in one transaction. The email is an external side effect that can't be rolled back. If the DB transaction later fails, the user receives an approval email for a review that is not actually approved.

## Issues

- External side effect happens before commit.
- Email failure can also roll back the DB transaction.
- The audit event may not persist if email fails first.
- No retry / dead-letter strategy for email.
- State transition and side effect are coupled, making it hard to test.

## Smallest safe fix

Publish an event after the state change and send the email only after commit.

```java
@Transactional
public void approveReview(Long reviewId, String approverEmail) {
    Review review = reviewRepository.findById(reviewId)
        .orElseThrow(() -> new ReviewNotFoundException(reviewId));

    review.approve(approverEmail);
    auditRepository.save(AuditEvent.reviewApproved(review.getId(), approverEmail));
    eventPublisher.publishEvent(new ReviewApprovedEvent(review.getId()));
}
```

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void sendApprovalEmail(ReviewApprovedEvent event) {
    Review review = reviewRepository.findById(event.reviewId()).orElseThrow();
    emailClient.sendApprovalEmail(review.getSubmitterEmail(), review.getId());
}
```

For higher reliability, use an outbox table rather than in-memory event delivery.

## Regression / verification

- Integration test: force `auditRepository.save` to fail after `review.approve`; assert the email client was **not** called.
- Outbox test: approving a review writes one outbox row in the same transaction; a worker later sends the email and marks the row sent.

## Strong answer signals

- Names the exact issue: a non-transactional side effect inside a DB transaction.
- Doesn't pretend email can be rolled back.
- Offers an incremental fix and a more reliable outbox design.
- Discusses retry, idempotency, and duplicate-email prevention.

## Common traps

- "Just put email last" — still fails if commit fails after the method returns.
- Catching email exceptions and ignoring them with no delivery strategy.
- Making the whole method non-transactional.

## Follow-up probe

> If the email worker retries after a timeout, how do you prevent duplicate emails?

## Level II stretch — SE II

**Prompt**: `AFTER_COMMIT` in-memory delivery still drops the email if the app crashes between commit and send. Convert to a **transactional outbox**: write an outbox row in the same transaction, and a worker polls and sends. Show the outbox insert, the worker loop, and the dedupe key.

**Model answer**: The state change and the intent-to-send commit atomically, so the email survives a crash:

```java
@Transactional
public void approveReview(Long reviewId, String approverEmail) {
    Review review = reviewRepository.findById(reviewId).orElseThrow();
    review.approve(approverEmail);
    auditRepository.save(AuditEvent.reviewApproved(review.getId(), approverEmail));
    outboxRepository.save(OutboxEvent.approvalEmail(
        /* dedupeKey */ "approval-" + review.getId(),
        review.getSubmitterEmail(), review.getId()));   // same tx as approve()
}
```

```java
@Scheduled(fixedDelay = 2000)
void drainOutbox() {
    for (OutboxEvent e : outboxRepository.findUnsent(BATCH)) {
        try {
            emailClient.sendApprovalEmail(e.recipient(), e.reviewId(), e.dedupeKey());
            outboxRepository.markSent(e.id());
        } catch (Exception ex) {
            outboxRepository.incrementAttempts(e.id());  // retried next tick; DLQ after N
        }
    }
}
```

The `dedupeKey` (`approval-<reviewId>`) is the linchpin: the worker is **at-least-once**, so the email provider must treat the key as idempotent (or the worker checks "already sent for this key"). `markSent` and the send aren't atomic, so a crash between them causes a re-send — which the dedupe key absorbs.

## Level III stretch — SE III

**Prompt**: Make delivery exactly-once-*ish* end to end. Design the outbox schema and worker as a small state machine, and state precisely where idempotency, retries, ordering, and poison-message handling live.

**Model answer**: You cannot get true exactly-once across a DB and an email provider, so the design is **at-least-once + idempotent consumer**, made observable.

```sql
CREATE TABLE outbox (
    id           BIGSERIAL PRIMARY KEY,
    dedupe_key   TEXT UNIQUE NOT NULL,   -- provider-side idempotency key
    payload      JSONB NOT NULL,
    status       TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING|SENDING|SENT|FAILED
    attempts     INT  NOT NULL DEFAULT 0,
    next_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

State machine: `PENDING → SENDING → SENT`, with `SENDING → PENDING` on transient failure (backoff via `next_attempt`, exponential) and `→ FAILED` (dead-letter) after N attempts. Concurrency-safe claim so multiple workers don't double-send the same row:

```sql
UPDATE outbox SET status='SENDING', attempts=attempts+1
WHERE id IN (
  SELECT id FROM outbox
  WHERE status='PENDING' AND next_attempt <= now()
  ORDER BY id
  FOR UPDATE SKIP LOCKED       -- each worker grabs a disjoint batch
  LIMIT 50
) RETURNING *;
```

Where each concern lives: **idempotency** at the provider boundary via `dedupe_key` (a re-send is a no-op); **retries** in the `attempts`/`next_attempt`/backoff columns; **ordering** — only guaranteed per-key if you need it (add a partition key and process a key serially), otherwise best-effort; **poison messages** move to `FAILED` and alert, so one bad row never blocks the queue. The honest framing for the interviewer: "exactly-once delivery" is a fiction — you get exactly-once *effect* by pairing at-least-once delivery with an idempotent consumer, and you make the whole thing debuggable with per-status metrics and a dead-letter alarm.
