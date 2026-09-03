const auditEvents = [];

const MAX_AUDIT_EVENTS = 500;

let socketIoInstance = null;

export function setSocketIo(io) {
  socketIoInstance = io;
}

export function addAuditEvent({
  type,
  paymentId = null,
  action = null,
  details = {}
}) {
  const event = {
    id: `audit_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    timestamp: new Date().toISOString(),

    type,

    paymentId,

    action,

    details
  };

  auditEvents.push(event);

  if (auditEvents.length > MAX_AUDIT_EVENTS) {
    auditEvents.shift();
  }

  if (socketIoInstance) {
    socketIoInstance.emit("auditEvent", event);
  }

  return event;
}

export function getAuditEvents() {
  return [...auditEvents];
}

export function getAuditEventsForPayment(paymentId) {
  return auditEvents.filter(
    (event) =>
      event.paymentId === paymentId
  );
}

export function logExecutionAuditEvent(payment, recoveryDecision, policyDecision, executionResult) {
  const paymentId = payment?.paymentId || "unknown";
  const action = recoveryDecision?.selectedAction || "RETRY";
  const reason = executionResult?.reason || policyDecision?.blockReason || "Policy safety rule prevented execution";

  if (!executionResult?.executed || executionResult?.status === "BLOCKED") {
    const isIdempotency =
      reason.toLowerCase().includes("idempotency") ||
      reason.toLowerCase().includes("already been processed");

    const failedCheck = policyDecision?.checks?.find((c) => !c.passed);
    const rule = failedCheck?.rule || (isIdempotency ? "IDEMPOTENCY" : "SAFETY_GATE");

    if (isIdempotency || rule === "IDEMPOTENCY") {
      return addAuditEvent({
        type: "DUPLICATE_RECOVERY_BLOCKED",
        paymentId,
        action,
        details: {
          rule: "IDEMPOTENCY",
          reason: "Duplicate recovery attempt blocked by Idempotency engine",
          status: "BLOCKED",
          mode: executionResult?.mode || "TEST"
        }
      });
    }

    return addAuditEvent({
      type: "SAFETY_GUARDRAIL_BLOCKED",
      paymentId,
      action,
      details: {
        rule,
        reason,
        status: "BLOCKED",
        mode: executionResult?.mode || "TEST"
      }
    });
  }

  return addAuditEvent({
    type: "RECOVERY_EXECUTED",
    paymentId,
    action,
    details: {
      status: executionResult.status || "RETRY_EXECUTED",
      executed: true,
      mode: executionResult.mode || "TEST"
    }
  });
}