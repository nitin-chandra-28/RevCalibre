import {
  isShadowMode,
  isTestMode
} from "./modeManager.js";

import { logShadowDecision } from "./shadowLogger.js";

import { createRecoveryPaymentLink } from "../razorpay/paymentLinkService.js";

import {
  createRecoveryRecord
} from "../recovery/recoveryStore.js";

import { markProcessed } from "../policy/idempotencyStore.js";


export async function routeRecovery({
  payment,
  diagnosis,
  recoveryDecision,
  policyDecision
}) {

  // --------------------------------------------------
  // 1. POLICY ALWAYS HAS FINAL AUTHORITY
  // --------------------------------------------------

  if (!policyDecision?.allowed) {
    let shadowRecord = null;
    if (isShadowMode()) {
      shadowRecord = logShadowDecision({
        payment,
        diagnosis,
        recoveryDecision,
        policyDecision
      });
    }

    return {
      executed: false,
      mode: isShadowMode() ? "SHADOW" : "TEST",
      status: "BLOCKED",
      reason:
        policyDecision?.blockReason ||
        "Policy blocked action",
      shadowRecord
    };
  }


  // --------------------------------------------------
  // 2. SHADOW MODE
  // --------------------------------------------------

  if (isShadowMode()) {

    const shadowRecord = logShadowDecision({
      payment,
      diagnosis,
      recoveryDecision,
      policyDecision
    });

    return {
      executed: false,
      mode: "SHADOW",
      status: "SHADOW_PROPOSED",

      proposedAction:
        recoveryDecision.selectedAction,

      shadowRecord
    };
  }


  // --------------------------------------------------
  // 3. TEST MODE
  // --------------------------------------------------

  if (isTestMode()) {

    const action =
      recoveryDecision.selectedAction;


    // ------------------------------------------------
    // DO NOTHING
    // ------------------------------------------------

    if (action === "DO_NOTHING") {

      markProcessed(
        policyDecision.idempotencyKey
      );

      return {
        executed: true,
        mode: "TEST",
        status: "NO_ACTION",
        proposedAction: action,
        reason: "Recovery engine selected DO_NOTHING."
      };
    }


    // ------------------------------------------------
    // RETRY
    // ------------------------------------------------

    if (action === "RETRY") {

      markProcessed(
        policyDecision.idempotencyKey
      );

      return {
        executed: true,
        mode: "TEST",
        status: "RETRY_EXECUTED",
        proposedAction: action,
        reason: "TEST retry execution simulated."
      };
    }


    // ------------------------------------------------
    // RETRY AFTER DELAY
    // ------------------------------------------------

    if (action === "RETRY_AFTER_DELAY") {

      markProcessed(
        policyDecision.idempotencyKey
      );

      return {
        executed: true,
        mode: "TEST",
        status: "RETRY_AFTER_DELAY_EXECUTED",
        proposedAction: action,
        reason: "TEST delayed retry execution simulated."
      };
    }


    // ------------------------------------------------
    // PAYMENT LINK
    // ------------------------------------------------

    if (action === "PAYMENT_LINK") {

      try {

        // --------------------------------------------
        // Create Razorpay Test Mode Payment Link
        // --------------------------------------------

        const paymentLink =
          await createRecoveryPaymentLink({
            payment,
            recoveryDecision
          });


        // --------------------------------------------
        // Mark idempotency key only after
        // successful Razorpay execution
        // --------------------------------------------

        markProcessed(
          policyDecision.idempotencyKey
        );


        // --------------------------------------------
        // Store recovery so webhook can find it
        // --------------------------------------------

        const recovery =
          createRecoveryRecord({
            payment,
            recoveryDecision,
            policyDecision,
            paymentLink
          });


        return {
          executed: true,
          mode: "TEST",
          status: "PAYMENT_LINK_CREATED",
          proposedAction: action,
          paymentLink,
          recovery
        };


      } catch (error) {

        console.error(
          "Razorpay TEST execution failed:",
          error
        );

        return {
          executed: false,
          mode: "TEST",
          status: "EXECUTION_FAILED",
          proposedAction: action,
          reason: error.message
        };
      }
    }


    // ------------------------------------------------
    // UNKNOWN ACTION
    // ------------------------------------------------

    return {
      executed: false,
      mode: "TEST",
      status: "NOT_EXECUTED",
      proposedAction: action,
      reason: `Unsupported recovery action: ${action}`
    };
  }


  // --------------------------------------------------
  // 4. UNKNOWN MODE
  // --------------------------------------------------

  return {
    executed: false,
    status: "BLOCKED",
    reason: "Unknown execution mode"
  };
}