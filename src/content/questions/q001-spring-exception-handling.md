---
title: Spring REST Controller Broad Exception Handling
qid: Q001
order: 1
category: backend
language: java
difficulty: mid
summary: A controller catches every exception and returns 400 with the raw message — breaking HTTP semantics, leaking internals, and blinding on-call.
tags:
  - error-handling
  - http-semantics
draft: false
---

## Prompt

```java
@PostMapping("/api/retrieve")
public ResponseEntity<?> retrieve(@RequestBody RetrieveRequest request) {
    try {
        return ResponseEntity.ok(service.retrieve(request.query()));
    } catch (Exception e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}
```

## Task

1. Explain what the code does for a successful call vs. when the service throws a runtime exception (e.g. `NullPointerException` or a custom `BusinessException`).
2. Identify **all** the design, security, observability, and HTTP-semantics issues.
3. Propose the **smallest safe fix** you would apply during a pairing session.
4. Write **one focused regression test** (JUnit + MockMvc) that would have caught the primary problem.
5. Explain the tradeoff between your minimal fix and a full `@ControllerAdvice` + structured error strategy.

## Expected answer

- **Success path**: deserializes the request, calls the service, wraps the result in `200 OK` with a JSON body.
- **Error path**: any exception (unchecked, `Error`s, custom business errors) is caught and turned into `400 Bad Request` containing the raw `e.getMessage()` string. Nothing is logged. The `?` wildcard return type loses type safety.

## Issues (priority order)

- **HTTP semantics violation**: server errors (5xx) and client errors (4xx) both map to 400. Clients and load balancers can't distinguish a retryable server failure from a bad request.
- **Information disclosure**: raw exception messages leak internal implementation details, package names, or sensitive data.
- **Observability black hole**: no logging, no correlation/trace id, no metric on the error path. On-call is flying blind.
- **Overly broad catch**: catches `Throwable` territory (`OutOfMemoryError`, `StackOverflowError`) — swallows bugs instead of failing fast.
- **No validation boundary**: malformed or malicious input reaches the service before any guard.
- **Poor client DX**: the frontend receives a plain string instead of a structured `{ errorCode, message, traceId }` payload.
- **Type safety**: `ResponseEntity<?>` + raw string body is sloppy versus a typed success/error DTO.

## Smallest safe fix

```java
@PostMapping("/api/retrieve")
public ResponseEntity<RetrieveResponse> retrieve(@RequestBody @Valid RetrieveRequest request) {
    try {
        return ResponseEntity.ok(service.retrieve(request.query()));
    } catch (BusinessException | ValidationException ex) {
        log.warn("Business/validation error in retrieve", ex);
        return ResponseEntity.badRequest()
            .body(new ErrorResponse("BUSINESS_ERROR", ex.getMessage()));
    } catch (Exception ex) {
        log.error("Unexpected error in retrieve [traceId={}]", MDC.get("traceId"), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred. Reference trace id for support."));
    }
}
```

Add `@Valid` on the request and a small `ErrorResponse` record.

## One regression test (MockMvc)

```java
@Test
void retrieve_whenServiceThrowsUnexpectedException_returns500WithSanitizedBody() throws Exception {
    when(service.retrieve(any())).thenThrow(new RuntimeException("secret stack trace"));

    mockMvc.perform(post("/api/retrieve")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"query\":\"foo\"}"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.errorCode").value("INTERNAL_ERROR"))
        .andExpect(jsonPath("$.message", not(containsString("secret"))));
}
```

## Strong answer signals

- Calls out status-code misuse and information leakage first (security + ops impact).
- Mentions observability (logging + trace context) unprompted.
- Proposes the smallest change that still improves things rather than "rewrite with global advice."
- The test asserts status, structured body, and non-leakage of sensitive info.
- Acknowledges `@ControllerAdvice` is better long-term but explains why the local fix is fine for a hotfix.

## Common traps

- "It's defensive programming — it stops the app from crashing." (Ignores that it hides real bugs and breaks the HTTP contract.)
- Mentioning only the broad catch and stopping.
- Over-engineering (full global handler + custom exceptions + RFC 9457 ProblemDetail) when the ask is the minimal safe delta.
- Forgetting to log the exception — the one thing on-call needs most.

## Follow-up probe

> Your service now throws a new `RateLimitExceededException` that should return `429`. How does your current fix behave, and what is the minimal change to support classified error responses without duplicating code across controllers?

## Level II stretch — SE II

**Prompt**: Add `RateLimitExceededException` (must return `429` with a `Retry-After` header). Refactor so the mapping from exception to (status, code) lives in **one** place instead of being duplicated per `catch` in every controller. Show the code.

**Model answer**: Lift classification into a `@ControllerAdvice` so controllers hold only happy-path logic. A single mapping table (or a sealed exception hierarchy each knowing its own status) keeps it DRY:

```java
@RestControllerAdvice
class ApiErrorHandler {

    @ExceptionHandler(RateLimitExceededException.class)
    ResponseEntity<ErrorResponse> onRateLimit(RateLimitExceededException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(HttpHeaders.RETRY_AFTER, Long.toString(ex.retryAfterSeconds()))
            .body(new ErrorResponse("RATE_LIMITED", "Too many requests. Retry later."));
    }

    @ExceptionHandler({ BusinessException.class, ValidationException.class })
    ResponseEntity<ErrorResponse> onBusiness(RuntimeException ex) {
        log.warn("Business/validation error", ex);
        return ResponseEntity.badRequest().body(new ErrorResponse("BUSINESS_ERROR", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> onUnexpected(Exception ex) {
        log.error("Unexpected error [traceId={}]", MDC.get("traceId"), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred."));
    }
}
```

Now the controller's `try/catch` disappears entirely, and adding a new classified error is a single new handler — no per-controller edits. Note that `@ControllerAdvice` handlers are matched most-specific-first, so `RateLimitExceededException` wins over the generic `Exception` catch-all.

## Level III stretch — SE III

**Prompt**: The same errors must surface consistently across three transports in the org — Spring MVC, WebFlux, and gRPC. Design a shared classification module so "given a throwable, decide the public response" lives once and each transport only adapts it. Sketch the core interface + one adapter, and note what stays transport-specific.

**Model answer**: Separate *policy* (classify a throwable → a transport-neutral outcome) from *mechanism* (write it onto a given transport). The classifier is pure and unit-testable; adapters are thin.

```java
// Transport-neutral outcome — no HTTP/gRPC types here.
record ErrorOutcome(String code, ErrorCategory category, String publicMessage, Duration retryAfter) {}
enum ErrorCategory { CLIENT, RATE_LIMIT, SERVER }

interface ErrorClassifier {
    ErrorOutcome classify(Throwable t);  // the single source of truth
}

// MVC adapter maps category -> HTTP status; a gRPC adapter maps to Status codes.
class HttpErrorAdapter {
    ResponseEntity<ErrorResponse> toResponse(ErrorOutcome o) {
        HttpStatus status = switch (o.category()) {
            case CLIENT -> HttpStatus.BAD_REQUEST;
            case RATE_LIMIT -> HttpStatus.TOO_MANY_REQUESTS;
            case SERVER -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
        var builder = ResponseEntity.status(status);
        if (o.retryAfter() != null) builder.header(HttpHeaders.RETRY_AFTER, Long.toString(o.retryAfter().toSeconds()));
        return builder.body(new ErrorResponse(o.code(), o.publicMessage()));
    }
}
```

The classifier decides *what* (code, category, whether it's retryable, the sanitized public message); each adapter decides *how* to express that on its wire (`ResponseEntity` here, `StatusRuntimeException` + trailers for gRPC, `onErrorResume` + `ServerResponse` for WebFlux). What stays transport-specific: the actual status/Status-code mapping and header/trailer mechanics. What's now shared and consistent: the taxonomy, the public-vs-internal message split, and the retry semantics — so an external partner never has to parse three different error shapes. This is where a platform team earns its keep: one classifier, three thin adapters, one contract.
