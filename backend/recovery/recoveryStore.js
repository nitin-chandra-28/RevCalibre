const recoveries = new Map();

export function createRecoveryRecord({
  payment,
  recoveryDecision,
  policyDecision,
  paymentLink
}) {
  const recoveryId = `rec_${payment.paymentId}`;

  const record = {
    recoveryId,

    paymentId: payment.paymentId,
    merchantId: payment.merchantId,
    customerId: payment.customerId,

    // Phase 8 experiment information
    experimentGroup:
      payment.experimentGroup || "AGENT",

    originalAmount: Number(payment.amount),

    action: recoveryDecision.selectedAction,

    probability:
      recoveryDecision.selectedProbability ??
      recoveryDecision.probabilitySuccess ??
      0,

    expectedValue:
      recoveryDecision.selectedExpectedValue ??
      0,

    policyAllowed: policyDecision.allowed,

    paymentLinkId: paymentLink.id,
    paymentLinkUrl: paymentLink.shortUrl,

    status: "PENDING",

    recoveredAmount: 0,

    razorpayPaymentId: null,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  recoveries.set(recoveryId, record);

  return record;
}

export function getRecovery(recoveryId) {
  return recoveries.get(recoveryId);
}

export function getRecoveryByPaymentId(paymentId) {
  for (const recovery of recoveries.values()) {
    if (recovery.paymentId === paymentId) {
      return recovery;
    }
  }

  return null;
}

export function getRecoveryByPaymentLinkId(paymentLinkId) {
  for (const recovery of recoveries.values()) {
    if (recovery.paymentLinkId === paymentLinkId) {
      return recovery;
    }
  }

  return null;
}

export function updateRecovery(recoveryId, updates) {
  const recovery = recoveries.get(recoveryId);

  if (!recovery) {
    return null;
  }

  Object.assign(recovery, {
    ...updates,
    updatedAt: new Date().toISOString()
  });

  return recovery;
}

export function getAllRecoveries() {
  return Array.from(recoveries.values());
}