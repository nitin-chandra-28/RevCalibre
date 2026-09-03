import { isKillSwitchActive, isCircuitBreakerOpen } from "./safetyState.js";

import { hasProcessed } from "./idempotencyStore.js";

const MAX_RETRIES = 2;

export function evaluatePolicy(payment = {}, recoveryDecision = {}) {
  const action = recoveryDecision?.selectedAction || "DO_NOTHING";

  const reasons = [];
  const checks = [];

  // --------------------------------------------------
  // 1. MERCHANT KILL SWITCH
  // --------------------------------------------------

  if (isKillSwitchActive()) {
    checks.push({
      rule: "MERCHANT_KILL_SWITCH",
      passed: false
    });

    reasons.push("Merchant kill switch is active.");
  } else {
    checks.push({
      rule: "MERCHANT_KILL_SWITCH",
      passed: true
    });
  }

  // --------------------------------------------------
  // 2. CIRCUIT BREAKER
  // --------------------------------------------------

  if (isCircuitBreakerOpen()) {
    checks.push({
      rule: "CIRCUIT_BREAKER",
      passed: false
    });

    reasons.push("Circuit breaker is open.");
  } else {
    checks.push({
      rule: "CIRCUIT_BREAKER",
      passed: true
    });
  }

  // --------------------------------------------------
  // 3. MAX RETRIES
  // --------------------------------------------------

  const isRetryAction =
    action === "RETRY" ||
    action === "RETRY_AFTER_DELAY";

  const retryCount = Number(payment?.retryCount ?? 0);

  if (isRetryAction) {
    if (retryCount >= MAX_RETRIES) {
      checks.push({
        rule: "MAX_RETRIES",
        passed: false,
        retryCount,
        maxRetries: MAX_RETRIES
      });

      reasons.push(
        `Retry limit reached (${retryCount}/${MAX_RETRIES}).`
      );
    } else {
      checks.push({
        rule: "MAX_RETRIES",
        passed: true,
        retryCount,
        maxRetries: MAX_RETRIES
      });
    }
  } else {
    checks.push({
      rule: "MAX_RETRIES",
      passed: true,
      retryCount,
      maxRetries: MAX_RETRIES
    });
  }

  // --------------------------------------------------
  // 4. DND COMPLIANCE
  // --------------------------------------------------

  const dndActive = payment?.dnd === true;

  if (dndActive) {
    checks.push({
      rule: "DND_COMPLIANCE",
      passed: false
    });

    reasons.push("Customer is marked as DND.");
  } else {
    checks.push({
      rule: "DND_COMPLIANCE",
      passed: true
    });
  }

  // --------------------------------------------------
  // 5. IDEMPOTENCY
  // --------------------------------------------------

  const paymentId = payment?.paymentId || "unknown";
  const idempotencyKey =
    `recovery:${paymentId}:${action}`;

  if (hasProcessed(idempotencyKey)) {
    checks.push({
      rule: "IDEMPOTENCY",
      passed: false,
      key: idempotencyKey
    });

    reasons.push(
      "Recovery action has already been processed."
    );
  } else {
    checks.push({
      rule: "IDEMPOTENCY",
      passed: true,
      key: idempotencyKey
    });
  }

  // --------------------------------------------------
  // 6. FINAL POLICY DECISION
  // --------------------------------------------------

  const allowed = checks.every(
    (check) => check.passed
  );

  const blockReason = reasons.length > 0 ? reasons.join("; ") : null;

  // IMPORTANT:
  // Do NOT mark the action as processed here.
  // Policy evaluation is not execution.
  // The execution layer will mark it processed
  // only after Razorpay successfully creates
  // the recovery action.

  return {
    allowed,
    action,
    reasons,
    blockReason,
    checks,
    idempotencyKey
  };
}