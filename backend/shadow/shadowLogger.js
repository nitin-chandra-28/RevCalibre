const shadowDecisions = [];

export function logShadowDecision({
  payment,
  diagnosis,
  recoveryDecision,
  policyDecision
}) {
  const probability =
    recoveryDecision?.selectedProbability ??
    recoveryDecision?.probability ??
    null;

  const expectedValue =
    recoveryDecision?.selectedExpectedValue ??
    recoveryDecision?.expectedValue ??
    null;

  const hypotheticalRecovery =
    policyDecision?.allowed
      ? Number(expectedValue || 0)
      : 0;

  const record = {
    id: `shadow-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    timestamp: new Date().toISOString(),

    paymentId: payment.paymentId,
    merchantId: payment.merchantId,

    amount: payment.amount,
    status: payment.status,

    diagnosis: diagnosis?.category ?? null,

    proposedAction:
      recoveryDecision?.selectedAction ?? null,

    probability,

    expectedValue,

    policyAllowed:
      policyDecision?.allowed ?? false,

    blockReason:
      policyDecision?.blockReason ?? null,

    hypotheticalRecovery,

    mode: "SHADOW"
  };

  shadowDecisions.push(record);

  return record;
}

export function getShadowDecisions() {
  return [...shadowDecisions];
}

export function getShadowDecisionCount() {
  return shadowDecisions.length;
}