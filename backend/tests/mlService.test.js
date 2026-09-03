import test from "node:test";
import assert from "node:assert/strict";

import { predictRecoveryProbability } from "../services/mlService.js";
import { calculateRecoveryDecision } from "../ev/evEngine.js";
import { ACTIONS } from "../ev/actionCandidates.js";
import { evaluatePolicy } from "../policy/policyEngine.js";
import { setKillSwitch } from "../policy/safetyState.js";
import { setExecutionMode } from "../shadow/modeManager.js";
import { routeRecovery } from "../shadow/executionRouter.js";

test("A. ML service returns a probability successfully", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ probability_success: 0.78 })
  });

  try {
    const value = await predictRecoveryProbability({
      errorCode: "E01",
      amount: 1499,
      retryCount: 0,
      gatewayHealth: 0.91,
      timeSinceFailure: 20,
      customerHistory: 0.83,
      previousAttemptResult: 0
    });

    assert.equal(value, 0.78);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("B. Node receives P(success)", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ probability_success: 0.81 })
  });

  try {
    const decision = await calculateRecoveryDecision(
      {
        paymentId: "pay_123",
        amount: 2000,
        errorCode: "E01",
        retryCount: 0,
        gatewayHealth: 0.91,
        timeSinceFailure: 20,
        customerHistory: 0.83,
        previousAttemptResult: 0
      },
      { category: "BANK_OR_TEMPORARY_SYSTEM_ISSUE" }
    );

    assert.equal(decision.probabilitySuccess, 0.81);
    assert.equal(decision.selectedProbability, 0.91);
    assert.ok(decision.selectedAction);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("C. EV uses the ML probability instead of a hardcoded value", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ probability_success: 0.75 })
  });

  try {
    const decision = await calculateRecoveryDecision(
      {
        paymentId: "pay_456",
        amount: 1000,
        errorCode: "E02",
        retryCount: 0,
        gatewayHealth: 0.85,
        timeSinceFailure: 15,
        customerHistory: 0.6,
        previousAttemptResult: 0
      },
      { category: "CUSTOMER_PAYMENT_FRICTION" }
    );

    // E02 PAYMENT_LINK adjustment +0.05 gives 0.80 prob, EV = 0.80 * 1000 - 5 = 795
    assert.equal(decision.selectedExpectedValue, 795);
    assert.equal(decision.probabilitySuccess, 0.75);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("D. ML service unavailable → safe failure using calibrated fallback", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Service unavailable");
  };

  try {
    const decision = await calculateRecoveryDecision(
      {
        paymentId: "pay_789",
        amount: 5000,
        errorCode: "E99",
        retryCount: 0,
        gatewayHealth: 0.6,
        timeSinceFailure: 30,
        customerHistory: 0.7,
        previousAttemptResult: 0
      },
      { category: "SYSTEMIC_GATEWAY_FAILURE" }
    );

    assert.equal(decision.probabilitySuccess, 0.15);
    assert.ok(decision.selectedAction);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("E. Invalid probability → safe fallback", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ probability_success: 1.5 })
  });

  try {
    const decision = await calculateRecoveryDecision(
      {
        paymentId: "pay_invalid",
        amount: 3500,
        errorCode: "E01",
        retryCount: 0,
        gatewayHealth: 0.9,
        timeSinceFailure: 18,
        customerHistory: 0.8,
        previousAttemptResult: 0
      },
      { category: "BANK_OR_TEMPORARY_SYSTEM_ISSUE" }
    );

    assert.equal(decision.probabilitySuccess, 0.65);
    assert.ok(decision.selectedAction);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("F. Kill Switch ON → no execution even when P(success) and EV are high", async () => {
  setKillSwitch(true);

  const decision = {
    paymentId: "pay_kill",
    paymentValue: 1500,
    candidates: [{ action: ACTIONS.PAYMENT_LINK, cost: 5, probability: 0.9, expectedValue: 1345 }],
    selectedAction: ACTIONS.PAYMENT_LINK,
    selectedProbability: 0.9,
    selectedExpectedValue: 1345
  };

  const policyDecision = evaluatePolicy(
    { paymentId: "pay_kill", amount: 1500, retryCount: 0, dnd: false },
    decision
  );

  assert.equal(policyDecision.allowed, false);
  assert.ok(policyDecision.reasons.some((reason) => reason.includes("kill switch")));

  setKillSwitch(false);
});

test("G. Shadow Mode → decision is generated but no execution occurs", async () => {
  setExecutionMode("SHADOW");

  const decision = {
    paymentId: "pay_shadow",
    paymentValue: 1000,
    candidates: [{ action: ACTIONS.PAYMENT_LINK, cost: 5, probability: 0.8, expectedValue: 795 }],
    selectedAction: ACTIONS.PAYMENT_LINK,
    selectedProbability: 0.8,
    selectedExpectedValue: 795
  };

  const policyDecision = evaluatePolicy(
    { paymentId: "pay_shadow", amount: 1000, retryCount: 0, dnd: false },
    decision
  );

  const result = await routeRecovery({
    payment: { paymentId: "pay_shadow", amount: 1000 },
    diagnosis: { category: "TEST" },
    recoveryDecision: decision,
    policyDecision
  });

  assert.equal(result.executed, false);
  assert.equal(result.mode, "SHADOW");
  setExecutionMode("SHADOW");
});
