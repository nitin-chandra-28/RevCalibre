import crypto from "crypto";

import {
  getRecoveryByPaymentLinkId,
  updateRecovery
} from "../recovery/recoveryStore.js";

const processedEvents = new Set();

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is not configured"
    );
  }

  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

export function handleRazorpayWebhook({
  rawBody,
  signature,
  eventId,
  payload
}) {
  // --------------------------------------------------
  // 1. EVENT ID
  // --------------------------------------------------

  if (!eventId) {
    throw new Error(
      "Missing Razorpay event ID"
    );
  }

  // --------------------------------------------------
  // 2. SIGNATURE
  // --------------------------------------------------

  const valid =
    verifyWebhookSignature(
      rawBody,
      signature
    );

  if (!valid) {
    throw new Error(
      "Invalid Razorpay webhook signature"
    );
  }

  // --------------------------------------------------
  // 3. IDEMPOTENCY
  // --------------------------------------------------

  if (processedEvents.has(eventId)) {
    return {
      processed: false,
      duplicate: true,
      eventId
    };
  }

  processedEvents.add(eventId);

  // --------------------------------------------------
  // 4. EVENT TYPE
  // --------------------------------------------------

  if (
    payload.event !==
    "payment_link.paid"
  ) {
    return {
      processed: true,
      duplicate: false,
      ignored: true,
      event: payload.event
    };
  }

  // --------------------------------------------------
  // 5. EXTRACT RAZORPAY ENTITIES
  // --------------------------------------------------

  const paymentLink =
    payload?.payload?.payment_link?.entity;

  const payment =
    payload?.payload?.payment?.entity;

  if (!paymentLink) {
    throw new Error(
      "Payment link entity missing"
    );
  }

  // --------------------------------------------------
  // 6. FIND OUR RECOVERY
  // --------------------------------------------------

  const recovery =
    getRecoveryByPaymentLinkId(
      paymentLink.id
    );

  if (!recovery) {
    return {
      processed: true,
      duplicate: false,
      ignored: true,
      reason: "RECOVERY_NOT_FOUND"
    };
  }

  // --------------------------------------------------
  // 7. RECOVERED AMOUNT
  // --------------------------------------------------

  const recoveredAmount =
    Number(
      paymentLink.amount_paid || 0
    ) / 100;

  // --------------------------------------------------
  // 8. UPDATE RECOVERY
  // --------------------------------------------------

  const updatedRecovery =
    updateRecovery(
      recovery.recoveryId,
      {
        status: "RECOVERED",

        recoveredAmount,

        razorpayPaymentId:
          payment?.id || null,

        webhookEventId:
          eventId,

        webhookEvent:
          payload.event,

        experimentOutcome:
          "RECOVERED"
      }
    );

  return {
    processed: true,
    duplicate: false,
    recovered: true,

    recoveryId:
      recovery.recoveryId,

    paymentId:
      recovery.paymentId,

    experimentGroup:
      recovery.experimentGroup,

    recoveredAmount,

    recovery:
      updatedRecovery
  };
}