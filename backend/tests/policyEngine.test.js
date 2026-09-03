import test from "node:test";
import assert from "node:assert/strict";

import { evaluatePolicy } from "../policy/policyEngine.js";
import { setKillSwitch, setCircuitBreaker } from "../policy/safetyState.js";
import { markProcessed } from "../policy/idempotencyStore.js";

test("Policy Engine - 1. All safety checks pass by default", () => {
  setKillSwitch(false);
  setCircuitBreaker(false);

  const payment = { paymentId: "pay_pass_001", retryCount: 0, dnd: false };
  const recoveryDecision = { selectedAction: "RETRY" };

  const result = evaluatePolicy(payment, recoveryDecision);

  assert.equal(result.allowed, true);
  assert.equal(result.blockReason, null);
  assert.equal(result.checks.length, 5);
  assert.ok(result.checks.every((c) => c.passed));
});

test("Policy Engine - 2. Merchant Kill Switch blocks evaluation", () => {
  setKillSwitch(true);

  try {
    const payment = { paymentId: "pay_ks_001", retryCount: 0, dnd: false };
    const recoveryDecision = { selectedAction: "RETRY" };

    const result = evaluatePolicy(payment, recoveryDecision);

    assert.equal(result.allowed, false);
    assert.ok(result.blockReason.includes("Merchant kill switch is active"));
    const check = result.checks.find((c) => c.rule === "MERCHANT_KILL_SWITCH");
    assert.equal(check.passed, false);
  } finally {
    setKillSwitch(false);
  }
});

test("Policy Engine - 3. Circuit Breaker blocks evaluation when open", () => {
  setCircuitBreaker(true);

  try {
    const payment = { paymentId: "pay_cb_001", retryCount: 0, dnd: false };
    const recoveryDecision = { selectedAction: "RETRY" };

    const result = evaluatePolicy(payment, recoveryDecision);

    assert.equal(result.allowed, false);
    assert.ok(result.blockReason.includes("Circuit breaker is open"));
    const check = result.checks.find((c) => c.rule === "CIRCUIT_BREAKER");
    assert.equal(check.passed, false);
  } finally {
    setCircuitBreaker(false);
  }
});

test("Policy Engine - 4. Max Retries blocks RETRY when retryCount >= 2", () => {
  setKillSwitch(false);
  setCircuitBreaker(false);

  const payment = { paymentId: "pay_max_001", retryCount: 2, dnd: false };
  const retryDecision = { selectedAction: "RETRY" };

  const result = evaluatePolicy(payment, retryDecision);

  assert.equal(result.allowed, false);
  assert.ok(result.blockReason.includes("Retry limit reached (2/2)"));
  const check = result.checks.find((c) => c.rule === "MAX_RETRIES");
  assert.equal(check.passed, false);

  // Non-retry action like PAYMENT_LINK should still pass max retries check
  const linkDecision = { selectedAction: "PAYMENT_LINK" };
  const linkResult = evaluatePolicy(payment, linkDecision);
  const linkCheck = linkResult.checks.find((c) => c.rule === "MAX_RETRIES");
  assert.equal(linkCheck.passed, true);
});

test("Policy Engine - 5. DND Compliance blocks evaluation when customer is DND", () => {
  setKillSwitch(false);
  setCircuitBreaker(false);

  const payment = { paymentId: "pay_dnd_001", retryCount: 0, dnd: true };
  const recoveryDecision = { selectedAction: "PAYMENT_LINK" };

  const result = evaluatePolicy(payment, recoveryDecision);

  assert.equal(result.allowed, false);
  assert.ok(result.blockReason.includes("Customer is marked as DND"));
  const check = result.checks.find((c) => c.rule === "DND_COMPLIANCE");
  assert.equal(check.passed, false);
});

test("Policy Engine - 6. Idempotency blocks duplicate processed actions", () => {
  setKillSwitch(false);
  setCircuitBreaker(false);

  const payment = { paymentId: "pay_idem_001", retryCount: 0, dnd: false };
  const recoveryDecision = { selectedAction: "PAYMENT_LINK" };

  // First evaluation - not processed yet
  const result1 = evaluatePolicy(payment, recoveryDecision);
  assert.equal(result1.allowed, true);

  // Mark processed in idempotency store
  markProcessed(result1.idempotencyKey);

  // Second evaluation - should block due to idempotency
  const result2 = evaluatePolicy(payment, recoveryDecision);
  assert.equal(result2.allowed, false);
  assert.ok(result2.blockReason.includes("already been processed"));
  const check = result2.checks.find((c) => c.rule === "IDEMPOTENCY");
  assert.equal(check.passed, false);
});

test("Policy Engine - 7. Multiple rule failures consolidate blockReason", () => {
  setKillSwitch(true);

  try {
    const payment = { paymentId: "pay_multi_001", retryCount: 2, dnd: true };
    const recoveryDecision = { selectedAction: "RETRY" };

    const result = evaluatePolicy(payment, recoveryDecision);

    assert.equal(result.allowed, false);
    assert.ok(result.blockReason.includes("Merchant kill switch is active"));
    assert.ok(result.blockReason.includes("Retry limit reached"));
    assert.ok(result.blockReason.includes("Customer is marked as DND"));
    assert.equal(result.reasons.length, 3);
  } finally {
    setKillSwitch(false);
  }
});
